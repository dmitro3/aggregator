import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { init } from "@rhiva-ag/decoder/programs/meteora/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { web3, type IdlAccounts, type IdlEvents } from "@coral-xyz/anchor";
import type { LbClmm } from "@rhiva-ag/decoder/programs/idls/types/meteora";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  createSwap,
  getPairs,
  pairs,
  updateJSON,
  upsertMint,
  type Database,
  type pairInsertSchema,
} from "@rhiva-ag/datasource";

import { cacheResult, getMultiplePrices } from "../utils";

export const transformMeteoraPairAccount = ({
  binStep,
  parameters,
  vParameters,
  tokenXMint,
  tokenYMint,
}: IdlAccounts<LbClmm>["lbPair"]): Omit<
  z.infer<typeof pairInsertSchema>,
  "id" | "name"
> => {
  const baseFee = (parameters.baseFactor * binStep) / 1e6;
  const variableFee =
    parameters.variableFeeControl > 0
      ? (Math.pow(vParameters.volatilityAccumulator * binStep, 2) *
          parameters.variableFeeControl) /
        1e11
      : 0;

  const dynamicFee = Math.max(baseFee, variableFee);
  const protocolFee = dynamicFee * (parameters.protocolShare / 1e4);

  return {
    baseFee,
    dynamicFee,
    protocolFee,
    extra: {},
    liquidity: 0,
    maxFee: 10,
    market: "meteora",
    binStep: binStep,
    baseMint: tokenXMint.toBase58(),
    quoteMint: tokenYMint.toBase58(),
  };
};

const upsertMeteoraPair = async (
  db: Database,
  connection: web3.Connection,
  umi: Umi,
  getMultiplePrices: (
    mints: string[],
  ) => Promise<Record<string, { price: number }>>,
  ...pairIds: string[]
) => {
  const [program] = init(connection);

  let allPairs = await getPairs(db, inArray(pairs.id, pairIds));

  const nonExistingPairPubKeys = pairIds
    .map((pairId) => new web3.PublicKey(pairId))
    .filter(
      (pairId) =>
        !allPairs.some((pair) => new web3.PublicKey(pair.id).equals(pairId)),
    );

  if (nonExistingPairPubKeys.length > 0) {
    const lbPairs = await program.account.lbPair.fetchMultiple(
      nonExistingPairPubKeys,
    );
    const lbPairsWithPubkeys = lbPairs
      .map((lbPair, index) => {
        const pubkey = nonExistingPairPubKeys[index];
        if (lbPair) return { pubkey, ...lbPair };
        return null;
      })
      .filter((lbPair) => !!lbPair);

    const mints = await upsertMint(
      db,
      umi,
      ...lbPairsWithPubkeys.flatMap((lbPair) => [
        lbPair.tokenXMint.toBase58(),
        lbPair.tokenYMint.toBase58(),
      ]),
    );

    const values: z.infer<typeof pairInsertSchema>[] = await Promise.all(
      lbPairsWithPubkeys.map(async (lbPair) => {
        const poolMints = mints.filter(
          (mint) =>
            lbPair.tokenXMint.equals(new web3.PublicKey(mint.id)) ||
            lbPair.tokenYMint.equals(new web3.PublicKey(mint.id)),
        );

        return {
          id: lbPair.pubkey.toBase58(),
          name: poolMints.map((mint) => mint.symbol).join("/"),
          ...transformMeteoraPairAccount(lbPair),
        };
      }),
    );

    const createdPairs = await db
      .insert(pairs)
      .values(values)
      .returning({ id: pairs.id })
      .execute();

    allPairs.push(
      ...(await getPairs(
        db,
        inArray(
          pairs.id,
          createdPairs.map((pair) => pair.id),
        ),
      )),
    );
  }

  const prices = await getMultiplePrices(
    allPairs.flatMap((pair) => [pair.baseMint.id, pair.quoteMint.id]),
  );

  allPairs = await Promise.all(
    allPairs.map(async (pair) => {
      const pairPubKey = new web3.PublicKey(pair.id);
      const mints = [pair.baseMint, pair.quoteMint];

      const [baseMint, quoteMint] = mints.map(
        (mint) => new web3.PublicKey(mint.id),
      );

      const poolMintVaults = await Promise.all(
        mints.map((mint) =>
          getAssociatedTokenAddressSync(
            new web3.PublicKey(mint.id),
            pairPubKey,
            true,
            new web3.PublicKey(mint.tokenProgram),
          ),
        ),
      );

      const poolMintVaultAccountInfos =
        await connection.getMultipleAccountsInfo(poolMintVaults);

      let baseTokenReserveAmount = BigInt(0);
      let quoteTokenReserveAmount = BigInt(0);

      for (const poolMintVault of poolMintVaultAccountInfos) {
        if (poolMintVault) {
          const account = AccountLayout.decode(poolMintVault.data);
          if (account.mint.equals(baseMint))
            baseTokenReserveAmount += account.amount;
          if (account.mint.equals(quoteMint))
            quoteTokenReserveAmount += account.amount;
        }
      }

      const basePrice = prices[pair.baseMint.id];
      const quotePrice = prices[pair.quoteMint.id];

      const normalizeBaseTokenReserveAmount = new Decimal(
        baseTokenReserveAmount,
      ).div(10 ** pair.baseMint.decimals);

      const normalizeQuoteTokenReserveAmount = new Decimal(
        quoteTokenReserveAmount,
      ).div(10 ** pair.quoteMint.decimals);

      let liquidity = 0;

      if (basePrice) {
        liquidity +=
          normalizeBaseTokenReserveAmount.toNumber() * basePrice.price;
      }
      if (quotePrice) {
        liquidity +=
          normalizeQuoteTokenReserveAmount.toNumber() * quotePrice.price;
      }

      return { ...pair, liquidity };
    }),
  );

  await db.transaction(async (db) =>
    allPairs.map((pair) =>
      db
        .update(pairs)
        .set({
          extra: updateJSON(pairs.extra, {
            marketCap: pair.extra.marketCap,
          }),
        })
        .execute(),
    ),
  );

  return allPairs;
};

