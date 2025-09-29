import { Redis } from "ioredis";
import { Connection } from "@solana/web3.js";
import { createDB } from "@rhiva-ag/datasource";
import { cacheResultFn } from "@rhiva-ag/shared";

import { getEnv } from "./env";

export const redis = new Redis(getEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
});
export const db = createDB(getEnv("DATABASE_URL"));
export const cacheResult = cacheResultFn(redis, 60);
export const connection = new Connection(getEnv("RPC_URL"));
