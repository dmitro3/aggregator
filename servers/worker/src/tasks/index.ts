import { web3 } from "@coral-xyz/anchor";

import { runSyncPairTask } from "./sync-pair.task";
import { runProgramLogTask } from "./program-log.task";

(() => {
  const stopSyncPairTask = runSyncPairTask(["saros"]);

  const stopProgramLogTask = runProgramLogTask([
    new web3.PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE"),
  ]);

  const shutdown = async () => {
    await stopSyncPairTask();
    await stopProgramLogTask();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
