import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { eq, inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { init } from "@rhiva-ag/decoder/programs/orca/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { web3, type IdlAccounts, type IdlEvents } from "@coral-xyz/anchor";
import type { Whirlpool } from "@rhiva-ag/decoder/programs/idls/types/orca";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  createSwap,
  getPairs,
  pairs,
  upsertMint,
  rewardMints,
  type Database,
  type pairInsertSchema,
  type swapInsertSchema,
} from "@rhiva-ag/datasource";

import { cacheResult, getMultiplePrices } from "../utils";

export const transformOrcaPairAccount = (
  whirlpool: IdlAccounts<Whirlpool>["whirlpool"],
  oracle?: IdlAccounts<Whirlpool>["oracle"],
): Omit<z.infer<typeof pairInsertSchema>, "id" | "name"> & {
  rewardMints: string[];
} => {
  let dynamicFee = 0;
  const baseFee = whirlpool.feeRate / 1e6;
  const protocolFee = baseFee * (whirlpool.protocolFeeRate / 1e4);

  if (oracle) {
    const variableFee =
      oracle.adaptiveFeeConstants.adaptiveFeeControlFactor > 0
        ? (Math.pow(
            oracle.adaptiveFeeVariables.volatilityAccumulator *
              whirlpool.tickSpacing,
            2,
          ) *
            oracle.adaptiveFeeConstants.adaptiveFeeControlFactor) /
          1e6
        : 0;

    dynamicFee = Math.max(baseFee, variableFee);
  }

  return {
    extra: {},
    baseFee,
    protocolFee,
    maxFee: 10,
    liquidity: 0,
    dynamicFee,
    baseReserveAmount: 0,
    quoteReserveAmount: 0,
    baseReserveAmountUsd: 0,
    quoteReserveAmountUsd: 0,
    market: "orca" as const,
    binStep: whirlpool.tickSpacing,
    baseMint: whirlpool.tokenMintA.toBase58(),
    quoteMint: whirlpool.tokenMintB.toBase58(),
    rewardMints: whirlpool.rewardInfos
      .filter(
        (rewardInfo) => !rewardInfo.mint.equals(web3.SystemProgram.programId),
      )
      .map((rewardInfo) => rewardInfo.mint.toBase58()),
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
        if (whirlpool) {
          const feeTierIndex = whirlpool?.feeTierIndexSeed[0];
          whirlpool?.feeTierIndexSeed[1] * 256;
          if (whirlpool.tickSpacing === feeTierIndex)
            return { pubkey, oracle: null, ...whirlpool };
          const [pda] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("oracle"), pubkey.encode()],
            program.programId,
          );
          return { pubkey, oracle: pda, ...whirlpool };
        }
        return null;
      })
      .filter((whirlpool) => !!whirlpool);

    const whirlPoolsWithOraclePubkeys = whirlpoolsWithPubkeys.filter(
      (whirlpool) => !!whirlpool.oracle,
    );
    let oracles: (IdlAccounts<Whirlpool>["oracle"] | null)[] = [];
    if (whirlPoolsWithOraclePubkeys.length > 0)
      oracles = await program.account.oracle.fetchMultiple(
        whirlPoolsWithOraclePubkeys.map((whirlpool) => whirlpool.oracle),
      );

    const oraclesWithWhirlpool = oracles
      .map((oracle, index) => {
        const whirlpool = whirlPoolsWithOraclePubkeys[index];
        if (oracle) return { ...oracle, pubkey: whirlpool.oracle };

        return null;
      })
      .filter((oracle) => !!oracle);

    const mints = await upsertMint(
      db,
      umi,
      ...whirlpoolsWithPubkeys.flatMap((whirlpool) => [
        whirlpool.tokenMintA.toBase58(),
        whirlpool.tokenMintB.toBase58(),
        ...whirlpool.rewardInfos
          .filter(
            (rewardInfo) =>
              !rewardInfo.mint.equals(web3.SystemProgram.programId),
          )
          .map((reward) => reward.mint.toBase58()),
      ]),
    );

    const values: (z.infer<typeof pairInsertSchema> & {
      rewardMints: string[];
    })[] = whirlpoolsWithPubkeys.map((whirlpool) => {
      const poolMints = mints.filter(
        (mint) =>
          whirlpool.tokenMintA.equals(new web3.PublicKey(mint.id)) ||
          whirlpool.tokenMintB.equals(new web3.PublicKey(mint.id)),
      );

      const oracle = oraclesWithWhirlpool.find((oracle) =>
        whirlpool.oracle ? oracle.whirlpool.equals(whirlpool.oracle) : false,
      );

      return {
        id: whirlpool.pubkey.toBase58(),
        name: poolMints.map((mint) => mint.symbol).join("/"),
        ...transformOrcaPairAccount(whirlpool, oracle),
      };
    });

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

      const baseReserveAmount = new Decimal(baseTokenReserveAmount)
        .div(Math.pow(10, pair.baseMint.decimals))
        .toNumber();

      const quoteReserveAmount = new Decimal(quoteTokenReserveAmount)
        .div(Math.pow(10, pair.quoteMint.decimals))
        .toNumber();

      let baseReserveAmountUsd = 0,
        quoteReserveAmountUsd = 0;

      if (basePrice) {
        baseReserveAmountUsd = baseReserveAmount * basePrice.price;
      }
      if (quotePrice) {
        quoteReserveAmountUsd = quoteReserveAmount * quotePrice.price;
      }

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
    ...swapEvents.map(
      (
        swapEvent,
      ): Omit<
        z.infer<typeof swapInsertSchema>,
        "baseAmountUsd" | "quoteAmountUsd" | "feeUsd"
      > => {
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

        const baseAmount = swapEvent.aToB
          ? swapEvent.inputAmount
          : swapEvent.outputAmount;
        const quoteAmount = swapEvent.aToB
          ? swapEvent.outputAmount
          : swapEvent.inputAmount;

        const feeDecimals = swapEvent.aToB
          ? pair.baseMint.decimals
          : pair.quoteMint.decimals;

        return {
          signature,
          extra: {},
          tvl: pair.liquidity,
          type: swapEvent.aToB ? "sell" : "buy",
          pair: swapEvent.whirlpool.toBase58(),
          fee: new Decimal(swapEvent.lpFee.toString())
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
