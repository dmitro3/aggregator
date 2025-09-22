import type z from "zod/mini";
import { web3 } from "@coral-xyz/anchor";
import { inArray, type SQL } from "drizzle-orm";
import type { Umi } from "@metaplex-foundation/umi";
import { init } from "@rhiva/decoder/programs/saros/index";
// import {
//   AccountLayout,
//   getAssociatedTokenAddressSync,
// } from "@solana/spl-token";

import { upsertMints } from "./mint-controller";
import { updateJSON } from "../db/custom-drizzle";
import { type pairInsertSchema, pairs, type Database } from "../db";

export const getPairs = <T extends SQL>(db: Database, where?: T) =>
  db.query.pairs
    .findMany({
      where,
      with: {
        baseMint: {
          columns: {
            id: true,
            tokenProgram: true,
          },
        },
        quoteMint: {
          columns: {
            id: true,
            tokenProgram: true,
          },
        },
      },
      columns: {
        baseMint: false,
        quoteMint: false,
      },
    })
    .execute();

// optimize rpc calls for saros data decoding using saros-sdk is not optimized
// abstract this function -- only useful for saros pairs 
// Todo: meteora, orca, raydium
export const upsertPairs = async (
  db: Database,
  connection: web3.Connection,
  umi: Umi,
  ...pairIds: string[]
) => {
  const [program] = init(connection);
  let allPairs = await getPairs(db, inArray(pairs.id, pairIds));

  const notExistingPairPubKeys = pairIds
    .map((pairId) => new web3.PublicKey(pairId))
    .filter(
      (pairId) =>
        !allPairs.some((pair) => new web3.PublicKey(pair.id).equals(pairId)),
    );

  const values: z.infer<typeof pairInsertSchema>[] = await Promise.all(
    notExistingPairPubKeys.map(async (pairPubKey) => {
      const pair = await program.account.pair.fetch(pairPubKey);

      const baseFee =
        BigInt(pair.binStep) *
        BigInt(pair.staticFeeParameters.baseFactor) *
        BigInt(10);

      await upsertMints(
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

  allPairs = await Promise.all(
    allPairs.map(async (pair) => {
      // const pairPubKey = new web3.PublicKey(pair.id);
      // const mints = [pair.baseMint, pair.quoteMint];

      // const [baseMint, quoteMint] = mints.map(
      //   (mint) => new web3.PublicKey(mint)
      // );

      // const poolMintVaults = await Promise.all(
      //   mints.map((mint) => getAssociatedTokenAddressSync(
      //     new web3.PublicKey(mint),
      //     pairPubKey,
      //     true,
      //     new web3.PublicKey(mint.tokenProgram)
      //   )
      //   )
      // );

      // const poolMintVaultAccounttInfos = await connection.getMultipleAccountsInfo(poolMintVaults);

      // let baseTokenReserveAmount = BigInt(0); // todo convert to usd value
      // let quoteTokenReserveAmount = BigInt(0); // todo convert to usd value

      // for (const poolMintVault of poolMintVaultAccounttInfos) {
      //   if (poolMintVault) {
      //     const account = AccountLayout.decode(poolMintVault.data);
      //     if (account.mint.equals(baseMint))
      //       baseTokenReserveAmount += account.amount;
      //     if (account.mint.equals(quoteMint))
      //       quoteTokenReserveAmount += account.amount;
      //   }
      // }

      const marketCap = 0; // convert to native solana value


      // const marketCapUsd = 0;  // convert to usd value, redundant
      return { ...pair, extra: { ...pair.extra, marketCap } };
    }),
  );

  await db.transaction(async (db) =>
    allPairs.map((pair) =>
      db
        .update(pairs)
        .set({
          extra: updateJSON(pairs.extra, ["marketCap"], {
            marketCap: pair.extra.marketCap,
          }),
        })
        .execute(),
    ),
  );

  return allPairs;
};
