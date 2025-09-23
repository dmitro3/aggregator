import { web3 } from "@coral-xyz/anchor";
import { runTask } from "./program-log.task";

(() => {
  const stop = runTask([
    new web3.PublicKey("1qbkdrr3z4ryLA7pZykqxvxWPoeifcVKo6ZG9CfkvVE"),
  ]);

  //   process.on("SIGINT", stop);
  //   process.on("SIGTERM", stop);
})();
