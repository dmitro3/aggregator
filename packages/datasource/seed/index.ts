import { DexApi } from "@rhiva-ag/dex-api";

import { createDB } from "../src";
import { getEnv } from "../src/env";
import { seedSaros } from "./backfill-saros";

(async () => {
  const api = new DexApi();
  const db = createDB(getEnv("DATABASE_URL"));
  await seedSaros(db, api);
})();
