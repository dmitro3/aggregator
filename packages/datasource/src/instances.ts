import { Redis } from "ioredis";
import { getEnv } from "./env";
import { cacheResultFn } from "@rhiva-ag/shared";
import { Client } from "@solana-tracker/data-api";

export const redis = new Redis(getEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
});

export const cacheResult = cacheResultFn(redis, 60);
export const solanatracker = new Client({
  apiKey: getEnv("SOLANA_TRACKER_API_KEY"),
});
