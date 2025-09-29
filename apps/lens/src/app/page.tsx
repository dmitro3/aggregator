import { trpcClient } from "../trpc.server";
import Header from "../components/Header";
import PoolList from "../components/PoolList";

export default async function HomePage() {
  const pools = await trpcClient.pair.aggregrate.query({
    filter: { market: { eq: "saros" } },
  });
  return (
    <div className="flex-1 flex flex-col">
      <Header />
      <PoolList
        pools={pools}
        limit={24}
      />
    </div>
  );
}
