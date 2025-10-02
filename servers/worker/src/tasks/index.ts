import { web3 } from "@coral-xyz/anchor";

import { logger } from "../instances";
import { runSyncPairTask } from "./sync-pair.task";
import { runProgramLogTask } from "./program-log.task";

(() => {
  const stopProgramLogTask = runProgramLogTask([
    new web3.PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE"),
  ]);
  const stopSyncPairTask = runSyncPairTask(["saros"]);

  const shutdown = async () => {
    await stopSyncPairTask();
    await stopProgramLogTask();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("uncaughtException", (err) =>
    logger.error(err, "Uncaught exception"),
  );
  process.on("unhandledRejection", (reason, promise) =>
    logger.error({ promise, reason }, "Unhandled Rejection"),
  );
})();
