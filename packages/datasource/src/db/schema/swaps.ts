import {
  bigint,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { pairs } from "./pairs";

type Extra = Record<string, never>;

export const swaps = pgTable(
  "swaps",
  {
    signature: text(),
    extra: jsonb().$type<Extra>().notNull(),
    pair: text()
      .references(() => pairs.id, { onDelete: "cascade" })
      .notNull(),
    feeUsd: integer().notNull(),
    baseAmountUsd: integer().notNull(),
    quoteAmountUsd: integer().notNull(),
    fee: bigint({ mode: "bigint" }).notNull(),
    baseAmount: bigint({ mode: "bigint" }).notNull(),
    quoteAmount: bigint({ mode: "bigint" }).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (column) => [unique().on(column.signature, column.pair)],
);
