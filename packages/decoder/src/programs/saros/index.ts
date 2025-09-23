import type { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import LiquidityBookIDL from "../idls/saros.json";
import type { LiquidityBook } from "../idls/types/saros";
import {
  ProgramEventProcessor,
  ProgramInstructionEventProcessor,
  ProgramInstructionProcessor,
} from "../../core";

export function init(connection: Connection, extra?: { wallet?: Wallet }) {
  const program = new Program<LiquidityBook>(
    LiquidityBookIDL,
    new AnchorProvider(
      connection,
      extra?.wallet ? extra.wallet : ({} as Wallet),
      AnchorProvider.defaultOptions(),
    ),
  );

  return [program, { name: "saros-clmm" }] as const;
}

export class SarosProgramInstructionProcessor extends ProgramInstructionProcessor<LiquidityBook> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class SarosProgramInstructionEventProcessor extends ProgramInstructionEventProcessor<LiquidityBook> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class SarosProgramEventProcessor extends ProgramEventProcessor<LiquidityBook> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}
