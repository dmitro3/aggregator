import moment from "moment";
import { add, pairs, swaps } from "@rhiva-ag/datasource";
import {
  and,
  avg,
  count,
  eq,
  getTableColumns,
  gte,
  lte,
  sum,
} from "drizzle-orm";

import { publicProcedure, router } from "../../trpc";

export const pairRoute = router({
  aggregrate: publicProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const M5 = moment().subtract(5, "minutes");
    const H1 = moment().subtract(1, "hours");
    const H6 = moment().subtract(6, "hours");
    const H24 = moment().subtract(24, "hours");

    const HSwaps = (start: moment.Moment, end: Date, as: string) =>
      ctx.drizzle
        .select({
          pair: swaps.pair,
          buyCount: count(swaps.pair),
          sellCount: count(swaps.pair),
          tvl: avg(swaps.tvl).mapWith(Number).as("tvl"),
          feeUsd: sum(swaps.feeUsd).mapWith(Number).as("feeUsd"),
          baseAmountUsd: sum(swaps.baseAmountUsd)
            .mapWith(Number)
            .as("baseAmountUsd"),
          quoteAmountUsd: sum(swaps.quoteAmountUsd)
            .mapWith(Number)
            .as("quoteAmountUsd"),
        })
        .from(swaps)
        .groupBy(swaps.pair)
        .where(
          and(gte(swaps.createdAt, start.toDate()), lte(swaps.createdAt, end)),
        )
        .as(as);

    const M5Swaps = HSwaps(M5, now, "M5Swaps");
    const H1Swaps = HSwaps(H1, now, "H1Swaps");
    const H6Swaps = HSwaps(H6, now, "H6Swaps");
    const H24Swaps = HSwaps(H24, now, "H24Swaps");

    const allPairs = await ctx.drizzle
      .select({
        ...getTableColumns(pairs),
        H24: {
          tvl: H24Swaps.tvl,
          fees: H24Swaps.feeUsd,
          buyCount: H24Swaps.buyCount,
          sellCount: H24Swaps.sellCount,
          volume: add(H24Swaps.baseAmountUsd, H24Swaps.quoteAmountUsd),
        },
      })
      .from(pairs)
      .leftJoin(M5Swaps, eq(M5Swaps.pair, pairs.id))
      .leftJoin(H1Swaps, eq(H1Swaps.pair, pairs.id))
      .leftJoin(H6Swaps, eq(H6Swaps.pair, pairs.id))
      .leftJoin(H24Swaps, eq(H24Swaps.pair, pairs.id))
      .execute();

    return allPairs;
  }),
});
