import { useState } from "react";
import { FareCatalogueList } from "./FareCatalogueList";
import { Button } from "../ui/button";
import { FareOverviewMap } from "./FareOverviewMap";
export default function Fares({ noc }: { noc: string }) {
  const [category, setCategory] = useState<"areas" | "families" | "routes">(
    "areas",
  );
  return (
    <main className="flex flex-col gap-6">
      <h1 className="sr-only">Fares</h1>
      <FareOverviewMap noc={noc} />
      <FareCatalogueList
        key={category}
        request={{ noc, action: category }}
        toolbarStart={
          <div
            className="flex gap-2 flex-wrap shrink-0"
            aria-label="Fare categories"
          >
            {(
              [
                ["areas", "Ticket areas"],
                ["families", "Tickets"],
                ["routes", "Journey fares"],
              ] as const
            ).map(([value, label]) => (
              <Button
                className="rounded-[10px]"
                key={value}
                variant={category === value ? "default" : "outline"}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        }
      />
    </main>
  );
}
