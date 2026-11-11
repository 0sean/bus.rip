import { lazy, Suspense } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { fareCoverageOptions, stopsOptions } from "@/data/queries";
import { FareApiError, type FareItem } from "@/lib/fares";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import { Button } from "../ui/button";
import { FareError } from "./FareCatalogueList";

const FareMap = lazy(() => import("../map/FareMap"));

export function FareCoverage({
  noc,
  item,
  generation,
  presentation = "default",
}: {
  noc: string;
  item: FareItem;
  generation: string;
  presentation?: "default" | "zone";
}) {
  const zonePage = presentation === "zone";
  const membership = useQuery(fareCoverageOptions(noc, item.id, generation));
  // Start coordinates alongside membership; share the operator-wide timetable
  // cache across area selections. Neither request blocks the ticket catalogue.
  const locations = useQuery(stopsOptions(noc));
  const expired =
    membership.error instanceof FareApiError &&
    [404, 409, 410].includes(membership.error.status);
  const stops = expired ? [] : (membership.data?.data ?? []);

  return (
    <section
      className="flex flex-col gap-3 min-w-0"
      aria-label="Published coverage"
    >
      {!zonePage ? (
        <h2 className="font-semibold">Ticket area coverage</h2>
      ) : null}
      {membership.error ? (
        <FareError
          error={membership.error}
          noc={noc}
          retry={() => void membership.refetch()}
        />
      ) : null}
      <div className="relative min-w-0">
        {!expired ? (
          membership.isPending || locations.isPending ? (
            <FareMapPlaceholder tall={zonePage} />
          ) : (
            <ClientOnly fallback={<FareMapPlaceholder tall={zonePage} />}>
              <Suspense fallback={<FareMapPlaceholder tall={zonePage} />}>
                <FareMap
                  noc={noc}
                  generation={generation}
                  zones={[
                    {
                      id: item.id,
                      name: item.name,
                      stops: stops.map((stop) => stop.code),
                      membershipComplete:
                        !membership.isPending &&
                        !membership.error &&
                        item.membership === "published_stops",
                    },
                  ]}
                  stops={locations.data ?? []}
                  unavailable={!!locations.error || !!membership.error}
                  tall={zonePage}
                />
              </Suspense>
            </ClientOnly>
          )
        ) : null}
        {zonePage ? (
          <div
            className={`${expired ? "relative" : "absolute left-3 top-3"} max-w-[calc(100%-5rem)] rounded-[14px] bg-card p-4 shadow-sm ring-1 ring-foreground/10`}
          >
            <div className="flex items-center gap-2">
              <Link
                to="/fares/$nocCode"
                params={{ nocCode: noc }}
                aria-label="All fares"
                className="shrink-0 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <IconArrowLeft aria-hidden className="size-4" />
              </Link>
              <h1 className="text-sm font-medium wrap-anywhere">{item.name}</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {item.stop_count ?? 0} published stops · {item.ticket_count}{" "}
              ticket {item.ticket_count === 1 ? "variant" : "variants"}
            </p>
          </div>
        ) : null}
      </div>
      <p className={zonePage ? "sr-only" : "text-xs text-muted-foreground"}>
        {item.membership === "incomplete"
          ? "Published coverage is incomplete. "
          : ""}
        {membership.isPending
          ? "Loading published stops. "
          : expired || !membership.data
            ? ""
            : `${stops.length} published stops. `}
        Shaded coverage is estimated from published stops with matching
        locations, not an official ticket boundary. Ticket conditions and
        exclusions apply.
      </p>
      {locations.error ? (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => void locations.refetch()}
        >
          Retry stop locations
        </Button>
      ) : null}
    </section>
  );
}
