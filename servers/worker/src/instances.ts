import pino from "pino";
import Redis from "ioredis";
import { web3 } from "@coral-xyz/anchor";
import { createDB } from "@rhiva-ag/datasource";
import { Client } from "@solana-tracker/data-api";
import { getEnv } from "./env";

export const redis = new Redis(getEnv("REDIS_URL"), {
  maxRetriesPerRequest: null,
});
export const connection = new web3.Connection(getEnv("RPC_URL"));
export const solanatracker = new Client({
  apiKey: getEnv("SOLANA_TRACKER_API_KEY"),
});

export const db = createDB(getEnv("DATABASE_URL"));
export const logger = pino();
