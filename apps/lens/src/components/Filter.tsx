"use client";
import { useState } from "react";
import GeneratePnLModal from "./GeneratePnLModal";

export default function Filter() {
  return (
    <section className="flex flex-col space-y-4">
      <div className="flex lt-md:flex-col lt-md:space-y-2 md:gap-x-8 md:gap-y-2 md:items-center md:flex-wrap">
        <Top100Filter />
        <SortByFilter />
        <TVLFilter />
      </div>
      <FieldFilter />
    </section>
  );
}

function Top100Filter() {
  const top100Labels = [
    { label: "Show All" },
    { label: "Fees>=1%" },
    { label: "Fees>=2%" },
    { label: "Fees>=5%" },
  ];
  return (
    <div className="flex flex-col space-y-2">
      <p>Top 100 Pools by Today's Fees</p>
      <div className="flex flex-wrap space-x-2 md:space-x-4 md:gap-y-2 md:flex-nowrap">
        {top100Labels.map(({ label }) => (
          <button
            key={label}
            type="button"
            className="flex-1  bg-gray/10 text-white/50 px-2 py-1 rounded-md lt-md:max-w-24 md:min-w-32"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SortByFilter() {
  const feesLabels = [
    { label: "5M" },
    { label: "1H" },
    { label: "6H" },
    { label: "24H" },
  ];
  return (
    <div className="flex flex-col space-y-2">
      <p>Sort By Fees</p>
      <div className="flex space-x-2 md:space-x-4 lt-md:flex-wrap md:gap-y-2">
        {feesLabels.map(({ label }) => (
          <button
            key={label}
            type="button"
            className="flex-1 bg-gray/10 text-white/50 px-2 py-1 rounded-md lt-md:max-w-24 md:min-w-32"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TVLFilter() {
  return (
    <div className="flex flex-col space-y-2 [&_input]:bg-gray/10 [&_input]:px-2 [&_input]:py-1 [&_input]:border-1 [&_input]:border-transparent [&_input]:rounded-md [&_input]:placeholder-white/50 [&_input]:outline-none focus:[&_input]:border-primary">
      <p>Filter by min to max TVL</p>
      <div className="flex  gap-2 lt-md:grid lt-md:grid-cols-2 lt-md:flex-wrap md:gap-x-4">
        <input
          placeholder="Min Liquidity"
          className="md:min-w-32"
        />
        <input
          placeholder="Max Liquidity"
          className="md:min-w-32"
        />
      </div>
    </div>
  );
}

function FieldFilter() {
  const [showGeneratePnLModal, setShowGeneratePnLModal] = useState(false);

  return (
    <>
      <div className="flex [&_input]:bg-gray/10 [&_input]:p-2 [&_input]:border-1 [&_input]:border-transparent [&_input]:rounded-md [&_input]:placeholder-white/50 [&_input]:outline-none focus:[&_input]:border-primary lt-md:flex-col lt-md:space-y-4 md:items-end">
        <div className="flex-1 flex flex-col space-y-2">
          <p>Pool Filter</p>
          <div className="flex flex-wrap gap-2 lt-md:grid lt-md:grid-cols-3 md:gap-x-4">
            <input placeholder="Min Bin Step" />
            <input placeholder="Max Bin Step" />
            <input placeholder="Min Base Fee" />
            <input placeholder="Max Base Fee" />
            <input placeholder="Min TVL" />
            <input placeholder="Max TVL" />
          </div>
        </div>
        <div className="flex gap-x-2 md:gap-x-4">
          <button
            type="button"
            onClick={() => setShowGeneratePnLModal(true)}
            className="flex-1 bg-primary text-black px-4 py-3 rounded-md text-nowrap"
          >
            Generate PnL
          </button>
          <button
            type="button"
            className="flex-1 border border-primary text-primary px-4 py-3 rounded-md text-nowrap"
          >
            Track Positions
          </button>
        </div>
      </div>
      <GeneratePnLModal
        open={showGeneratePnLModal}
        onClose={() => setShowGeneratePnLModal(false)}
      />
    </>
  );
}
