import { router } from "../trpc";
import { pairRoute } from "./pairs/pair.route";

export const appRouter = router({
  pair: pairRoute,
});

export type AppRouter = typeof appRouter;
