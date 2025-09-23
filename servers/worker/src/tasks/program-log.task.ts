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
  // const subscriptions: number[] = [];

  // for (const program of programs) {
  //   const subscription = connection.onLogs(program, (log) => {
  //     logger.info(
  //       { signature: log.signature, program: program.toBase58() },
  //       "program.onLogs",
  //     );
  //     if (log.err) return;
  //     return queue.add("processLog", log.signature, {
  //       jobId: log.signature,
  //       deduplication: { id: log.signature },
  //     });
  //   });

  //   subscriptions.push(subscription);
  // }

  // return () => {
  //   subscriptions.map((subscription) =>
  //     connection.removeOnLogsListener(subscription),
  //   );
  // };

  queue.add(
    "processLog",
    "9RdSqeNGZwFbpjFVZqRWoWPtGd98txLaWA1vqNvESycET4RtKV3tm16CzPwfjGq9DZj3LSBgtLuGcXzR4fhkELq",
    {
      jobId:
        "9RdSqeNGZwFbpjFVZqRWoWPtGd98txLaWA1vqNvESycET4RtKV3tm16CzPwfjGq9DZj3LSBgtLuGcXzR4fhkELq",
    },
  );
};
