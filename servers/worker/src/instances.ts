import pino from "pino";
import Redis from "ioredis";
import { web3 } from "@coral-xyz/anchor";
import { createDB } from "@rhiva/datasource";
import { Client } from "@solana-tracker/data-api";

export const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});
export const connection = new web3.Connection(
  web3.clusterApiUrl("mainnet-beta"),
);
export const solanatracker = new Client({
  apiKey: process.env.SOLANA_TRACKER_API_KEY!,
});

export const db = createDB(process.env.DATABASE_URL!);
export const logger = pino();
