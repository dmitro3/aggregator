import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { web3, type IdlEvents } from "@coral-xyz/anchor";
import { init } from "@rhiva-ag/decoder/programs/saros/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import type { LiquidityBook } from "@rhiva-ag/decoder/programs/idls/types/saros";
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

const upsertPair = async (
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

  console.log(pairIds);

  const nonExistingPairPubKeys = pairIds
    .map((pairId) => new web3.PublicKey(pairId))
    .filter(
      (pairId) =>
        !allPairs.some((pair) => new web3.PublicKey(pair.id).equals(pairId)),
    );

  if (nonExistingPairPubKeys.length > 0) {
    const values: z.infer<typeof pairInsertSchema>[] = await Promise.all(
      nonExistingPairPubKeys.map(async (pairPubKey) => {
        const pair = await program.account.pair.fetch(pairPubKey);

        const baseFee =
          BigInt(pair.binStep) *
          BigInt(pair.staticFeeParameters.baseFactor) *
          BigInt(10);

        await upsertMint(
          db,
          umi,
          pair.tokenMintX.toBase58(),
          pair.tokenMintY.toBase58(),
        );

        return {
          id: pairPubKey.toBase58(),
          baseMint: pair.tokenMintX.toBase58(),
          quoteMint: pair.tokenMintY.toBase58(),
          extra: {
            binStep: pair.binStep,
            maxFee: 0,
            dynamicFee: 0,
            marketCap: 0,
            baseFee: Number(baseFee),
            protocolFee: pair.staticFeeParameters.protocolShare,
          },
          market: "saros",
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

      const poolMintVaultAccounttInfos =
        await connection.getMultipleAccountsInfo(poolMintVaults);

      let baseTokenReserveAmount = BigInt(0);
      let quoteTokenReserveAmount = BigInt(0);

      for (const poolMintVault of poolMintVaultAccounttInfos) {
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

      let marketCap = 0;

      if (basePrice) {
        marketCap +=
          normalizeBaseTokenReserveAmount.toNumber() * basePrice.price;
      }
      if (quotePrice) {
        marketCap +=
          normalizeQuoteTokenReserveAmount.toNumber() * quotePrice.price;
      }

      return { ...pair, extra: { ...pair.extra, marketCap } };
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

export const createSarosSwapFn = async (
  db: Database,
  connection: web3.Connection,
  signature: string,
  ...values: IdlEvents<LiquidityBook>["binSwapEvent"][]
) => {
  assert(values.length > 0, "expect values > 0");

  const umi = createUmi(connection.rpcEndpoint);
  const pairIds = values.map((value) => value.pair.toBase58());
  const pairs = await cacheResult(
    async (pairIds) =>
      upsertPair(db, connection, umi, getMultiplePrices, ...pairIds),
    ...pairIds,
  );

  return createSwap(
    db,
    pairs,
    getMultiplePrices,
    ...values.map((value) => {
      const pair = pairs.find((pair) =>
        value.pair.equals(new web3.PublicKey(pair.id)),
      );
      assert(
        pair,
        format(
          "pair %s not created for swap %s",
          value.pair.toBase58(),
          signature,
        ),
      );
      const baseAmount = value.swapForY ? value.amountOut : value.amountIn;
      const quoteAmount = value.swapForY ? value.amountIn : value.amountOut;

      return {
        signature,
        extra: {},
        tvl: pair.extra.marketCap,
        type: value.swapForY ? ("sell" as const) : ("buy" as const),
        pair: value.pair.toBase58(),
        fee: new Decimal(value.fee.toString())
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
