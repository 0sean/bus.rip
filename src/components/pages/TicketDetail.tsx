import { lazy, Suspense } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  IconArrowLeft,
  IconCash,
  IconUser,
  IconBus,
} from "@tabler/icons-react";
import { ticketCoverageOptions, stopsOptions } from "@/data/queries";
import type { FareItem, FarePage } from "@/lib/fares";
import {
  ticketDisplayPrice,
  ticketPassengers,
  ticketSales,
  ticketAvailability,
  ticketDuration,
} from "@/lib/ticket-info";
import { FareCard, FareError } from "./FareCatalogueList";
import { TicketMoreInfo } from "./TicketMoreInfo";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import { Button } from "../ui/button";

const FareMap = lazy(() => import("../map/FareMap"));

export default function TicketDetail({
  noc,
  detail,
}: {
  noc: string;
  detail: FarePage<FareItem>;
}) {
  const { data: item, generation } = detail;
  const coverage = useQuery(ticketCoverageOptions(noc, item.id, generation));
  const locations = useQuery(stopsOptions(noc));
  const areas = coverage.data?.data.areas ?? [];
  const duration = ticketDuration(item);
  const summary = [
    { Icon: IconCash, label: "Price", value: ticketDisplayPrice(item) },
    { Icon: IconUser, label: "Passengers", value: ticketPassengers(item) },
    { Icon: IconBus, label: "Where to buy", value: ticketSales(item) },
  ].filter((entry) => entry.value);
  return (
    <main className="fare-zone-page">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] gap-4 items-start">
        <section aria-label="Ticket coverage" className="relative min-w-0">
          {coverage.isPending || locations.isPending ? (
            <FareMapPlaceholder tall />
          ) : coverage.error ? (
            <div className="h-[var(--fare-zone-map-height)] rounded-[14px] border bg-muted/30" />
          ) : (
            <ClientOnly fallback={<FareMapPlaceholder tall />}>
              <Suspense fallback={<FareMapPlaceholder tall />}>
                <FareMap
                  noc={noc}
                  generation={generation}
                  zones={coverage.data?.data.zones ?? []}
                  stops={locations.data ?? []}
                  unavailable={!!locations.error}
                  tall
                  topInset={180}
                />
              </Suspense>
            </ClientOnly>
          )}
          <div className="absolute left-3 top-3 flex max-w-[calc(100%-5rem)] flex-col gap-2">
            <div className="overflow-hidden rounded-[14px] bg-card shadow-sm ring-1 ring-foreground/10">
              <div className="space-y-1 p-4">
                <div className="flex items-start gap-2">
                  <Link
                    to="/fares/$nocCode"
                    params={{ nocCode: noc }}
                    aria-label="All fares"
                    className="mt-0.5 shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <IconArrowLeft aria-hidden className="size-4" />
                  </Link>
                  <h1 className="text-sm font-medium wrap-anywhere">
                    {item.name}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {summary.map(({ Icon, label, value }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1"
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      <span className="sr-only">{label}: </span>
                      {value}
                    </span>
                  ))}
                </div>
              </div>
              <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                {duration
                  ? /^\d/.test(duration)
                    ? `Valid for ${duration}`
                    : duration
                  : ticketAvailability(item)}
              </p>
            </div>
            <TicketMoreInfo noc={noc} item={item} generation={generation} />
          </div>
          {coverage.error ? (
            <div className="absolute left-3 right-3 bottom-3 rounded-[14px] bg-background">
              <FareError
                error={coverage.error}
                noc={noc}
                retry={() => void coverage.refetch()}
              />
            </div>
          ) : null}
          {locations.error ? (
            <Button
              variant="outline"
              className="absolute left-3 bottom-20"
              onClick={() => void locations.refetch()}
            >
              Retry stop locations
            </Button>
          ) : null}
        </section>
        <section
          aria-label="Ticket areas"
          className="min-w-0 p-px lg:max-h-[var(--fare-zone-map-height)] lg:overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30"
        >
          <h2 className="sr-only">Ticket areas</h2>
          {coverage.isPending ? (
            <p role="status" className="text-sm text-muted-foreground p-4">
              Loading ticket areas…
            </p>
          ) : coverage.error ? (
            <p className="text-sm text-muted-foreground p-4">
              Ticket areas are temporarily unavailable. You can still view the
              ticket information.
            </p>
          ) : areas.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {areas.map((area) => (
                <FareCard
                  key={area.id}
                  item={area}
                  noc={noc}
                  generation={generation}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground p-4">
              No ticket areas are published for this ticket. Check More info for
              service restrictions and journey prices.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
