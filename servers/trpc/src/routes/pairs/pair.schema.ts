import z from "zod";
import {
  mintSelectSchema,
  orderByOperator,
  pairSelectSchema,
  whereOperator,
} from "@rhiva-ag/datasource";

export const pairFilterSchema = z.object({
  name: whereOperator(z.string()),
  totalFee: whereOperator(z.number()),
  baseFee: whereOperator(z.number()),
  dynamicFee: whereOperator(z.number()),
  protocolFee: whereOperator(z.number()),
  liquidity: whereOperator(z.number()),
});

export const pairSearchSchema = z.object({
  name: whereOperator(z.string()),
});

export const pairOrderBySchema = orderByOperator(
  z.enum([
    "M5SwapsFeeUsd",
    "H1SwapsFeeUsd",
    "h6SwapsFeeUsd",
    "H24SwapsFeeUsd",
    "totalFee",
    "baseFee",
    "dynamicFee",
    "protocolfee",
  ]),
);

const swapAggregateSchema = z.object({
  tvl: z.number(),
  fees: z.number(),
  buyCount: z.number(),
  sellCount: z.number(),
  volume: z.number(),
});

export const pairAggregateSchema = pairSelectSchema.extend({
  totalFee: z.number(),
  baseMint: mintSelectSchema,
  quoteMint: mintSelectSchema,
  M5: swapAggregateSchema,
  H1: swapAggregateSchema,
  H6: swapAggregateSchema,
  H24: swapAggregateSchema,
});
