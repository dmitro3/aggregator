import { web3 } from "@coral-xyz/anchor";
import { runTask } from "./program-log.task";

(() => {
  const stop = runTask([
    new web3.PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE"),
  ]);

  const shutdown = async () => {
    await stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
})();
