import z from "zod";
import { describe, test, expect } from "bun:test";

import { whereOperator } from "../src/db/zod-query";

describe("test zod query schema", () => {
  test("first order simple query", () => {
    const userQuerySchema = z.object({
      name: whereOperator(z.string()),
      followers: whereOperator(z.number()),
    });

    const query = userQuerySchema.parse({
      name: {
        eq: "caleb",
      },
      followers: {
        inArray: [1, 2],
      },
    });

    expect(query).toContainAllKeys(["name", "followers"]);
    expect(query).toEqual({
      name: { eq: "caleb" },
      followers: { inArray: [1, 2] },
    });
  });

  test("second order query", () => {
    const userQuerySchema = z.object({
      name: whereOperator(z.string()),
      followers: whereOperator(z.number()),
    });

    const value = {
      name: {
        ne: { eq: "caleb" },
      },
      followers: {
        and: [{ inArray: [1, 2] }, { arrayContains: [3, 4] }],
      },
    };

    const query = userQuerySchema.partial().parse(value);

    expect(query).toContainAllKeys(["name", "followers"]);
    expect(query).toEqual(value);
  });
});
