import clsx from "clsx";
import "@unocss/reset/tailwind.css";
import type { Metadata } from "next";
import { Space_Mono, IBM_Plex_Mono } from "next/font/google";
import "./global.css";
import Provider from "../providers";

const defaultFont = Space_Mono({
  variable: "--font-default",
  weight: ["400", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html
      className={clsx(defaultFont.variable, mono.variable)}
      lang="en"
    >
      <body className="absolute inset-0 flex flex-col bg-dark text-white lt-md:text-sm font-[var(--font-default)]">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
