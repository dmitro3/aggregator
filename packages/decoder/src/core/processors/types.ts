import type { Idl, IdlEvents, DecodeType } from "@coral-xyz/anchor";

export type ProgramEventType<T extends Idl> = {
  [Key in keyof IdlEvents<T>]: { name: Key; data: IdlEvents<T>[Key] };
}[keyof IdlEvents<T>];

export type ProgramInstructionType<T extends Idl> = {
  [Instruction in T["instructions"][number] as Instruction["name"]]: {
    name: Instruction["name"];
    data: {
      [Arg in Instruction["args"][number] as Arg["name"]]: DecodeType<
        Arg["type"],
        unknown
      >;
    };
  };
}[T["instructions"][number]["name"]];
