import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import "./map.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const instrumentSans = Instrument_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "bus.rip",
  description: "it's probably not coming",

  openGraph: {
    type: "website",
    url: "https://bus.rip",
    title: "bus.rip",
    description: "it's probably not coming",
  },

  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-svh">
      <body
        className={`${instrumentSans.className} bg-linear-to-tr from-zinc-950 to-zinc-900 dark !h-svh !pointer-events-auto`}
      >
        {children}
        {modal}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

export const viewport = {
  themeColor: "#09090b",
};
