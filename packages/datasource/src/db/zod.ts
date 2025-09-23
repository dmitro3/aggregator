import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { mints, pairs, swaps } from "./schema";

export const mintInsertSchema = createInsertSchema(mints);
export const mintSelectSchema = createSelectSchema(mints);

export const pairInsertSchema = createInsertSchema(pairs);
export const pairSelectSchema = createSelectSchema(pairs, {
  baseMint: mintSelectSchema,
  quoteMint: mintSelectSchema,
});

export const swapInsertSchema = createInsertSchema(swaps);
export const swapSelectSchema = createSelectSchema(swaps, {
  pair: pairSelectSchema,
});
