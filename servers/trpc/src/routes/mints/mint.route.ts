import z from "zod";
import { format } from "util";
import { TRPCError } from "@trpc/server";
import { eq, ilike, or, type SQL } from "drizzle-orm";
import { mints, mintSelectSchema } from "@rhiva-ag/datasource";

import { publicProcedure, router } from "../../trpc";

export const mintRoute = router({
  list: publicProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          filter: mintSelectSchema
            .pick({ id: true, name: true, symbol: true })
            .partial(),
        })
        .optional(),
    )
    .output(z.array(mintSelectSchema))
    .query(async ({ ctx, input }) => {
      const where: (SQL<unknown> | undefined)[] = [];
      if (input) {
        if (input.search)
          where.push(
            or(
              ilike(mints.name, format("%%%s%%", input.search)),
              ilike(mints.symbol, format("%%%s%%", input.search)),
            ),
          );
        if (input.filter) {
          if (input.filter.id) where.push(eq(mints.id, input.filter.id));
          if (input.filter.name) where.push(eq(mints.name, input.filter.name));
          if (input.filter.symbol)
            where.push(eq(mints.symbol, input.filter.symbol));
        }
      }
      return ctx.drizzle.query.mints.findMany();
    }),
  retrieve: publicProcedure
    .input(mintSelectSchema.pick({ id: true }))
    .output(mintSelectSchema)
    .query(async ({ ctx }) => {
      const mint = await ctx.drizzle.query.mints.findFirst({});
      if (mint) return mint;

      throw new TRPCError({ code: "NOT_FOUND", message: "mint not found." });
    }),
});
