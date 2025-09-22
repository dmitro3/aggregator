import { sql, type Column} from "drizzle-orm";

// Todo: support nested jsonb types
export const updateJSON = <T extends Column, U extends T["_"]["data"]>(
  column: T,
  path: (keyof U)[],
  value: Partial<U>,
) =>
  sql`${column} = jsonb_set(${column}, ${path}, ${JSON.stringify(value)}::jsonb, false)`;
