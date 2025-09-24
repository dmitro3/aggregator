import z from "zod";
import { and } from "drizzle-orm";
import { describe, test, beforeAll } from "bun:test";

import { whereOperator } from "../src/db/zod-query";
import { createDB, pairs, type Database } from "../src";
import {
  buildDrizzleWhereClauseFromObject,
  buildOrderByClauseFromArray,
} from "../src/db/drizzle-query";

describe("test building drizzle query schema", () => {
  let db: Database;

  beforeAll(() => {
    db = createDB(process.env.DATABASE_URL!);
  });

  test("first order simple query", () => {
    const pairFilterSchema = z.object({
      id: whereOperator(z.string()),
      createdAt: whereOperator(z.date()),
    });

    const now = new Date();
    const H24 = new Date(Date.now() - 86400000);

    const where = buildDrizzleWhereClauseFromObject(
      pairFilterSchema.parse({
        id: { ne: { eq: "" } },
        createdAt: { ne: { and: [{ lte: H24 }, { gte: now }] } },
      }),
    );

    const orderBy = buildOrderByClauseFromArray({
      createdAt: "desc",
      id: "asc",
    });
    const query = db
      .select()
      .from(pairs)
      .where(and(...where))
      .orderBy(...orderBy);
    console.log(query.toSQL());
  });
});
