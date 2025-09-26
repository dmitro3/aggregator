import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { web3, type IdlEvents } from "@coral-xyz/anchor";
import { init } from "@rhiva-ag/decoder/programs/meteora/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
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
    const values: z.infer<typeof pairInsertSchema>[] = await Promise.all(
      nonExistingPairPubKeys.map(async (pairPubKey) => {
        const lbPair = await program.account.lbPair.fetch(pairPubKey);

        const baseFeeRate =
          BigInt(lbPair.parameters.baseFactor) *
          BigInt(lbPair.binStep) *
          BigInt(10 ** lbPair.parameters.baseFeePowerFactor);

        const protocolFeeRate =
          BigInt(lbPair.parameters.protocolShare / 10000) * baseFeeRate;

        const volatilityFee = calculateVolatilityFee(lbPair);
        const _totalFeeRate = Number(baseFeeRate) + volatilityFee;

        const mints = await upsertMint(
          db,
          umi,
          lbPair.tokenXMint.toBase58(),
          lbPair.tokenYMint.toBase58(),
        );

        return {
          extra: {},
          maxFee: Number(baseFeeRate) * 10000,
          liquidity: 0,
          dynamicFee: Number(volatilityFee) * 10000,
          market: "meteora",
          binStep: lbPair.binStep,
          baseFee: Number(baseFeeRate) * 10000,
          id: pairPubKey.toBase58(),
          name: mints.map((mint) => mint.name).join("-"),
          baseMint: lbPair.tokenXMint.toBase58(),
          quoteMint: lbPair.tokenYMint.toBase58(),
          protocolFee: Number(protocolFeeRate) * 10000,
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

// Calculate Meteora's dynamic volatility fee
function calculateVolatilityFee(lbPair: any): number {
  const { volatilityAccumulator, _volatilityReference } = lbPair.vParameters;

  const { variableFeeControl, maxVolatilityAccumulator } = lbPair.parameters;

  // Meteora's volatile fee calculation
  // volatile_fee = (volatility_accumulator^2 * variable_fee_control) / (MAX_VOLATILITY_ACCUMULATOR^2)
  const volatilityFactor = Math.min(
    volatilityAccumulator,
    maxVolatilityAccumulator,
  );
  const volatilityRatio = volatilityFactor / maxVolatilityAccumulator;
  const volatileFee =
    (volatilityRatio * volatilityRatio * variableFeeControl) /
    maxVolatilityAccumulator ** 2;

  return volatileFee;
}

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
