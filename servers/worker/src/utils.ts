import { format } from "util";
import type { Client, MultiPriceResponse } from "@solana-tracker/data-api";

import { redis, solanatracker } from "./instances";
import xior from "xior";

export const priceFallback = async (mints: string[]) => {
  const response = await xior.get<Record<string, number>>(
    format(
      "https://fe-api.jup.ag/api/v1/prices?list_address=%s",
      mints.join(","),
    ),
  );
  return Object.entries(response.data).map(([key, price]) => ({
    id: key,
    price,
    liquidity: 0,
    priceQuote: 0,
    lastUpdated: Date.now(),
    marketCap: 0,
  }));
};

export const getMultiplePrices = async (
  ...[mints, ...args]: Parameters<Client["getMultiplePrices"]>
): Promise<MultiPriceResponse> => {
  const prices = await cacheResult(
    async (mints) => {
      const unloaded: string[] = [];

      const prices = await solanatracker
        .getMultiplePrices(mints, ...args)
        .then((value) =>
          Object.entries(value).map(([key, price]) => {
            if (price.price <= 0) unloaded.push(key);

            return {
              id: key,
              ...price,
            };
          }),
        );

      if (unloaded.length > 0) prices.push(...(await priceFallback(unloaded)));
      return prices;
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

  if (uncache.length > 0) upserts = await upsertFn(uncache);

  if (upserts) {
    const pipeline = redis.pipeline();
    for (const upsert of upserts)
      pipeline.setex(upsert.id, 60, JSON.stringify(upsert));

    await pipeline.exec();
  }

  return [...(upserts ? upserts : []), ...cacheResults];
};
