import type { ReactNode } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { BackWatcher } from "@/components/Back";
import globals from "@/styles/globals.css?url";
import mapCss from "@/styles/map.css?url";
import fontCss from "@/styles/fonts.css?url";
import fontFile from "@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "bus.rip" },
        { name: "description", content: "it's probably not coming" },
        { name: "theme-color", content: "#09090b" },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://bus.rip" },
        { property: "og:title", content: "bus.rip" },
        { property: "og:description", content: "it's probably not coming" },
      ],
      links: [
        { rel: "stylesheet", href: globals },
        { rel: "stylesheet", href: mapCss },
        { rel: "stylesheet", href: fontCss },
        {
          rel: "preload",
          href: fontFile,
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
      ],
    }),
    shellComponent: RootDocument,
    component: () => (
      <BackWatcher>
        <Outlet />
      </BackWatcher>
    ),
  },
);

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="min-h-svh">
      <head>
        <HeadContent />
      </head>
      <body className="bg-linear-to-tr from-zinc-950 to-zinc-900 dark !min-h-svh !pointer-events-auto font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
