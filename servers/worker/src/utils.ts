import xior from "xior";
import { format } from "util";

import { redis, solanatracker } from "./instances";

export const priceFallback = async (mints: string[]) => {
  const response = await xior.get<{ prices: Record<string, number> }>(
    format(
      "https://fe-api.jup.ag/api/v1/prices?list_address=%s",
      mints.join(","),
    ),
  );
  return Object.entries(response.data.prices).map(([key, price]) => ({
    id: key,
    price,
    lastUpdated: Date.now(),
  }));
};

export const getMultiplePrices = async (
  mints: string[],
): Promise<Record<string, { price: number }>> => {
  const prices = await cacheResult(
    async (mints) => {
      const prices: { id: string; price: number }[] = await priceFallback(
        mints,
      ).catch(() => []);
      const unloaded: string[] =
        prices.length > 0
          ? prices.filter((price) => price.price <= 0).map((price) => price.id)
          : mints;

      if (unloaded.length > 0)
        prices.push(
          ...(await solanatracker.getMultiplePrices(unloaded).then((value) =>
            Object.entries(value).map(([key, price]) => ({
              id: key,
              ...price,
            })),
          )),
        );

      return prices;
    },
    ...mints,
  );
  return Object.fromEntries(
    prices.map((price) => [price.id, { price: price.price }]),
  );
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
