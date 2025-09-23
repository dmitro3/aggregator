import type Redis from "ioredis";

// Todo: fix not unique when batching
export const buildFnCache =
  (options: { redis: Redis; duration: number }) =>
  <T extends (...args: any[]) => Promise<object> | Promise<void>>(fn: T) => {
    return (uniqueKey: string) =>
      async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
        const fnCachedReturnValue = await options.redis.get(uniqueKey);

        if (fnCachedReturnValue) return JSON.parse(fnCachedReturnValue);

        const result = await fn(...args);
        if (result)
          await options.redis.setex(
            uniqueKey,
            options.duration,
            JSON.stringify(result),
          );
        return result as Awaited<ReturnType<T>>;
      };
  };
