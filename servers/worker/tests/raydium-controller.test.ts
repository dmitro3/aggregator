import { type Program, web3 } from "@coral-xyz/anchor";
import { beforeAll, describe, expect, test } from "bun:test";
import { init } from "@rhiva-ag/decoder/programs/raydium/index";
import type { AmmV3 } from "@rhiva-ag/decoder/programs/idls/types/raydium";

import { transformRaydiumPairAccount } from "../src/controllers/raydium-controller";

describe("Raydium Controller", () => {
  let program: Program<AmmV3>;
  let connection: web3.Connection;

  beforeAll(() => {
    connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));
    [program] = init(connection);
  });

  test("should pass transformRaydiumPairAccount", async () => {
    const poolState = await program.account.poolState.fetch(
      "3ucNos4NbumPLZNWztqGHNFFgkHeRMBQAVemeeomsUxv",
    );
    const ammConfig = await program.account.ammConfig.fetch(
      poolState.ammConfig,
    );

    const pool = transformRaydiumPairAccount(poolState, ammConfig);

    expect(pool.binStep).toBe(1);
    expect(pool.baseFee).toBe(0.04);
    expect(pool.protocolFee).toBe(0.04 * 0.12);
  });

  test("should pass transformRaydiumPairAccount", async () => {
    const poolState = await program.account.poolState.fetch(
      "Bh9rUZZd7YZPWh3BRsFTAjJ1KU8V7QncgaKqQky5UgHD",
    );
    const ammConfig = await program.account.ammConfig.fetch(
      poolState.ammConfig,
    );

    const pool = transformRaydiumPairAccount(poolState, ammConfig);

    expect(pool.binStep).toBe(1);
    expect(pool.baseFee).toBe(0.01);
    expect(pool.protocolFee).toBe(0.01 * 0.12);
  });
});
