import { Worker } from "bullmq";
import { Pipeline, type ProgramEventType } from "@rhiva-ag/decoder";
import { createRaydiumV3SwapFn } from "../controllers/raydium-controller";
import type { AmmV3 } from "@rhiva-ag/decoder/programs/idls/types/raydium";
import type { Whirlpool } from "@rhiva-ag/decoder/programs/idls/types/orca";
import type { LbClmm } from "@rhiva-ag/decoder/programs/idls/types/meteora";
import type { LiquidityBook } from "@rhiva-ag/decoder/programs/idls/types/saros";
import {
  SarosProgramEventProcessor,
  SarosProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/saros/index";
import {
  RaydiumProgramEventProcessor,
  RaydiumProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/raydium/index";
import {
  MeteoraProgramEventProcessor,
  MeteoraProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/meteora/index";
import {
  WhirlpoolProgramEventProcessor,
  WhirlpoolProgramInstructionEventProcessor,
} from "@rhiva-ag/decoder/programs/orca/index";

import { connection, db, redis } from "../instances";
import { createOrcaSwapFn } from "../controllers/orca-controller";
import { createSarosSwapFn } from "../controllers/saros-controller";
import { createMeteoraSwapFn } from "../controllers/meteora-controller";

const sarosEventConsumer = async (
  events: ProgramEventType<LiquidityBook>[],
  { signature }: { signature: string },
) => {
  const swapEvents = events.filter((event) => event.name === "binSwapEvent");
  if (swapEvents.length > 0)
    return createSarosSwapFn(
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
    return createRaydiumV3SwapFn(
      db,
      connection,
      signature,
      ...swapEvents.map((event) => event.data),
    );
};

const meteoraEventConsumer = async (
  events: ProgramEventType<LbClmm>[],
  { signature }: { signature: string },
) => {
  const swapEvents = events.filter((event) => event.name === "swap");

  if (swapEvents.length > 0)
    return createMeteoraSwapFn(
      db,
      connection,
      signature,
      ...swapEvents.map((event) => event.data),
    );
};

const orcaEventConsumer = async (
  events: ProgramEventType<Whirlpool>[],
  { signature }: { signature: string },
) => {
  const swapEvents = events.filter((event) => event.name === "traded");

  if (swapEvents.length > 0)
    return createOrcaSwapFn(
      db,
      connection,
      signature,
      ...swapEvents.map((event) => event.data),
    );
};

export const pipeline = new Pipeline([
  new SarosProgramEventProcessor(connection).addConsumer(sarosEventConsumer),
  new SarosProgramInstructionEventProcessor(connection).addConsumer(
    async (instruction, extra) =>
      sarosEventConsumer([instruction.parsed], extra),
  ),
  new RaydiumProgramEventProcessor(connection).addConsumer(
    raydiumEventConsumer,
  ),
  new RaydiumProgramInstructionEventProcessor(connection).addConsumer(
    async (instruction, extra) =>
      raydiumEventConsumer([instruction.parsed], extra),
  ),
  new MeteoraProgramEventProcessor(connection).addConsumer(
    meteoraEventConsumer,
  ),
  new MeteoraProgramInstructionEventProcessor(connection).addConsumer(
    async (instruction, extra) =>
      meteoraEventConsumer([instruction.parsed], extra),
  ),
  new WhirlpoolProgramEventProcessor(connection).addConsumer(orcaEventConsumer),
  new WhirlpoolProgramInstructionEventProcessor(connection).addConsumer(
    async (instruction, extra) =>
      orcaEventConsumer([instruction.parsed], extra),
  ),
]);

export const programLogWorker = new Worker(
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
