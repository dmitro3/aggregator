"use client";

import type z from "zod";
import { useCallback, useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type {
  pairAggregateSchema,
  pairFilterSchema,
  pairOrderBySchema,
} from "@rhiva-ag/trpc";

import Search from "./Search";
import Filter from "./Filter";
import PoolCard from "./PoolCard";
import { useTRPC, useTRPCClient } from "../trpc.client";
import InfiniteScroll from "react-infinite-scroll-component";

type PoolListProps = {
  limit: number;
  pools?: z.infer<typeof pairAggregateSchema>[];
};

export default function PoolList({ pools, limit }: PoolListProps) {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const [args, setArgs] = useState<{
    filter?: Partial<z.infer<typeof pairFilterSchema>>;
    orderBy?: z.infer<typeof pairOrderBySchema>;
  }>();

  const fetch = useCallback(
    async ({ pageParam = 0 }) => {
      const pools = await trpcClient.pair.aggregrate.query({
        ...args,
        limit,
        offset: pageParam,
        filter: {
          market: { eq: "saros" },
          ...args?.filter,
        },
      });

      return {
        items: pools,
        nextOffset: pools.length === limit ? pageParam + limit : undefined,
      };
    },
    [args, limit, trpcClient],
  );

  const { data, fetchNextPage, refetch, hasNextPage } = useInfiniteQuery({
    initialData: pools
      ? {
          pages: [
            {
              items: pools,
              nextOffset: pools?.length === limit ? limit : undefined,
            },
          ],
          pageParams: [0],
        }
      : undefined,
    queryFn: fetch,
    initialPageParam: 0,
    queryKey: trpc.pair.aggregrate.queryKey(),
    getNextPageParam: (page) => page.nextOffset,
  });

  const allPages = useMemo(
    () => data.pages.flatMap((page) => page.items),
    [data.pages],
  );

  return (
    <section className="flex-1 flex flex-col space-y-4 p-4 md:px-8 2xl:px-16">
      <div className="flex flex-col space-y-4">
        <Search
          onSearchAction={(value) => {
            setArgs((args) => {
              return {
                ...args,
                search: { name: { ilike: value }, id: { ilike: value } },
              };
            });
          }}
        />
        <Filter
          onChangeAction={(filter, orderBy) => {
            setArgs((args) => {
              return { ...args, filter, orderBy };
            });
          }}
        />
      </div>

      <div className="flex-1 flex flex-col space-y-2">
        <InfiniteScroll
          pullDownToRefresh
          dataLength={allPages.length}
          hasMore={hasNextPage}
          next={fetchNextPage}
          refreshFunction={refetch}
          loader={
            <div className="m-auto size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          }
          className="flex-1 flex flex-col gap-y-4 md:flex-row md:flex-wrap md:gap-4 md:justify-center"
        >
          {allPages.map((pair) => (
            <PoolCard
              key={pair.id}
              pair={pair}
            />
          ))}
        </InfiniteScroll>
      </div>
    </section>
  );
}
