import assert from "assert";
import type { web3 } from "@coral-xyz/anchor";

import { LogProcessor } from "./processors/log-processor";
import { InstructionProcessor } from "./processors/instruction-processor";

export class Pipeline<T extends InstructionProcessor<any> | LogProcessor<any>> {
  private readonly logPipes: LogProcessor<unknown>[];
  private readonly instructionPipes: InstructionProcessor<unknown>[];

  constructor(pipes: T[]) {
    this.logPipes = [];
    this.instructionPipes = [];

    for (const pipe of pipes) this.addPipes(pipe);
  }

  addPipes(pipe: T) {
    if (pipe instanceof InstructionProcessor) this.instructionPipes?.push(pipe);
    else if (pipe instanceof LogProcessor) this.logPipes?.push(pipe);
  }

  process(parsedTransactionWithMeta: web3.ParsedTransactionWithMeta) {
    const nestedInstructions = this.getNestedInstructions(
      parsedTransactionWithMeta,
    );

    if (parsedTransactionWithMeta.meta?.logMessages && this.logPipes)
      for (const event of this.logPipes) {
        const parsedEvents = event.process(
          parsedTransactionWithMeta.meta.logMessages,
        );
        if (parsedEvents) event.consume(...parsedEvents);
      }

    if (this.instructionPipes)
      for (const [index, outerInstruction] of nestedInstructions.entries()) {
        for (const instruction of this.instructionPipes) {
          const parsedInstruction = instruction.process(outerInstruction);
          if (parsedInstruction) {
            instruction.consume(parsedInstruction);
            break;
          }
        }

        if (outerInstruction.innerInstructions)
          for (const innerInstruction of outerInstruction.innerInstructions) {
            for (const instruction of this.instructionPipes) {
              const parsedInstruction = instruction.process(innerInstruction);
              if (parsedInstruction) {
                instruction.consume(parsedInstruction, { index, inner: true });
                break;
              }
            }
          }
      }
  }

  protected getNestedInstructions(
    parsedTransactionWithMeta: web3.ParsedTransactionWithMeta,
  ) {
    assert(parsedTransactionWithMeta.meta, "meta expected in transaction");

    const nestedInstructions: ((
      | web3.ParsedInstruction
      | web3.PartiallyDecodedInstruction
    ) & {
      innerInstructions?: (
        | web3.ParsedInstruction
        | web3.PartiallyDecodedInstruction
      )[];
    })[] = [...parsedTransactionWithMeta.transaction.message.instructions];

    const { innerInstructions } = parsedTransactionWithMeta.meta;

    if (innerInstructions) {
      for (const { index, instructions } of innerInstructions) {
        const outerInstruction = nestedInstructions[index];

        if (outerInstruction) outerInstruction.innerInstructions = instructions;
      }
    }

    return nestedInstructions;
  }
}
