import { router } from "../trpc";
import { pnlRoute } from "./pnl/pnl.route";
import { pairRoute } from "./pairs/pair.route";

export const appRouter = router({
  pnl: pnlRoute,
  pair: pairRoute,
});

export type AppRouter = typeof appRouter;
