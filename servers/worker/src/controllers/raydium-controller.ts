import assert from "assert";
import { format } from "util";
import type z from "zod/mini";
import Decimal from "decimal.js";
import { inArray } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { web3, type IdlEvents } from "@coral-xyz/anchor";
import { init } from "@rhiva-ag/decoder/programs/raydium/index";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import type { AmmV3 } from "@rhiva-ag/decoder/programs/idls/types/raydium";
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
    const values: z.infer<typeof pairInsertSchema>[] = await Promise.all(
      nonExistingPairPubKeys.map(async (pairPubKey) => {
        // Fetch Pool State
        const poolState = await program.account.poolState.fetch(pairPubKey);
        const ammConfig = await program.account.ammConfig.fetch(
          poolState.ammConfig,
        );
        const tradeFeeRate = ammConfig.tradeFeeRate / 10000;
        const protocolFeeRate =
          (ammConfig.protocolFeeRate / 10000) * tradeFeeRate;

        const mints = await upsertMint(
          db,
          umi,
          poolState.tokenMint0.toBase58(),
          poolState.tokenMint1.toBase58(),
        );

        return {
          extra: {},
          maxFee: tradeFeeRate * 10000,
          liquidity: 0,
          dynamicFee: 0,
          market: "raydium",
          binStep: poolState.tickSpacing,
          baseFee: tradeFeeRate * 10000,
          id: pairPubKey.toBase58(),
          name: mints.map((mint) => mint.name).join("-"),
          baseMint: poolState.tokenMint0.toBase58(),
          quoteMint: poolState.tokenMint1.toBase58(),
          protocolFee: protocolFeeRate * 10000,
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
      const vault0 = new web3.PublicKey(pair.extra.vault0);
      const vault1 = new web3.PublicKey(pair.extra.vault1);

      const vaultAccountInfos = await connection.getMultipleAccountsInfo([
        vault0,
        vault1,
      ]);

      let token0ReserveAmount = BigInt(0);
      let token1ReserveAmount = BigInt(0);

      if (vaultAccountInfos[0]) {
        const account = AccountLayout.decode(vaultAccountInfos[0].data);
        token0ReserveAmount = account.amount;
      }

      if (vaultAccountInfos[1]) {
        const account = AccountLayout.decode(vaultAccountInfos[1].data);
        token1ReserveAmount = account.amount;
      }

      const token0Price = prices[pair.baseMint.id];
      const token1Price = prices[pair.quoteMint.id];

      const normalizedToken0Amount = new Decimal(
        token0ReserveAmount.toString(),
      ).div(10 ** pair.baseMint.decimals);

      const normalizedToken1Amount = new Decimal(
        token1ReserveAmount.toString(),
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
    ...swapEvents.map((swapEvent) => {
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

      const isSellToken0 = swapEvent.zeroForOne;

      const baseAmount = isSellToken0 ? swapEvent.amount0 : swapEvent.amount1;
      const quoteAmount = isSellToken0 ? swapEvent.amount1 : swapEvent.amount0;

      return {
        signature,
        extra: {},
        tvl: pair.liquidity,
        type: isSellToken0 ? ("sell" as const) : ("buy" as const),
        pair: swapEvent.poolState.toBase58(),
        fee: new Decimal(swapEvent.transferFee0.toString())
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
