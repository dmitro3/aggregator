import z from "zod";
import { TRPCError } from "@trpc/server";
import { pairSelectSchema } from "@rhiva-ag/datasource";

import { getSarosPNL } from "../../utils/pnl";
import { publicProcedure, router } from "../../trpc";
import { pnlSchema } from "./pnl.schema";

export const pnlRoute = router({
  retrieve: publicProcedure
    .input(
      z.object({
        market: pairSelectSchema.shape.market,
        signature: z.string().min(88),
      }),
    )
    .output(pnlSchema.nullish())
    .query(async ({ ctx, input }) => {
      if (input.market === "saros")
        return getSarosPNL(ctx.drizzle, ctx.solanaConnection, input.signature);

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "market type not supported.",
      });
    }),
});
