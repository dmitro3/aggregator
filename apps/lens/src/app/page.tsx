"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "../trpc.client";

import Search from "../components/Search";
import Filter from "../components/Filter";
import Header from "../components/Header";
import PoolCard from "../components/PoolCard";

export default function HomePage() {
  const trpc = useTRPC();
  const { data, isPending } = useQuery(trpc.pair.aggregrate.queryOptions());

  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <section className="flex-1 flex flex-col space-y-4 p-4 md:px-8 2xl:px-16">
        <div className="flex flex-col space-y-4">
          <Search />
          <Filter />
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
