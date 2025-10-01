import { Redis } from "ioredis";
import { createDB } from "@rhiva-ag/datasource";

import { getEnv } from "./env";

export const redis = new Redis(getEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
});
export const db = createDB(getEnv("DATABASE_URL"));
