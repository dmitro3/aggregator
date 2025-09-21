import type { web3 } from "@coral-xyz/anchor";

import { isTokenProgram } from "../../utils";
import { InstructionProcessor } from "../../core";
import type { ParsedSplTokenTransferChecked } from "./types";

export abstract class SplTransferInstructionProcessor extends InstructionProcessor<ParsedSplTokenTransferChecked> {
  process(
    instruction: web3.ParsedInstruction | web3.PartiallyDecodedInstruction,
  ) {
    if ("parsed" in instruction && isTokenProgram(instruction.programId)) {
      if (instruction.program === "spl-token") {
        return {
          ...instruction,
          parsed: instruction.parsed as ParsedSplTokenTransferChecked,
        };
      }
    }

    return null;
  }
}
