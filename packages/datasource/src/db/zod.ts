import z from "zod";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { mints, pairs, swaps } from "./schema";

export const metadataSchema = z.object({
  name: z.string().optional(),
  symbol: z.string().optional(),
  image: z.url().optional(),
  description: z.string().optional(),
  animation_url: z.url().optional(),
  external_url: z.url().optional(),
});

export const mintInsertSchema = createInsertSchema(mints, {
  extra: z.object({
    uri: z.url().optional(),
    metadata: metadataSchema.partial(),
  }),
});
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
