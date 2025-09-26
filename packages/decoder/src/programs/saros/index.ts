import type { Connection } from "@solana/web3.js";
import { AnchorProvider, Program, type IdlAccounts } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";

import LiquidityBookIDL from "../idls/saros.json";
import type { LiquidityBook } from "../idls/types/saros";
import {
  ProgramEventProcessor,
  ProgramInstructionEventProcessor,
  ProgramInstructionProcessor,
} from "../../core";

const VARIABLE_FEE_PRECISION = 100_000_000_000;

export function getVolatilityAccumulator(
  pairInfo: IdlAccounts<LiquidityBook>["pair"],
  activeId: number,
): number {
  const referenceId = pairInfo.dynamicFeeParameters.idReference;
  const volatilityReference = pairInfo.dynamicFeeParameters.volatilityReference;
  const maxVolatilityAccumulator =
    pairInfo.staticFeeParameters.maxVolatilityAccumulator;

  const deltaId = Math.abs(activeId - referenceId);
  const volatilityAccumulator = deltaId * 10_000 + volatilityReference;

  return Math.min(volatilityAccumulator, maxVolatilityAccumulator);
}

export function getDynamicFee(
  pairInfo: IdlAccounts<LiquidityBook>["pair"],
): bigint {
  const volatilityAccumulator = getVolatilityAccumulator(
    pairInfo,
    pairInfo.activeId,
  );

  const variableFeeControl = BigInt(
    pairInfo.staticFeeParameters.variableFeeControl,
  );
  if (variableFeeControl > BigInt(0)) {
    const prod = BigInt(Math.floor(volatilityAccumulator * pairInfo.binStep));
    return (
      (prod * prod * variableFeeControl +
        BigInt(VARIABLE_FEE_PRECISION) -
        BigInt(0)) /
      BigInt(VARIABLE_FEE_PRECISION)
    );
  }
  return BigInt(0);
}

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
