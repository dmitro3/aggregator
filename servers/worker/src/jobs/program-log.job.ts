import { Worker } from "bullmq";
import { web3 } from "@coral-xyz/anchor";
import { Pipeline, type ProgramEventType } from "@rhiva-ag/decoder";
import {
  SarosProgramEventProcessor,
  SarosProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/saros/index";
import {
  RaydiumProgramEventProcessor,
  RaydiumProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/raydium/index";

import { db, redis } from "../instances";
import { createSarosSwapFn } from "../controllers/saros-controller";
import type { LiquidityBook } from "@rhiva-ag/decoder/programs/idls/types/saros";
import { createRaydiumV3SwapFn } from "../controllers/raydium-controller";
import type { AmmV3 } from "@rhiva-ag/decoder/programs/idls/types/raydium";

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

const raydiumEventConsumer = async (
  events: ProgramEventType<AmmV3>[],
  { signature }: { signature: string },
) => {
  const swapEvents = events.filter((event) => event.name === "swapEvent");

  if (swapEvents.length > 0)
    createRaydiumV3SwapFn(
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
  new RaydiumProgramEventProcessor(connection).addConsumer(
    raydiumEventConsumer,
  ),
  new RaydiumProgramInstructionEventProcessor(connection).addConsumer(
    async (instruction, extra) => {
      raydiumEventConsumer([instruction.parsed], extra);
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
