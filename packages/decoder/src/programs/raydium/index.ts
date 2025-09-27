import type { Connection } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import AmmV3IDL from "../idls/raydium.json";
import type { AmmV3 } from "../idls/types/raydium";
import {
  ProgramEventProcessor,
  ProgramInstructionEventProcessor,
  ProgramInstructionProcessor,
} from "../../core";

export function init(connection: Connection, extra?: { wallet?: Wallet }) {
  const program = new Program<AmmV3>(
    AmmV3IDL,
    new AnchorProvider(
      connection,
      extra?.wallet ? extra.wallet : ({} as Wallet),
      AnchorProvider.defaultOptions(),
    ),
  );

  return [program, { name: "raydium-amm-v3" }] as const;
}

export class RaydiumProgramInstructionProcessor extends ProgramInstructionProcessor<AmmV3> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}
export class RaydiumProgramInstructionEventProcessor extends ProgramInstructionEventProcessor<AmmV3> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}

export class RaydiumProgramEventProcessor extends ProgramEventProcessor<AmmV3> {
  constructor(connection: Connection) {
    super(...init(connection));
  }
}
