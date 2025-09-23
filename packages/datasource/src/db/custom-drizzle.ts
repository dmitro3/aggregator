import { type SQL, sql, type Column } from "drizzle-orm";

// Todo: support nested jsonb types
export const updateJSON = <T extends Column, U extends T["_"]["data"]>(
  column: T,
  value: Partial<U>,
) => sql`${column} || ${JSON.stringify(value)}::jsonb`;

export const add = <T extends Column | SQL<unknown> | SQL.Aliased>(
  column: T,
  other: T,
) => sql`${column}::decimal + ${other}::decimal`.mapWith(Number);

export const caseWhen = <T extends SQL<unknown>, U>(when: T, then: U) =>
  sql`CASE WHEN ${when} THEN ${then} END`;

export const coalesce = <T extends Column | SQL.Aliased | SQL<unknown>>(
  column: T,
  value: unknown,
) => sql`COALESCE(${column}, ${value})`;
