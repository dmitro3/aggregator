import { describe, test, expect } from "bun:test";

import { db } from "../src/instances";
import { getAggregratedPairs } from "../src/routes/pairs/pair.controller";

describe("unit test pair.controller", () => {
  test("should pass pair aggregrate", async () => {
    const pairs = await getAggregratedPairs(db);
    console.log(pairs);
    expect(pairs).toBeArray();
  });
});
