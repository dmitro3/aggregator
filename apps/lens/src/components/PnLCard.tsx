import clsx from "clsx";
import moment from "moment";
import { format } from "util";
import Image from "next/image";
import type { z } from "zod/mini";
import LocalFont from "next/font/local";
import { Montserrat } from "next/font/google";
import type { pnlSchema } from "@rhiva-ag/trpc";
import { MdOutlineDownload } from "react-icons/md";

import Decimal from "./Decimal";
import Toggle from "./Toggle";
import { useState } from "react";
import Link from "next/link";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const goBold = LocalFont({
  src: "../assets/fonts/Gobold.otf",
});

export default function PnLCard({ pnl }: { pnl: z.infer<typeof pnlSchema> }) {
  const [hideBalance, setHideBalance] = useState(false);
  const [hideProfit, setHideProfit] = useState(false);

  const duration = moment(pnl.duration);
  const profit = pnl.delta > 0;
  const time = format(
    "%s:%s:%s",
    String(Math.floor(duration.hours())).padStart(2, "0"),
    String(duration.minutes()).padStart(2, "0"),
    String(duration.seconds()).padStart(2, "0"),
  );

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex space-x-4 items-center">
        <div className="flex space-x-2 items-center">
          <p>Hide Balance</p>
          <Toggle
            value={hideBalance}
            onChange={setHideBalance}
          />
        </div>
        <div className="flex space-x-2 items-center">
          <p>Hide Profit</p>
          <Toggle
            value={hideProfit}
            onChange={setHideProfit}
          />
        </div>
      </div>
      <div className="relative flex items-center card-profit-bg px-4 h-[200px] rounded-md">
        <Image
          alt="illustration"
          width={1400}
          height={1400}
          className="absolute right-0 bottom-0"
          src={profit ? "/profit-asset.svg" : "/loss-asset.svg"}
        />
        <div className={clsx("flex flex-col space-y-1", montserrat.className)}>
          {!hideProfit && (
            <div className="flex flex-row space-x-2 items-center">
              <p className="text-xs">PNL</p>
              <h1 className="text-lg font-bold">
                <Decimal
                  value={pnl.delta}
                  leading="$"
                  showPositiveSign
                  truncateStyle={{ fontSize: 8 }}
                />
              </h1>
            </div>
          )}
          <Decimal
            end="%"
            showPositiveSign
            value={pnl.pnl}
            className={clsx(
              "text-3xl text-outline",
              profit ? "text-white" : "text-red-500",
              goBold.className,
            )}
          />

          <div>
            <p className="text-xs">DLMM POOL</p>
            <h1 className="text-lg font-bold">{pnl.name}</h1>
          </div>
          <div className="flex space-x-4">
            <div>
              <p className="text-xs capitalize">Time</p>
              <h4 className="font-semibold">{time}</h4>
            </div>
            {!hideBalance && (
              <div>
                <p className="text-xs">TVL</p>
                <h4 className="font-semibold">
                  <Decimal
                    leading="$"
                    value={pnl.tvl}
                  />
                </h4>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Link
          href={format(
            "/api/prefetched/pnl/saros?data=%s",
            JSON.stringify({
              ...pnl,
              delta: hideProfit ? undefined : pnl.delta,
              tvl: hideBalance ? undefined : pnl.tvl,
            }),
          )}
          target="_blank"
          download
          className="flex space-x-2 items-center bg-primary p-2 text-black rounded"
        >
          <MdOutlineDownload className="text-xl" />
          <span>Download</span>
        </Link>
      </div>
    </div>
  );
}
