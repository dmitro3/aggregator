import z from "zod";

import { publicProcedure, router } from "../../trpc";
import { getAggregratedPairs } from "./pair.controller";
import {
  pairAggregateSchema,
  pairFilterSchema,
  pairSearchSchema,
  pairOrderBySchema,
} from "./pair.schema";

export const pairRoute = router({
  aggregrate: publicProcedure
    .input(
      z.object({
        filter: pairFilterSchema.optional(),
        search: pairSearchSchema.optional(),
        orderBy: pairOrderBySchema.optional(),
      }),
    )
    .output(z.array(pairAggregateSchema))
    .query(async ({ ctx }) => {
      return getAggregratedPairs(ctx.drizzle);
    }),
});
