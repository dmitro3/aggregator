import type z from "zod/mini";
import type { web3 } from "@coral-xyz/anchor";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

import { upsertPairs } from "./pair-controller";
import { swaps, type Database, type swapInsertSchema } from "../db";

export const createSwaps = async (
  db: Database,
  connection: web3.Connection,
  values: z.infer<typeof swapInsertSchema>[],
) => {
  const umi = createUmi(connection.rpcEndpoint);
  await upsertPairs(db, connection, umi, ...values.map((value) => value.pair));
  return db
    .insert(swaps)
    .values(values)
    .onConflictDoUpdate({
      target: [swaps.signature, swaps.pair],
      set: {
        baseAmountUsd: swaps.baseAmountUsd,
        quoteAmountUsd: swaps.quoteAmountUsd,
      },
    });
};
