import { worker } from "../jobs/program-log.job";

(async () => {
  if (!worker.isRunning()) await worker.run();

  //   const stop = () => worker.close();

  //   process.on("SIGINT", stop);
  //   process.on("SIGTERM", stop);
})();
