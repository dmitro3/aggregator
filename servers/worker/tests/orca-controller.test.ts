import { type Program, web3 } from "@coral-xyz/anchor";
import { beforeAll, describe, expect, test } from "bun:test";
import { init } from "@rhiva-ag/decoder/programs/orca/index";
import type { Whirlpool } from "@rhiva-ag/decoder/programs/idls/types/orca";

import { transformOrcaPairAccount } from "@rhiva-ag/datasource";

describe("Orca Controller", () => {
  let program: Program<Whirlpool>;
  let connection: web3.Connection;

  beforeAll(() => {
    connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));
    [program] = init(connection);
  });

  test("should pass transformOrcaPairAccount", async () => {
    const poolState = await program.account.whirlpool.fetch(
      "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
    );

    const pool = transformOrcaPairAccount(poolState);

    expect(pool.binStep).toBe(4);
    expect(pool.baseFee).toBe(0.04);
    expect(pool.maxFee).toBe(0.04);
    expect(pool.dynamicFee).toBeGreaterThanOrEqual(0.04);
    expect(pool.protocolFee).toBeGreaterThanOrEqual(0.005);
  });

  // test("should pass transformMeteoraPairAccount", async () => {
  //   const poolState = await program.account.lbPair.fetch(
  //     "7q1BaMsFikgMJBMmmzF4nD9mxE6agFASnxGGq58LVd43",
  //   );

  //   const pool = transformMeteoraPairAccount(poolState);

  //   expect(pool.binStep).toBe(5);
  //   expect(pool.baseFee).toBe(0.02);
  //   expect(pool.maxFee).toBe(10);
  //   expect(pool.dynamicFee).toBeGreaterThanOrEqual(0.02);
  //   expect(pool.protocolFee).toBeGreaterThanOrEqual(0.001);
  // });
});
