import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import type { z } from "zod/mini";
import {
  pairs,
  syncMeteoraPairs,
  syncOrcaPairs,
  syncRaydiumPairs,
  syncSarosPairs,
  type pairSelectSchema,
} from "@rhiva-ag/datasource";

import { db, connection, redis } from "../instances";

type SyncPairJobData = {
  offset: number;
  limit: number;
  market: z.infer<typeof pairSelectSchema>["market"];
};

export const syncPairWorker = new Worker(
  "syncPair",
  async (job) => {
    const data: SyncPairJobData = job.data;
    if ("offset" in data && "market" in data) {
      const allPairs = await db.query.pairs.findMany({
        limit: data.limit,
        offset: data.offset,
        where: eq(pairs.market, data.market),
      });

      const marketHandlers = {
        saros: syncSarosPairs,
        orca: syncOrcaPairs,
        raydium: syncRaydiumPairs,
        meteora: syncMeteoraPairs,
      } as const;

      if (allPairs.length > 0) {
        const handler = marketHandlers[data.market];

        if (handler && allPairs.length > 0)
          return handler(db, connection, allPairs);
      }
    }
  },
  { connection: redis },
);
