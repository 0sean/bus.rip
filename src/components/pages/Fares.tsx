import { useState } from "react";
import { FareCatalogueList } from "./FareCatalogueList";
import { Button } from "../ui/button";
export default function Fares({ noc }: { noc: string }) {
  const [category, setCategory] = useState<"areas" | "families" | "routes">(
    "areas",
  );
  return (
    <main className="flex flex-col gap-6">
      <h1 className="sr-only">Fares</h1>
      <div className="rounded-[14px] border bg-muted/30 p-6 sm:p-10">
        <h2 className="text-xl font-semibold">Find your ticket</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Choose a ticket area to browse its tickets and published stops, or
          find single and return fares for your journey.
        </p>
      </div>
      <div className="flex gap-2 flex-wrap" aria-label="Fare categories">
        {(
          [
            ["areas", "Ticket areas"],
            ["families", "Tickets"],
            ["routes", "Journey fares"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant={category === value ? "default" : "outline"}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      {category === "families" ? (
        <p className="text-sm text-muted-foreground">
          Ticket types group similar names for browsing. Passenger, duration,
          route and sales conditions can differ between variants.
        </p>
      ) : null}
      <FareCatalogueList key={category} request={{ noc, action: category }} />
      <p className="text-xs text-muted-foreground">
        Published fares from Bus Open Data Service. Availability and prices
        depend on the journey and ticket conditions. Coverage loads when you
        select an area.
      </p>
    </main>
  );
}
