import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { mints } from "./mints";

type Extra = {
  binStep: number;
  baseFee: number;
  maxFee: number;
  protocolFee: number;
  dynamicFee: number;
  marketCap: number;
};

export const pairs = pgTable("pairs", {
  id: text().primaryKey(),
  extra: jsonb().$type<Extra>().notNull(),
  quoteMint: text()
    .references(() => mints.id)
    .notNull(),
  baseMint: text()
    .references(() => mints.id)
    .notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  market: text({ enum: ["meteora", "orca", "raydium", "saros"] }).notNull(),
  syncAt: timestamp().defaultNow().notNull(),
});
