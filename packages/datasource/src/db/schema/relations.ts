import { relations } from "drizzle-orm";
import { mints } from "./mints";
import { pairs } from "./pairs";
import { swaps } from "./swaps";
import { rewardMints } from "./rewardMints";

export const mintRelations = relations(mints, ({ many }) => ({
  pairs: many(pairs),
}));

export const pairRelations = relations(pairs, ({ one, many }) => ({
  swaps: many(swaps),
  rewardMints: many(rewardMints),
  baseMint: one(mints, { references: [mints.id], fields: [pairs.baseMint] }),
  quoteMint: one(mints, { references: [mints.id], fields: [pairs.quoteMint] }),
}));

export const swapRelations = relations(swaps, ({ one }) => ({
  pair: one(pairs, { references: [pairs.id], fields: [swaps.pair] }),
}));

export const rewardMintRelations = relations(rewardMints, ({ one }) => ({
  mint: one(mints, { references: [mints.id], fields: [rewardMints.mint] }),
  pair: one(pairs, { references: [pairs.id], fields: [rewardMints.pair] }),
}));
