import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import { type FareItem, type FarePage } from "@/lib/fares";
import { FareCatalogueList } from "./FareCatalogueList";
import FareJourney from "./FareJourney";
import TicketDetail from "./TicketDetail";
import { FareCoverage } from "./FareCoverage";

export default function FareDetail({
  noc,
  detail,
}: {
  noc: string;
  detail: FarePage<FareItem>;
}) {
  const { data: item, generation } = detail;
  if (item.kind === "ticket") return <TicketDetail noc={noc} detail={detail} />;
  if (item.kind === "route")
    return (
      <FareJourney
        key={item.id}
        noc={noc}
        route={item}
        generation={generation}
      />
    );
  if (item.kind === "area")
    return (
      <main className="fare-zone-page">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] gap-4 items-start">
          <FareCoverage
            key={item.id}
            noc={noc}
            item={item}
            generation={generation}
            presentation="zone"
          />
          <section
            aria-label="Tickets in this area"
            className="min-w-0 p-px lg:max-h-[var(--fare-zone-map-height)] lg:overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30"
          >
            <h2 className="sr-only">Tickets in this area</h2>
            <FareCatalogueList
              request={{ noc, action: "areaTickets", id: item.id, generation }}
              presentation="zone"
            />
          </section>
        </div>
      </main>
    );
  return (
    <main className="flex flex-col gap-6">
      <Link
        to="/fares/$nocCode"
        params={{ nocCode: noc }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start"
      >
        <IconArrowLeft aria-hidden className="size-4" />
        All fares
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {item.kind === "family"
            ? "Choose a variant to check passenger, duration and sales conditions"
            : "Published ticket"}
        </p>
      </div>
      {item.kind === "family" ? (
        <FareCatalogueList
          request={{ noc, action: "familyTickets", id: item.id, generation }}
        />
      ) : (
        <FareCoverage
          key={item.id}
          noc={noc}
          item={item}
          generation={generation}
        />
      )}
    </main>
  );
}
