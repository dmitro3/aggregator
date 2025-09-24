import z from "zod";
import { orderByOperator, whereOperator } from "@rhiva-ag/datasource";

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
