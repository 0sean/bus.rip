import type { NocLine } from "@/db/schema";
import type { ReactNode } from "react";
import { Header } from "./Header";
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
      <Header operatorName={operator.publicName} className="mb-6" />
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
