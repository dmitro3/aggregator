"use client";

import type z from "zod";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "../trpc.client";

import Search from "../components/Search";
import Filter from "../components/Filter";
import Header from "../components/Header";
import PoolCard from "../components/PoolCard";

import type { pairFilterSchema, pairOrderBySchema } from "@rhiva-ag/trpc";

export default function HomePage() {
  const trpc = useTRPC();
  const [args, setArgs] = useState<{
    filter?: Partial<z.infer<typeof pairFilterSchema>>;
    orderBy?: z.infer<typeof pairOrderBySchema>;
  }>();
  const { data, isPending } = useQuery(
    trpc.pair.aggregrate.queryOptions({
      ...args,
      filter: {
        market: "saros",
        ...args?.filter,
      },
    }),
  );

  return (
    <div className="flex-1 flex flex-col">
      <Header />
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
          <div className="flex-1 flex flex-col gap-y-4 md:flex-row md:flex-wrap md:gap-4 md:justify-center">
            {isPending && (
              <div className="m-auto size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            {data?.map((pair) => (
              <PoolCard
                key={pair.id}
                pair={pair}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
