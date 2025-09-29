import { pgTable, text, unique } from "drizzle-orm/pg-core";
import { mints } from "./mints";
import { pairs } from "./pairs";

export const rewardMints = pgTable(
  "rewardMints",
  {
    pair: text()
      .references(() => pairs.id, { onDelete: "cascade" })
      .notNull(),
    mint: text()
      .references(() => mints.id, { onDelete: "cascade" })
      .notNull(),
  },
  (column) => [unique().on(column.pair, column.mint).nullsNotDistinct()],
);
