import path from "path";
import moment from "moment";
import { format } from "util";
import { readFileSync } from "fs";
import type { z } from "zod/mini";
import { ImageResponse } from "@vercel/og";
import type { pnlSchema } from "@rhiva-ag/trpc";
import { NextResponse, type NextRequest } from "next/server";

import Decimal from "../../../../../components/Decimal";

const Text = <T extends React.ElementType>({
  children,
  as = "p",
  ...props
}: React.ComponentProps<T> & React.PropsWithChildren & { as?: T }) => {
  const As = as;
  return (
    <As
      {...props}
      style={{ fontFamily: "montserrat", ...props.style, margin: 0 }}
    >
      {children}
    </As>
  );
};

export const GET = async (request: NextRequest) => {
  const { searchParams, origin } = new URL(request.url);
  const data = searchParams.get("data");

  if (data) {
    const pnl = JSON.parse(decodeURIComponent(data)) as z.infer<
      typeof pnlSchema
    >;
    const duration = moment(pnl.duration);
    const time = format(
      "%s:%s:%s",
      String(Math.floor(duration.hours())).padStart(2, "0"),
      String(duration.minutes()).padStart(2, "0"),
      String(duration.seconds()).padStart(2, "0"),
    );

    const profit = pnl.pnl > 0;

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: 1000,
          height: 512,
          position: "relative",
          padding: "0 64px",
          alignItems: "center",
          color: "white",
          background: profit
            ? "linear-gradient(120deg, #432da9, #6542ff, #4ca8d2, #40d866)"
            : "linear-gradient(to top right, red, transparent 40%), linear-gradient(120deg, #432da9, #6542ff, #4ca8d2, #40d866)",
        }}
      >
        {/**  biome-ignore lint: lint/performance/noImgElement using <img> intentionally  */}
        <img
          src={format(
            "%s/%s",
            origin,
            profit ? "/profit-asset.png" : "/loss-asset.png",
          )}
          alt="Illustration"
          style={{
            position: "absolute",
            objectFit: "contain",
            right: 0,
            bottom: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            rowGap: 8,
          }}
        >
          {pnl.delta && (
            <div
              style={{
                display: "flex",
                columnGap: 4,
                alignItems: "center",
              }}
            >
              <Text>PNL</Text>
              <Text
                as="h1"
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                }}
              >
                <Decimal
                  value={pnl.delta}
                  leading="$"
                  showPositiveSign
                  truncateStyle={{ fontSize: 16 }}
                />
              </Text>
            </div>
          )}
          <Text
            as={Decimal}
            end="%"
            value={pnl.pnl}
            showPositiveSign
            style={{
              color: profit ? "white" : "red",
              fontSize: 72,
              fontFamily: "gobold",
              textShadow: "0 4px 0 rgb(0, 0, 0)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Text>DLMM POOL</Text>
            <Text
              as="h2"
              style={{
                fontSize: 48,
                fontWeight: "bold",
                fontFamily: "montserrat",
              }}
            >
              {pnl.name}
            </Text>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              columnGap: 64,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Text>TIME</Text>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                }}
              >
                {time}
              </Text>
            </div>
            {pnl.tvl && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Text>TVL</Text>
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    fontFamily: "montserrat",
                  }}
                >
                  <Decimal
                    leading="$"
                    value={pnl.tvl}
                  />
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>,
      {
        width: 1000,
        height: 512,
        fonts: [
          {
            name: "gobold",
            data: readFileSync(
              path.join(process.cwd(), "src/assets/fonts/Gobold.otf"),
            ),
            weight: 700,
          },
          {
            name: "montserrat",
            data: readFileSync(
              path.join(
                process.cwd(),
                "src/assets/fonts/Montserrat-Regular.ttf",
              ),
            ),
            weight: 400,
          },
          {
            name: "montserrat",
            data: readFileSync(
              path.join(
                process.cwd(),
                "src/assets/fonts/Montserrat-SemiBold.ttf",
              ),
            ),
            weight: 600,
          },
          {
            name: "montserrat",
            data: readFileSync(
              path.join(process.cwd(), "src/assets/fonts/Montserrat-Bold.ttf"),
            ),
            weight: 700,
          },
        ],
      },
    );
  } else return NextResponse.error();
};
