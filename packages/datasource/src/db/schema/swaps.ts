import { decimal, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { pairs } from "./pairs";

type Extra = Record<string, never>;

export const swaps = pgTable("swaps", {
  signature: text(),
  extra: jsonb().$type<Extra>().notNull(),
  type: text({ enum: ["sell", "buy"] }).notNull(),
  pair: text()
    .references(() => pairs.id, { onDelete: "cascade" })
    .notNull(),
  feeUsd: decimal({ mode: "number" }).notNull(),
  baseAmountUsd: decimal({ mode: "number" }).notNull(),
  quoteAmountUsd: decimal({ mode: "number" }).notNull(),
  fee: decimal({ mode: "number" }).notNull(),
  baseAmount: decimal({ mode: "number" }).notNull(),
  quoteAmount: decimal({ mode: "number" }).notNull(),
  tvl: decimal({ mode: "number" }),
  price: decimal({ mode: "number" }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
