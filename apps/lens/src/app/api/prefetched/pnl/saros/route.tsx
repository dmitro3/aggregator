import path from "path";
import { format } from "util";
import { readFileSync } from "fs";
import { ImageResponse } from "@vercel/og";
import type { NextRequest } from "next/server";

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
        background:
          "linear-gradient(120deg, #432da9, #6542ff, #4ca8d2, #40d866)",
      }}
    >
      <img
        src={format("%s/loss-asset.png", origin)}
        alt="footer"
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
            $4.18
          </Text>
        </div>
        <Text
          as="h1"
          style={{
            fontSize: 128,
            fontFamily: "gobold",
            textShadow: "0 4px 0 rgb(0, 0, 0)",
          }}
        >
          19.02%
        </Text>
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
            ZDLT-SOL
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
              20:34:07
            </Text>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Text>TVL</Text>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                fontFamily: "montserrat",
              }}
            >
              $26.2
            </Text>
          </div>
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
            path.join(process.cwd(), "src/assets/fonts/Montserrat-Regular.ttf"),
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
};
