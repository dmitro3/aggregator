import type { web3 } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export function isTokenProgram(programId: web3.PublicKey) {
  return (
    programId.equals(TOKEN_PROGRAM_ID) ||
    programId.equals(TOKEN_2022_PROGRAM_ID)
  );
}
