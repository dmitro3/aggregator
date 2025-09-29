import { format } from "util";
import nodeCron from "node-cron";
import type { z } from "zod/mini";
import { count, eq } from "drizzle-orm";
import { Queue, QueueEvents } from "bullmq";
import { pairs, type pairSelectSchema } from "@rhiva-ag/datasource";

import { db, logger, redis } from "../instances";

const queue = new Queue("syncPair", {
  connection: redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});
const event = new QueueEvents("syncPair", { connection: redis });

event.on("completed", ({ jobId, returnvalue }) =>
  logger.info({ jobId, returnvalue }, "job.completed"),
);

event.on("failed", ({ jobId, failedReason }) =>
  logger.error({ jobId, failedReason }, "job.failed"),
);

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
