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

  async process(parsedTransactionWithMeta: web3.ParsedTransactionWithMeta) {
    const nestedInstructions = this.getNestedInstructions(
      parsedTransactionWithMeta,
    );

    const promiseJoins = [];
    const signature = parsedTransactionWithMeta.transaction.signatures[0];

    if (parsedTransactionWithMeta.meta?.logMessages && this.logPipes)
      promiseJoins.push(
        ...this.logPipes.map((pipe) => {
          const parsedEvents = pipe.process(
            parsedTransactionWithMeta.meta!.logMessages!,
          );
          if (parsedEvents && parsedEvents.length > 0)
            return pipe.consume(parsedEvents, {
              signature,
            });

          return null;
        }),
      );
    if (this.instructionPipes)
      for (const [index, outerInstruction] of nestedInstructions.entries()) {
        promiseJoins.push(
          ...this.instructionPipes.map((pipe) => {
            const parsedInstruction = pipe.process(outerInstruction);
            if (parsedInstruction)
              return pipe.consume(parsedInstruction, {
                index,
                signature,
              });
            return null;
          }),
        );

        if (outerInstruction.innerInstructions)
          for (const innerInstruction of outerInstruction.innerInstructions) {
            promiseJoins.push(
              ...this.instructionPipes.map((pipe) => {
                const parsedInstruction = pipe.process(innerInstruction);
                if (parsedInstruction)
                  return pipe.consume(parsedInstruction, {
                    index,
                    signature,
                    inner: true,
                  });

                return null;
              }),
            );
          }
      }

    return Promise.all(promiseJoins.filter(Boolean));
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
