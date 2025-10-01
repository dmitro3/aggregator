import { logger } from "../instances";
import { syncPairWorker } from "./sync-pair.job";
import { programLogWorker } from "./program-log.job";

(async () => {
  const workers = [programLogWorker, syncPairWorker];

  for (const worker of workers) if (!worker.isRunning()) await worker.run();

  const stop = async () => {
    for (const worker of workers) worker.close();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("uncaughtException", (err) =>
    logger.error(err, "Uncaught exception"),
  );
  process.on("unhandledRejection", (reason, promise) =>
    logger.error({ promise, reason }, "Unhandled Rejection"),
  );
})();
