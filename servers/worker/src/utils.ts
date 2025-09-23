import type { Client, MultiPriceResponse } from "@solana-tracker/data-api";

import { redis, solanatracker } from "./instances";

export const getMultiplePrices = async (
  ...[mints, ...args]: Parameters<Client["getMultiplePrices"]>
): Promise<MultiPriceResponse> => {
  const prices = await cacheResult(
    async (mints) => {
      return solanatracker.getMultiplePrices(mints, ...args).then((value) =>
        Object.entries(value).map(([key, price]) => ({
          id: key,
          ...price,
        })),
      );
    },
    ...mints,
  );

  return Object.fromEntries(prices.map((price) => [price.id, price]));
};

export const cacheResult = async <U extends { id: string }>(
  upsertFn: (ids: string[]) => Promise<U[]>,
  ...ids: string[]
) => {
  const cacheResults = await redis.mget(...ids).then((cache) =>
    cache
      .map((cache) => {
        if (cache) return JSON.parse(cache) as U;
        return null;
      })
      .filter((pair) => !!pair),
  );

  const uncache = ids.filter(
    (pairId) => !cacheResults.some((cachedPair) => cachedPair.id === pairId),
  );

  let upserts: U[] | undefined;

  if (uncache.length > 0) 
    upserts = await upsertFn(uncache);
  

  if (upserts) {
    const pipeline = redis.pipeline();
    for (const upsert of upserts)
      pipeline.setex(upsert.id, 60, JSON.stringify(upsert));

    await pipeline.exec();
  }

  return [...(upserts ? upserts : []), ...cacheResults];
};
