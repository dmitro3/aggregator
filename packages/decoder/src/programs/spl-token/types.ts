export type ParsedSplTokenTransferChecked = {
  info: {
    authority: string;
    destination: string;
    mint: string;
    source: string;
    tokenAmount: {
      amount: string;
      decimals: number;
      uiAmount: number;
      uiAmountString: string;
    };
  };
  type: "transferChecked";
};

export type ParsedInstruction<T> = {
  instructionIndex: number;
  parsed?: T;
  innerInstructionIndex?: number;
};
