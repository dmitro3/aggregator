import z from "zod";
import { and, or, type SQL } from "drizzle-orm";
import {
  buildDrizzleWhereClauseFromObject,
  buildOrderByClauseFromObject,
} from "@rhiva-ag/datasource";

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
      z
        .object({
          limit: z.number(),
          offset: z.number(),
          orderBy: pairOrderBySchema.optional(),
          filter: pairFilterSchema.partial().optional(),
          search: pairSearchSchema.partial().optional(),
        })
        .optional(),
    )
    .output(z.array(pairAggregateSchema))
    .query(async ({ ctx, input }) => {
      let where: SQL<unknown> | undefined;
      let orderBy: SQL<unknown>[] | undefined;

      if (input) {
        if (input.orderBy)
          orderBy = buildOrderByClauseFromObject(input.orderBy);
        if (input.filter)
          where = and(...buildDrizzleWhereClauseFromObject(input.filter));
        if (input.search)
          where = and(
            where,
            or(...buildDrizzleWhereClauseFromObject(input.search)),
          );
      }

      return getAggregratedPairs(ctx.drizzle, {
        where,
        orderBy,
        limit: input?.limit,
        offset: input?.offset,
      });
    }),
  list: publicProcedure.query(() => 1),
});
