import { relations } from "drizzle-orm";
import { mints } from "./mints";
import { pairs } from "./pairs";
import { swaps } from "./swaps";

export const mintRelations = relations(mints, ({ many }) => ({
  pairs: many(pairs),
}));

export const pairRelations = relations(pairs, ({ one, many }) => ({
  swaps: many(swaps),
  baseMint: one(mints, { references: [mints.id], fields: [pairs.baseMint] }),
  quoteMint: one(mints, { references: [mints.id], fields: [pairs.quoteMint] }),
}));

export const swapRelations = relations(swaps, ({ one }) => ({
  pair: one(pairs, { references: [pairs.id], fields: [swaps.pair] }),
}));
