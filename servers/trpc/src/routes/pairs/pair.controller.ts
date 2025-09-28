import moment from "moment";
import { format } from "util";
import {
  add,
  caseWhen,
  coalesce,
  mints,
  pairs,
  swaps,
  type Database,
} from "@rhiva-ag/datasource";
import {
  count,
  avg,
  sum,
  and,
  gte,
  lte,
  getTableColumns,
  eq,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod/mini";
import type { pairAggregateSchema } from "./pair.schema";

export const getAggregratedPairs = async (
  db: Database,
  extra?: {
    where?: SQL<unknown>;
    orderBy?: SQL<unknown>[];
    limit?: number;
    offset?: number;
  },
) => {
  const now = new Date();
  const M5 = moment().subtract(5, "minutes");
  const H1 = moment().subtract(1, "hours");
  const H6 = moment().subtract(6, "hours");
  const H24 = moment().subtract(24, "hours");

  const HSwaps = (start: moment.Moment, end: Date, as: string) =>
    db
      .select({
        pair: swaps.pair,
        tvl: avg(swaps.tvl).mapWith(Number).as(format("%sTvl", as)),
        feeUsd: sum(swaps.feeUsd)
          .mapWith(Number)
          .as(format("%sFeeUsd", as).toLocaleLowerCase()),
        buyCount: count(caseWhen(eq(swaps.type, "buy"), 1)).as(
          format("%sBuyCount", as),
        ),
        sellCount: count(caseWhen(eq(swaps.type, "sell"), 1)).as(
          format("%sSellCount", as),
        ),
        baseAmountUsd: sum(swaps.baseAmountUsd)
          .mapWith(Number)
          .as(format("%sBaseAmountUsd", as)),
        quoteAmountUsd: sum(swaps.quoteAmountUsd)
          .mapWith(Number)
          .as(format("%sQuoteAmountUsd", as)),
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

  const baseMints = db.select().from(mints).as("baseMints");
  const quoteMints = db.select().from(mints).as("quoteMints");

  const aggregrate = <T extends ReturnType<typeof HSwaps>>(column: T) => {
    return {
      tvl: coalesce(column.tvl, 0).mapWith(Number),
      fees: coalesce(column.feeUsd, 0).mapWith(Number),
      buyCount: coalesce(column.buyCount, 0).mapWith(Number),
      sellCount: coalesce(column.sellCount, 0).mapWith(Number),
      volume: coalesce(
        add(column.baseAmountUsd, column.quoteAmountUsd),
        0,
      ).mapWith(Number),
    };
  };

  const query = db
    .select({
      ...getTableColumns(pairs),
      baseMint: baseMints._.selectedFields,
      quoteMint: quoteMints._.selectedFields,
      totalFee: add(pairs.baseFee, pairs.protocolFee, pairs.dynamicFee)
        .mapWith(Number)
        .as("totalfee"),
      M5: aggregrate(M5Swaps),
      H1: aggregrate(H1Swaps),
      H6: aggregrate(H6Swaps),
      H24: aggregrate(H24Swaps),
    })
    .from(pairs)
    .innerJoin(baseMints, eq(baseMints.id, pairs.baseMint))
    .innerJoin(quoteMints, eq(quoteMints.id, pairs.quoteMint))
    .leftJoin(M5Swaps, eq(M5Swaps.pair, pairs.id))
    .leftJoin(H1Swaps, eq(H1Swaps.pair, pairs.id))
    .leftJoin(H6Swaps, eq(H6Swaps.pair, pairs.id))
    .leftJoin(H24Swaps, eq(H24Swaps.pair, pairs.id));

  if (extra) {
    if (extra.limit) query.limit(extra.limit);
    if (extra.offset) query.offset(extra.offset);

    if (extra.where) query.where(extra.where);
    if (extra.orderBy) query.orderBy(...extra.orderBy);
  }

  return query.execute() as unknown as z.infer<typeof pairAggregateSchema>;
};
