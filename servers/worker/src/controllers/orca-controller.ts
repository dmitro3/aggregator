import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { web3, type IdlAccounts, type IdlEvents } from "@coral-xyz/anchor";
import { init } from "@rhiva-ag/decoder/programs/orca/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import type { Whirlpool } from "@rhiva-ag/decoder/programs/idls/types/orca";
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

export const transformOrcaPairAccount = (
  whirlpool: IdlAccounts<Whirlpool>["whirlpool"],
) => {
  const baseFee = whirlpool.feeRate / 1e6;
  const protocolFee = baseFee * (whirlpool.protocolFeeRate / 1e6);
  return {
    extra: {},
    baseFee,
    protocolFee,
    maxFee: baseFee,
    liquidity: 0,
    dynamicFee: 0,
    market: "orca" as const,
    binStep: whirlpool.tickSpacing,
    baseMint: whirlpool.tokenMintA.toBase58(),
    quoteMint: whirlpool.tokenMintB.toBase58(),
  };
};

const upsertOrcaPair = async (
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
    const whirlpools = await program.account.whirlpool.fetchMultiple(
      nonExistingPairPubKeys,
    );
    const whirlpoolsWithPubkeys = whirlpools
      .map((whirlpool, index) => {
        const pubkey = nonExistingPairPubKeys[index];
        if (whirlpool)
          return {
            pubkey,
            ...whirlpool,
          };

        return null;
      })
      .filter((whirlpool) => !!whirlpool);

    const whirlpoolsConfigPubkeys = whirlpoolsWithPubkeys.map(
      (whirlpool) => whirlpool.whirlpoolsConfig,
    );

    const _whirlpoolsConfig =
      await program.account.whirlpoolsConfig.fetchMultiple(
        whirlpoolsConfigPubkeys,
      );

    const mints = await upsertMint(
      db,
      umi,
      ...whirlpools
        .filter((whirlpool) => !!whirlpool)
        .flatMap((whirlpool) => [
          whirlpool.tokenMintA.toBase58(),
          whirlpool.tokenMintB.toBase58(),
        ]),
    );

    const values: z.infer<typeof pairInsertSchema>[] = whirlpoolsWithPubkeys
      .map((whirlpool) => {
        const poolMints = mints.filter(
          (mint) =>
            whirlpool.tokenMintA.equals(new web3.PublicKey(mint.id)) ||
            whirlpool.tokenMintB.equals(new web3.PublicKey(mint.id)),
        );

        if (whirlpool)
          return {
            id: whirlpool.pubkey.toBase58(),
            name: poolMints.map((mint) => mint.symbol).join("/"),
            ...transformOrcaPairAccount(whirlpool),
          };

        return null;
      })
      .filter((pair) => !!pair);

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

      const whirlpoolMintVaults = await Promise.all(
        mints.map((mint) =>
          getAssociatedTokenAddressSync(
            new web3.PublicKey(mint.id),
            pairPubKey,
            true,
            new web3.PublicKey(mint.tokenProgram),
          ),
        ),
      );

      const whirlpoolMintVaultAccountInfos =
        await connection.getMultipleAccountsInfo(whirlpoolMintVaults);

      let baseTokenReserveAmount = BigInt(0);
      let quoteTokenReserveAmount = BigInt(0);

      for (const whirlpoolMintVault of whirlpoolMintVaultAccountInfos) {
        if (whirlpoolMintVault) {
          const account = AccountLayout.decode(whirlpoolMintVault.data);
          if (account.mint.equals(baseMint))
            baseTokenReserveAmount += account.amount;
          if (account.mint.equals(quoteMint))
            quoteTokenReserveAmount += account.amount;
        }
      }

      const token0Price = prices[pair.baseMint.id];
      const token1Price = prices[pair.quoteMint.id];

      const normalizedToken0Amount = new Decimal(
        baseTokenReserveAmount.toString(),
      ).div(10 ** pair.baseMint.decimals);

      const normalizedToken1Amount = new Decimal(
        quoteTokenReserveAmount.toString(),
      ).div(10 ** pair.quoteMint.decimals);

      let liquidity = 0;

      if (token0Price) {
        liquidity += normalizedToken0Amount.toNumber() * token0Price.price;
      }
      if (token1Price) {
        liquidity += normalizedToken1Amount.toNumber() * token1Price.price;
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

export const createOrcaSwapFn = async (
  db: Database,
  connection: web3.Connection,
  signature: string,
  ...swapEvents: IdlEvents<Whirlpool>["traded"][]
) => {
  assert(swapEvents.length > 0, "expect swapEvents > 0");

  const umi = createUmi(connection.rpcEndpoint);

  const pairIds = swapEvents.map((swapEvent) => swapEvent.whirlpool.toBase58());

  const pairs = await cacheResult(
    async (pairIds) =>
      upsertOrcaPair(db, connection, umi, getMultiplePrices, ...pairIds),
    ...pairIds,
  );

  return createSwap(
    db,
    pairs,
    getMultiplePrices,
    ...swapEvents.map((swapEvent) => {
      const pair = pairs.find((pair) =>
        swapEvent.whirlpool.equals(new web3.PublicKey(pair.id)),
      );
      assert(
        pair,
        format(
          "pair %s not created for swap %s",
          swapEvent.whirlpool.toBase58(),
          signature,
        ),
      );

      // In Orca Whirlpools, aToB indicates swap direction:
      // true: A -> B (selling token A for token B)
      // false: B -> A (selling token B for token A)
      const isAToB = swapEvent.aToB;

      const baseAmount = isAToB
        ? swapEvent.inputAmount
        : swapEvent.outputAmount;
      const quoteAmount = isAToB
        ? swapEvent.outputAmount
        : swapEvent.inputAmount;

      return {
        signature,
        extra: {},
        tvl: pair.liquidity,
        type: isAToB ? ("sell" as const) : ("buy" as const),
        pair: swapEvent.whirlpool.toBase58(),
        fee: new Decimal(swapEvent.lpFee.toString())
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
