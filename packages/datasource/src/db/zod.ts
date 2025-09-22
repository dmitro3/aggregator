import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { mints, pairs, swaps } from "./schema";

export const pairInsertSchema = createInsertSchema(pairs);
export const pairSelectSchema = createSelectSchema(pairs);

export const mintInsertSchema = createInsertSchema(mints);
export const mintSelectSchema = createSelectSchema(mints);

export const swapInsertSchema = createInsertSchema(swaps);
export const swapSelectSchema = createSelectSchema(swaps);
