import type { NocLine } from "@/db/schema";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { IconHelpCircle } from "@tabler/icons-react";
import { Navbar } from "./Navbar";
export default function InfoLayout({
  children,
  operator,
}: {
  children: ReactNode;
  operator: NocLine;
}) {
  return (
    <div className="safe-area-page min-h-svh pb-[calc(6rem+var(--safe-area-bottom))]!">
      <header className="flex justify-between gap-4 items-center mb-6 min-h-[35px]">
        <div className="flex gap-3 items-center min-w-0">
          <Link
            to="/"
            aria-label="Choose an operator"
            className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src="/logo.svg"
              alt="bus.rip"
              width={32}
              height={35}
              className="h-[35px] w-8 invert dark:invert-0"
            />
          </Link>
          <p className="text-xs font-medium text-muted-foreground truncate">
            {operator.publicName}
          </p>
        </div>
        <span className="hidden sm:flex gap-2 items-center text-xs font-semibold text-muted-foreground">
          Bus info that actually works{" "}
          <IconHelpCircle aria-hidden className="size-4" />
        </span>
      </header>
      {children}
      <nav
        aria-label="Operator navigation"
        className="map-navigation fixed bottom-0 inset-x-0 z-10 pointer-events-none"
      >
        <Navbar />
      </nav>
    </div>
  );
}
