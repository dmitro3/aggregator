import type { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import LbClmmIDL from "../idls/meteora.json";
import type { LbClmm } from "../idls/types/meteora";
import {
  ProgramEventProcessor,
  ProgramInstructionEventProcessor,
  ProgramInstructionProcessor,
} from "../../core";

export function init(connection: Connection, extra?: { wallet?: Wallet }) {
  const program = new Program<LbClmm>(
    LbClmmIDL,
    new AnchorProvider(
      connection,
      extra?.wallet ? extra.wallet : ({} as Wallet),
      AnchorProvider.defaultOptions(),
    ),
  );

  return [program, { name: "meteora-clmm" }] as const;
}

export class MeteoraProgramInstructionProcessor extends ProgramInstructionProcessor<LbClmm> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class MeteoraProgramInstructionEventProcessor extends ProgramInstructionEventProcessor<LbClmm> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class MeteoraProgramEventProcessor extends ProgramEventProcessor<LbClmm> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}
