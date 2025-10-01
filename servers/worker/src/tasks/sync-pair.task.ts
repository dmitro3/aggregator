import { format } from "util";
import { Queue } from "bullmq";
import nodeCron from "node-cron";
import type { z } from "zod/mini";
import { count, eq } from "drizzle-orm";
import { pairs, type pairSelectSchema } from "@rhiva-ag/datasource";

import { db, redis } from "../instances";

const queue = new Queue("syncPair", {
  connection: redis.options,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});

export const runSyncPairTask = (
  markets: z.infer<typeof pairSelectSchema>["market"][],
) => {
  const task = nodeCron.schedule(
    "*/5 * * * *",
    async () =>
      markets.map(async (market) => {
        const limit = 101;
        const [{ pairCount }] = await db
          .select({ pairCount: count(pairs.id) })
          .from(pairs)
          .where(eq(pairs.market, market))
          .execute();
        const pages = Math.ceil(pairCount / limit);
        for (let index = 0; index < pages; index++)
          queue.add(format("sync%", market), {
            market,
            limit,
            offset: index * limit,
          });
      }),
    { noOverlap: true },
  );

  return () => task.stop();
};
