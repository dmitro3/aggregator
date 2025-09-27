import { type Program, web3 } from "@coral-xyz/anchor";
import { describe, test, beforeAll, expect } from "bun:test";
import { init } from "@rhiva-ag/decoder/programs/saros/index";
import type { LiquidityBook } from "@rhiva-ag/decoder/programs/idls/types/saros";

import { transformSarosPairAccount } from "../src/controllers/saros-controller";

describe("SarosController", () => {
  let program: Program<LiquidityBook>;
  let connection: web3.Connection;

  beforeAll(async () => {
    connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"));
    [program] = init(connection);
  });

  test("should pass transformPairAccountInfo", async () => {
    const pair = await program.account.pair.fetch(
      "E3fgKeShQeUfXcbzWS71J674fQQ8kEkt5thrYA57MWfi",
    );

    const transformedPair = transformSarosPairAccount(pair);
    expect(transformedPair.binStep).toEqual(100);
    expect(transformedPair.baseFee).toEqual(1);
    expect(transformedPair.protocolFee).toEqual(0.2);
    expect(transformedPair.dynamicFee).toBeGreaterThanOrEqual(1);
  });

  test("should pass transformPairAccountInfo", async () => {
    const pair = await program.account.pair.fetch(
      "DHXKB9fSff4LjubMFieKxaBrvNY6AzXVwaRLk5N2vs87",
    );

    const transformedPair = transformSarosPairAccount(pair);
    expect(transformedPair.binStep).toEqual(1);
    expect(transformedPair.baseFee).toEqual(0.01);
    expect(transformedPair.protocolFee).toEqual(0.002);
    expect(transformedPair.dynamicFee).toBeGreaterThanOrEqual(0.01);
  });
});
