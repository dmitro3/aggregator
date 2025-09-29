import z from "zod";

export const pnlSchema = z.object({
  pnl: z.number(),
  delta: z.number(),
  tvl: z.number(),
  name: z.string(),
  duration: z.number(),
  openAmount: z.number(),
  closeAmount: z.number(),
});
