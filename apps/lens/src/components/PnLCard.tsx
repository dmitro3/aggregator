import clsx from "clsx";
import moment from "moment";
import { format } from "util";
import Image from "next/image";
import type { z } from "zod/mini";
import LocalFont from "next/font/local";
import { Montserrat } from "next/font/google";
import type { pnlSchema } from "@rhiva-ag/trpc";

import Decimal from "./Decimal";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const goBold = LocalFont({
  src: "../assets/fonts/Gobold.otf",
});

export default function PnLCard({ pnl }: { pnl: z.infer<typeof pnlSchema> }) {
  const delta = pnl.closeAmount - pnl.openAmount;
  const duration = moment(pnl.duration);
  const time = format(
    "%s:%s:%s",
    String(Math.floor(duration.hours())).padStart(2, "0"),
    String(duration.minutes()).padStart(2, "0"),
    String(duration.seconds()).padStart(2, "0"),
  );

  return (
    <div className="relative flex items-center card-profit-bg px-4 h-[200px] rounded-md">
      <Image
        alt="illustration"
        width={1400}
        height={1400}
        className="absolute right-0 bottom-0"
        src={delta > 0 ? "/profit-asset.svg" : "/loss-asset.svg"}
      />
      <div className={clsx("flex flex-col space-y-1", montserrat.className)}>
        <div className="flex flex-row space-x-2 items-center">
          <p className="text-xs">PNL</p>
          <h1 className="text-lg font-bold">
            $<Decimal value={delta} />
          </h1>
        </div>
        <Decimal
          end="%"
          value={pnl.pnl}
          className={clsx("text-3xl text-outline", goBold.className)}
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
          <div>
            <p className="text-xs">TVL</p>
            <h4 className="font-semibold">
              $<Decimal value={pnl.tvl} />
            </h4>
          </div>
        </div>
      </div>
    </div>
  );
}