export const createMeteoraSwapFn = async (
  db: Database,
  connection: web3.Connection,
  signature: string,
  ...swapEvents: IdlEvents<LbClmm>["swap"][]
) => {
  assert(swapEvents.length > 0, "expect swapEvents > 0");

  const umi = createUmi(connection.rpcEndpoint);

  const pairIds = swapEvents.map((swapEvent) => swapEvent.lbPair.toBase58());

  const pairs = await cacheResult(
    async (pairIds) =>
      upsertMeteoraPair(db, connection, umi, getMultiplePrices, ...pairIds),
    ...pairIds,
  );

  return createSwap(
    db,
    pairs,
    getMultiplePrices,
    ...swapEvents.map((swapEvent) => {
      const pair = pairs.find((pair) =>
        swapEvent.lbPair.equals(new web3.PublicKey(pair.id)),
      );
      assert(
        pair,
        format(
          "pair %s not created for swap %s",
          swapEvent.lbPair.toBase58(),
          signature,
        ),
      );

      const isSwapForY = swapEvent.swapForY;

      const baseAmount = isSwapForY ? swapEvent.amountIn : swapEvent.amountOut;
      const quoteAmount = isSwapForY ? swapEvent.amountOut : swapEvent.amountIn;

      return {
        signature,
        extra: {},
        tvl: pair.liquidity,
        type: isSwapForY ? ("sell" as const) : ("buy" as const),
        pair: swapEvent.lbPair.toBase58(),
        fee: new Decimal(swapEvent.fee.toString())
          .div(10 ** pair.baseMint.decimals)
          .toNumber(),
        baseAmount: new Decimal(baseAmount.toString())
          .div(10 ** pair.baseMint.decimals)
          .toNumber(),
        quoteAmount: new Decimal(quoteAmount.toString())
          .div(10 ** pair.quoteMint.decimals)
          .toNumber(),
      };
    }),
  );
};
