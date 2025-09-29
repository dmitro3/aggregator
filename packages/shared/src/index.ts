import chunk from "lodash.chunk";
import type { Redis } from "ioredis";
import type { PublicKey } from "@solana/web3.js";

export const collectMap = <
  T extends Array<unknown>,
  Fn extends (item: T[number], index: number) => unknown | null,
>(
  collection: T,
  mapFn: Fn,
) => {
  const results = [];
  for (const [index, item] of collection.entries()) {
    const result = mapFn(item, index);
    if (result) results.push(result);
  }

  return results as NonNullable<ReturnType<Fn>>[];
};

export const collectionToMap = <
  T extends Array<unknown>,
  Fn extends (item: T[number], index: number) => unknown | null,
>(
  collection: T,
  getId: Fn,
) => {
  const result = new Map<NonNullable<ReturnType<Fn>>, NonNullable<T[number]>>();
  for (const [index, item] of collection.entries()) {
    const id = getId(item, index);
    if (id)
      result.set(
        id as NonNullable<ReturnType<Fn>>,
        item as NonNullable<T[number]>,
      );
  }

  return result;
};

export function chunkFetchMultipleAccountInfo<
  T extends (publicKey: PublicKey[]) => Promise<any>,
>(fn: T, maxPerRequest: number) {
  return async (args: PublicKey[]) => {
    const chunkedArgs = chunk(args, maxPerRequest);
    const results = await Promise.all(chunkedArgs.map((args) => fn(args)));
    return collectionToMap(
      results.flat() as (NonNullable<Awaited<ReturnType<T>>[number]> & {
        pubkey: PublicKey;
      })[],
      (item, index) => (item ? args[index].toBase58() : null),
    );
  };
}

export const cacheResultFn =
  (redis: Redis, duration: number) =>
  async <U extends { id: string }>(
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
        pipeline.setex(upsert.id, duration, JSON.stringify(upsert));

      await pipeline.exec();
    }

    return [...(upserts ? upserts : []), ...cacheResults];
  };
