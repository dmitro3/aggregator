import { worker } from "../jobs/program-log.job";

(async () => {
  if (!worker.isRunning()) await worker.run();

  const stop = async () => {
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
})();
