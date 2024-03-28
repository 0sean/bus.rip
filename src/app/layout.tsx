import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

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
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} bg-zinc-950 dark h-full`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
