import type { web3 } from "@coral-xyz/anchor";
import { collectMap } from "@rhiva-ag/shared";

import { isTokenProgram } from "../../utils";
import { InstructionProcessor } from "../../core";
import type { ParsedSplTokenTransferChecked } from "./types";

export abstract class SplTransferInstructionProcessor extends InstructionProcessor<ParsedSplTokenTransferChecked> {
  process(
    ...instructions: (
      | web3.ParsedInstruction
      | web3.PartiallyDecodedInstruction
    )[]
  ) {
    return collectMap(instructions, (instruction) => {
      if ("parsed" in instruction && isTokenProgram(instruction.programId)) {
        if (instruction.program === "spl-token") {
          return {
            ...instruction,
            parsed: instruction.parsed as ParsedSplTokenTransferChecked,
          };
        }
      }

      return null;
    });
  }
}
