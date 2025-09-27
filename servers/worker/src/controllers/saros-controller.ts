import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { eq, inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { init } from "@rhiva-ag/decoder/programs/saros/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { web3, type IdlAccounts, type IdlEvents } from "@coral-xyz/anchor";
import type { LiquidityBook } from "@rhiva-ag/decoder/programs/idls/types/saros";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  createSwap,
  getPairs,
  pairs,
  upsertMint,
  type Database,
  type swapInsertSchema,
  type pairInsertSchema,
} from "@rhiva-ag/datasource";

import { cacheResult, getMultiplePrices } from "../utils";

export const transformSarosPairAccount = ({
  binStep,
  staticFeeParameters,
  dynamicFeeParameters,
  tokenMintX,
  tokenMintY,
}: IdlAccounts<LiquidityBook>["pair"]): Omit<
  z.infer<typeof pairInsertSchema>,
  "id" | "name"
> => {
  const baseFee = (staticFeeParameters.baseFactor * binStep) / 1e6;
  const variableFee =
    staticFeeParameters.variableFeeControl > 0
      ? (Math.pow(dynamicFeeParameters.volatilityAccumulator * binStep, 2) *
          staticFeeParameters.variableFeeControl) /
        1e6
      : 0;

  const dynamicFee = Math.max(baseFee, variableFee);
  const protocolFee = dynamicFee * (staticFeeParameters.protocolShare / 1e4);

  return {
    baseFee,
    dynamicFee,
    protocolFee,
    extra: {},
    liquidity: 0,
    market: "saros",
    maxFee: baseFee,
    binStep: binStep,
    baseReserveAmount: 0,
    quoteReserveAmount: 0,
    baseReserveAmountUsd: 0,
    quoteReserveAmountUsd: 0,
    baseMint: tokenMintX.toBase58(),
    quoteMint: tokenMintY.toBase58(),
  };
};

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

  const nonExistingPairPubKeys = pairIds
    .map((pairId) => new web3.PublicKey(pairId))
    .filter(
      (pairId) =>
        !allPairs.some((pair) => new web3.PublicKey(pair.id).equals(pairId)),
    );

  if (nonExistingPairPubKeys.length > 0) {
    const pairAccounts = await program.account.pair.fetchMultiple(
      nonExistingPairPubKeys,
    );
    const pairAccountsWithPubKeys = pairAccounts
      .map((pairAccount, index) => {
        const pubkey = nonExistingPairPubKeys[index];
        if (pairAccount) return { pubkey, ...pairAccount };

        return null;
      })
      .filter((pairAccount) => !!pairAccount);

    const mints = await upsertMint(
      db,
      umi,
      ...pairAccountsWithPubKeys.flatMap((pair) => [
        pair.tokenMintX.toBase58(),
        pair.tokenMintY.toBase58(),
      ]),
    );

    const values: z.infer<typeof pairInsertSchema>[] =
      pairAccountsWithPubKeys.map((pairAccount) => {
        const pairMints = mints.filter(
          (mint) =>
            pairAccount.tokenMintX.equals(new web3.PublicKey(mint.id)) ||
            pairAccount.tokenMintY.equals(new web3.PublicKey(mint.id)),
        );

        return {
          id: pairAccount.pubkey.toBase58(),
          name: pairMints.map((mint) => mint.symbol).join("/"),
          ...transformSarosPairAccount(pairAccount),
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
    ...values.map(
      (
        value,
      ): Omit<
        z.infer<typeof swapInsertSchema>,
        "baseAmountUsd" | "quoteAmountUsd" | "feeUsd"
      > => {
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
        const baseAmount = value.swapForY ? value.amountIn : value.amountOut;
        const quoteAmount = value.swapForY ? value.amountOut : value.amountIn;
        const feeDecimals = value.swapForY
          ? pair.baseMint.decimals
          : pair.quoteMint.decimals;

        return {
          signature,
          extra: {},
          tvl: pair.liquidity,
          type: value.swapForY ? "sell" : "buy",
          pair: value.pair.toBase58(),
          fee: new Decimal(value.fee.toString())
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
