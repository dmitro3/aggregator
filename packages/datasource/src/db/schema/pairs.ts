import { decimal, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { mints } from "./mints";

type Extra = Record<string, never>;

export const pairs = pgTable("pairs", {
  id: text().primaryKey(),
  name: text().notNull(),
  extra: jsonb().$type<Extra>().notNull(),
  quoteMint: text()
    .references(() => mints.id)
    .notNull(),
  baseMint: text()
    .references(() => mints.id)
    .notNull(),
  binStep: decimal({ mode: "number" }).notNull(),
  baseFee: decimal({ mode: "number" }).notNull(),
  maxFee: decimal({ mode: "number" }).notNull(),
  protocolFee: decimal({ mode: "number" }).notNull(),
  dynamicFee: decimal({ mode: "number" }).notNull(),
  liquidity: decimal({ mode: "number" }).notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  market: text({ enum: ["meteora", "orca", "raydium", "saros"] }).notNull(),
  syncAt: timestamp().defaultNow().notNull(),
});
