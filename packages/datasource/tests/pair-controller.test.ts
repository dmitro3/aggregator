import { inArray } from "drizzle-orm";
import { describe, test, beforeAll, expect } from "bun:test";

import { getEnv } from "../src/env";
import { createDB, getPairs, pairs, type Database } from "../src";

describe("PairController", () => {
  let db: Database;

  beforeAll(() => {
    db = createDB(getEnv("DATABASE_URL"));
  });

  test("should pass query", async () => {
    const pair = await getPairs(
      db,
      inArray(pairs.id, ["7hc6hXjDPcFnhGBPBGTKUtViFsQuyWw8ph4ePHF1aTYG"]),
    );
    expect(pair).toBeArray();
  });
});
