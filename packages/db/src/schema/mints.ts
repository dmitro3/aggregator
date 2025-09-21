import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

type Extra = {
  metadata?: {
    name: string;
    uri: string;
    expandedUri: Record<string, string>;
  };
};

export const mints = pgTable("mints", {
  id: text().primaryKey(),
  decimals: integer().notNull(),
  extra: jsonb().$type<Extra>().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  syncAt: timestamp().defaultNow().notNull(),
});
