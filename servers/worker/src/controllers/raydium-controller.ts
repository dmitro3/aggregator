import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { eq, inArray } from "drizzle-orm";
import { AccountLayout } from "@solana/spl-token";
import type { Umi } from "@metaplex-foundation/umi";
import { init } from "@rhiva-ag/decoder/programs/raydium/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { web3, type IdlAccounts, type IdlEvents } from "@coral-xyz/anchor";
import type { AmmV3 } from "@rhiva-ag/decoder/programs/idls/types/raydium";
import {
  createSwap,
  getPairs,
  pairs,
  rewardMints,
  upsertMint,
  type Database,
  type pairInsertSchema,
  type swapInsertSchema,
} from "@rhiva-ag/datasource";

import { cacheResult, getMultiplePrices } from "../utils";

export const transformRaydiumPairAccount = (
  poolState: IdlAccounts<AmmV3>["poolState"],
  ammConfig: IdlAccounts<AmmV3>["ammConfig"],
): Omit<z.infer<typeof pairInsertSchema>, "id" | "name"> & {
  rewardMints: string[];
} => {
  const baseFee = (ammConfig.tradeFeeRate * ammConfig.tickSpacing) / 1e4;
  const protocolFee = baseFee * (ammConfig.protocolFeeRate / 1e6);

  return {
    extra: {
      tokenVault0: poolState.tokenVault0.toBase58(),
      tokenVault1: poolState.tokenVault1.toBase58(),
    },
    baseFee,
    protocolFee,
    maxFee: baseFee,
    liquidity: 0,
    dynamicFee: 0,
    baseReserveAmount: 0,
    quoteReserveAmount: 0,
    baseReserveAmountUsd: 0,
    quoteReserveAmountUsd: 0,
    market: "raydium" as const,
    binStep: poolState.tickSpacing,
    baseMint: poolState.tokenMint0.toBase58(),
    quoteMint: poolState.tokenMint1.toBase58(),
    rewardMints: poolState.rewardInfos
      .filter(
        (rewardInfo) =>
          !rewardInfo.tokenMint.equals(web3.SystemProgram.programId),
      )
      .map((rewardInfo) => rewardInfo.tokenMint.toBase58()),
  };
};

const upsertRaydiumPair = async (
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
    const poolStates = await program.account.poolState.fetchMultiple(
      nonExistingPairPubKeys,
    );
    const poolStatesWithPubkeys = poolStates
      .map((poolState, index) => {
        const pubkey = nonExistingPairPubKeys[index];
        if (poolState)
          return {
            pubkey,
            ...poolState,
          };

        return null;
      })
      .filter((poolState) => !!poolState);

    const ammConfigPubkeys = poolStatesWithPubkeys.map(
      (poolState) => poolState.ammConfig,
    );

    const ammConfigs =
      await program.account.ammConfig.fetchMultiple(ammConfigPubkeys);

    const mints = await upsertMint(
      db,
      umi,
      ...poolStates
        .filter((pool) => !!pool)
        .flatMap((pool) => [
          pool.tokenMint0.toBase58(),
          pool.tokenMint1.toBase58(),
          ...pool.rewardInfos
            .filter(
              (rewardInfo) =>
                !rewardInfo.tokenMint.equals(web3.SystemProgram.programId),
            )
            .map((reward) => reward.tokenMint.toBase58()),
        ]),
    );

    const values: (z.infer<typeof pairInsertSchema> & {
      rewardMints: string[];
    })[] = poolStatesWithPubkeys
      .map((poolState, index) => {
        const ammConfig = ammConfigs[index];
        const poolMints = mints.filter(
          (mint) =>
            poolState.tokenMint0.equals(new web3.PublicKey(mint.id)) ||
            poolState.tokenMint1.equals(new web3.PublicKey(mint.id)),
        );

        if (poolState && ammConfig)
          return {
            id: poolState.pubkey.toBase58(),
            name: poolMints.map((mint) => mint.symbol).join("/"),
            ...transformRaydiumPairAccount(poolState, ammConfig),
          };

        return null;
      })
      .filter((pair) => !!pair);

    const createdPairs = await db
      .insert(pairs)
      .values(values)
      .returning({ id: pairs.id })
      .onConflictDoUpdate({
        target: [pairs.id],
        set: { dynamicFee: pairs.dynamicFee, protocolFee: pairs.protocolFee },
      })
      .execute();

    const rewards = values
      .filter((value) => value.rewardMints.length > 0)
      .flatMap((value) =>
        value.rewardMints.map((mint) => ({ mint, pair: value.id })),
      );

    if (rewards.length > 0)
      await db
        .insert(rewardMints)
        .values(rewards)
        .onConflictDoNothing({ target: [rewardMints.pair, rewardMints.mint] })
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
      const mints = [pair.baseMint, pair.quoteMint];

      const [baseMint, quoteMint] = mints.map(
        (mint) => new web3.PublicKey(mint.id),
      );

      const poolMintVaultAccounttInfos =
        await connection.getMultipleAccountsInfo([
          new web3.PublicKey(pair.extra.tokenVault0 as string),
          new web3.PublicKey(pair.extra.tokenVault1 as string),
        ]);

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

      const baseReserveAmount = new Decimal(baseTokenReserveAmount)
        .div(Math.pow(10, pair.baseMint.decimals))
        .toNumber();

      const quoteReserveAmount = new Decimal(quoteTokenReserveAmount)
        .div(Math.pow(10, pair.quoteMint.decimals))
        .toNumber();

      let baseReserveAmountUsd = 0,
        quoteReserveAmountUsd = 0;

      if (basePrice) baseReserveAmountUsd = baseReserveAmount * basePrice.price;

      if (quotePrice)
        quoteReserveAmountUsd = quoteReserveAmount * quotePrice.price;

      return {
        ...pair,
        baseReserveAmount,
        quoteReserveAmount,
        baseReserveAmountUsd,
        quoteReserveAmountUsd,
        liquidity: baseReserveAmountUsd + quoteReserveAmountUsd,
      };
    }),
  );

  await db.transaction(async (db) =>
    allPairs.map((pair) =>
      db
        .update(pairs)
        .set({
          liquidity: pair.liquidity,
          baseReserveAmount: pair.baseReserveAmount,
          quoteReserveAmount: pair.quoteReserveAmount,
          baseReserveAmountUsd: pair.baseReserveAmountUsd,
          quoteReserveAmountUsd: pair.quoteReserveAmountUsd,
        })
        .where(eq(pairs.id, pair.id))
        .execute(),
    ),
  );

  return allPairs;
};

