import { Worker } from "bullmq";
import { web3 } from "@coral-xyz/anchor";
import { Pipeline, type ProgramEventType } from "@rhiva-ag/decoder";
import {
  SarosProgramEventProcessor,
  SarosProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/saros/index";

import { db, redis } from "../instances";
import { createSarosSwapFn } from "../controllers/saros-controller";
import type { LiquidityBook } from "@rhiva-ag/decoder/programs/idls/types/saros";

const connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));

const sarosEventConsumer = async (
  events: ProgramEventType<LiquidityBook>[],
  { signature }: { signature: string },
) => {
  const swapEvents = events.filter((event) => event.name === "binSwapEvent");

  if (swapEvents.length > 0)
    createSarosSwapFn(
      db,
      connection,
      signature,
      ...swapEvents.map((event) => event.data),
    );
};

const pipeline = new Pipeline([
  new SarosProgramEventProcessor(connection).addConsumer(sarosEventConsumer),
  new SarosProgramInstructionEventProcessor(connection).addConsumer(
    async (instruction, extra) => {
      sarosEventConsumer([instruction.parsed], extra);
    },
  ),
]);

export const worker = new Worker(
  "programLog",
  async (job) => {
    const transactions = await connection.getParsedTransactions(
      Array.isArray(job.data) ? job.data : [job.data],
      { maxSupportedTransactionVersion: 0 },
    );
    return Promise.all(
      transactions.map((transaction) => {
        if (transaction) return pipeline.process(transaction);

        return null;
      }),
    );
  },
  {
    connection: redis,
  },
);
