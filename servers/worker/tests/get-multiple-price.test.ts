import { describe, expect, test } from "bun:test";
import { getMultiplePrices } from "../src/utils";

describe("getMultiplePrices", () => {
  test("should pass", async () => {
    const prices = await getMultiplePrices([
      "DEBUTr2WcEsjkwKhqbRLqnuFKstX1MrEuvaz5xcoQTgn",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    ]);

    expect(prices).toContainAllKeys([
      "DEBUTr2WcEsjkwKhqbRLqnuFKstX1MrEuvaz5xcoQTgn",
      "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    ]);
    for (const value of Object.values(prices))
      expect(value.price).toBeGreaterThan(0);
  });
});