export const createRaydiumV3SwapFn = async (
  db: Database,
  connection: web3.Connection,
  signature: string,
  ...swapEvents: IdlEvents<AmmV3>["swapEvent"][]
) => {
  assert(swapEvents.length > 0, "expect swapEvents > 0");

  const umi = createUmi(connection.rpcEndpoint);

  const pairIds = swapEvents.map((swapEvent) => swapEvent.poolState.toBase58());

  const pairs = await cacheResult(
    async (pairIds) =>
      upsertRaydiumPair(db, connection, umi, getMultiplePrices, ...pairIds),
    ...pairIds,
  );

  return createSwap(
    db,
    pairs,
    getMultiplePrices,
    ...swapEvents.map(
      (
        swapEvent,
      ): Omit<
        z.infer<typeof swapInsertSchema>,
        "baseAmountUsd" | "quoteAmountUsd" | "feeUsd"
      > => {
        const pair = pairs.find((pair) =>
          swapEvent.poolState.equals(new web3.PublicKey(pair.id)),
        );
        assert(
          pair,
          format(
            "pair %s not created for swap %s",
            swapEvent.poolState.toBase58(),
            signature,
          ),
        );

        const baseAmount = swapEvent.zeroForOne
          ? swapEvent.amount1
          : swapEvent.amount0;
        const quoteAmount = swapEvent.zeroForOne
          ? swapEvent.amount0
          : swapEvent.amount1;
        const feeDecimals = swapEvent.zeroForOne
          ? pair.baseMint.decimals
          : pair.quoteMint.decimals;

        return {
          signature,
          extra: {},
          tvl: pair.liquidity,
          pair: swapEvent.poolState.toBase58(),
          type: swapEvent.zeroForOne ? "sell" : "buy",
          fee: new Decimal(swapEvent.transferFee0.toString())
            .div(Math.pow(10, feeDecimals))
            .toNumber(),
          baseAmount: new Decimal(baseAmount.toString())
            .div(Math.pow(10, pair.baseMint.decimals))
            .toNumber(),
          quoteAmount: new Decimal(quoteAmount.toString())
            .div(Math.pow(10, pair.quoteMint.decimals))
            .toNumber(),
        };
      },
    ),
  );
};
