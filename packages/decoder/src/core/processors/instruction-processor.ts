import type { web3 } from "@coral-xyz/anchor";
import { Consumer } from "./consumer";

type TInstruction<T> = Omit<
  web3.PartiallyDecodedInstruction,
  "data" | "accounts"
> & {
  parsed: T;
  accounts?: web3.PublicKey[];
};

type FnConsumer<T> = (
  instruction: TInstruction<T>,
  extra: { signature: string; inner?: boolean; index: number },
) => Promise<void>;

export abstract class InstructionProcessor<T> extends Consumer<FnConsumer<T>> {
  type: "instruction" = "instruction";

  abstract process(
    instruction: web3.ParsedInstruction | web3.PartiallyDecodedInstruction,
  ): TInstruction<T | null> | null;
}
