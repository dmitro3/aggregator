import { type Program, web3 } from "@coral-xyz/anchor";
import { beforeAll, describe, expect, test } from "bun:test";
import { init } from "@rhiva-ag/decoder/programs/meteora/index";
import type { LbClmm } from "@rhiva-ag/decoder/programs/idls/types/meteora";

import { transformMeteoraPairAccount } from "../src/controllers/meteora-controller";

describe("Raydium Controller", () => {
  let program: Program<LbClmm>;
  let connection: web3.Connection;

  beforeAll(() => {
    connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));
    [program] = init(connection);
  });

  test("should pass transformMeteoraPairAccount", async () => {
    const poolState = await program.account.lbPair.fetch(
      "BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y",
    );

    const pool = transformMeteoraPairAccount(poolState);

    expect(pool.binStep).toBe(10);
    expect(pool.baseFee).toBe(0.1);
    expect(pool.maxFee).toBe(10);
    expect(pool.dynamicFee).toBeGreaterThanOrEqual(0.1);
    expect(pool.protocolFee).toBeGreaterThanOrEqual(0.005);
  });

  test("should pass transformMeteoraPairAccount", async () => {
    const poolState = await program.account.lbPair.fetch(
      "7q1BaMsFikgMJBMmmzF4nD9mxE6agFASnxGGq58LVd43",
    );

    const pool = transformMeteoraPairAccount(poolState);

    expect(pool.binStep).toBe(5);
    expect(pool.baseFee).toBe(0.02);
    expect(pool.maxFee).toBe(10);
    expect(pool.dynamicFee).toBeGreaterThanOrEqual(0.02);
    expect(pool.protocolFee).toBeGreaterThanOrEqual(0.001);
  });
});
