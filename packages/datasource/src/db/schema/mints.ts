import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

type Extra = {
  uri?: string;
  metadata?: Record<string, unknown>;
};

export const mints = pgTable("mints", {
  id: text().primaryKey(),
  name: text(),
  symbol: text(),
  decimals: integer().notNull(),
  extra: jsonb().$type<Extra>().notNull(),
  tokenProgram: text().notNull(),
  syncAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
