import { web3 } from "@coral-xyz/anchor";
import { Pipeline } from "@rhiva/decoder";
import type { ProgramEventType } from "@rhiva/decoder";
import type { LiquidityBook } from "@rhiva/decoder/programs/idls/types/saros";
import {
  SarosProgramEventProcessor,
  SarosProgramInstructionEventProcessor,
} from "@rhiva/decoder/programs/saros/index";

const connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));

async function consumer(...events: ProgramEventType<LiquidityBook>[]) {
  console.log(events, { depth: null });
}
