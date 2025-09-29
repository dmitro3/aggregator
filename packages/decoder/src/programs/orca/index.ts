import type { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import WhirlpoolIDL from "../idls/orca.json";
import type { Whirlpool } from "../idls/types/orca";
import {
  ProgramEventProcessor,
  ProgramInstructionEventProcessor,
  ProgramInstructionProcessor,
} from "../../core";

export function init(connection: Connection, extra?: { wallet?: Wallet }) {
  const program = new Program<Whirlpool>(
    WhirlpoolIDL,
    new AnchorProvider(
      connection,
      extra?.wallet ? extra.wallet : ({} as Wallet),
      AnchorProvider.defaultOptions(),
    ),
  );

  return [program, { name: "whirlpool" }] as const;
}

export class WhirlpoolProgramInstructionProcessor extends ProgramInstructionProcessor<Whirlpool> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class WhirlpoolProgramInstructionEventProcessor extends ProgramInstructionEventProcessor<Whirlpool> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class WhirlpoolProgramEventProcessor extends ProgramEventProcessor<Whirlpool> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}
