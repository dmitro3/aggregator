import { describe, test, expect } from "bun:test";

import { db } from "../src/instances";
import { getAggregratedPairs } from "../src/routes/pairs/pair.controller";
import {
  pairFilterSchema,
  pairOrderBySchema,
} from "../src/routes/pairs/pair.query";
import {
  buildDrizzleWhereClauseFromObject,
  buildOrderByClauseFromObject,
} from "@rhiva-ag/datasource";
import { and } from "drizzle-orm";

describe("unit test pair.controller", () => {
  test("should pass pair aggregrate", async () => {
    const where = buildDrizzleWhereClauseFromObject(
      pairFilterSchema.partial().parse({
        name: { eq: "" },
        totalFee: { eq: 5 },
      }),
    );

    const orderBy = buildOrderByClauseFromObject(
      pairOrderBySchema.parse({
        M5SwapsFeeUsd: "desc",
        totalFee: "asc",
      }),
    );

    const pairs = await getAggregratedPairs(db, {
      where: and(...where),
      orderBy,
    });
    console.log(pairs);
    expect(pairs).toBeArray();
  });
});
