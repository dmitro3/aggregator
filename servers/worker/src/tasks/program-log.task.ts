import { Queue, QueueEvents } from "bullmq";
import type { web3 } from "@coral-xyz/anchor";

import { connection, logger, redis } from "../instances";

const queue = new Queue("programLog", {
  connection: redis,
  defaultJobOptions: { removeOnComplete: true, removeOnFail: true },
});
const event = new QueueEvents("programLog", { connection: redis });

event.on("completed", ({ jobId, returnvalue }) =>
  logger.info({ jobId, returnvalue }, "job.completed"),
);

event.on("failed", ({ jobId, failedReason }) =>
  logger.error({ jobId, failedReason }, "job.failed"),
);

export const runTask = (programs: web3.PublicKey[]) => {
  const subscriptions: number[] = [];

  for (const program of programs) {
    const subscription = connection.onLogs(program, (log) => {
      logger.info(
        { signature: log.signature, program: program.toBase58() },
        "program.onLogs",
      );
      if (log.err) return;
      return queue.add("processLog", log.signature, {
        jobId: log.signature,
        deduplication: { id: log.signature },
      });
    });

    subscriptions.push(subscription);
  }

  return async () =>
    Promise.allSettled([
      queue.close(),
      event.close(),
      subscriptions.filter(Boolean).forEach(connection.removeOnLogsListener),
    ]);
};
