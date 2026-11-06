import { useState } from "react";
import {
  IconInfoCircle,
  IconTicket,
  IconUser,
  IconClock,
  IconBus,
  IconCreditCard,
  IconCalendar,
  IconRoute,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { FareCatalogueList } from "./FareCatalogueList";
import { ticketDisplayPrice, ticketInformation } from "@/lib/ticket-info";
import type { FareItem } from "@/lib/fares";

const icons = {
  ticket: IconTicket,
  user: IconUser,
  clock: IconClock,
  bus: IconBus,
  payment: IconCreditCard,
  calendar: IconCalendar,
  route: IconRoute,
};

export function TicketMoreInfo({
  noc,
  item,
  generation,
}: {
  noc: string;
  item: FareItem;
  generation: string;
}) {
  const [routesOpen, setRoutesOpen] = useState(false);
  const rows = ticketInformation(item);
  const needsCheck =
    item.resolution === "unresolved" ||
    !!item.detail?.unresolved_count ||
    !!item.detail?.conditions_truncated;
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="self-start rounded-[14px] bg-card text-xs shadow-sm"
          />
        }
      >
        <IconInfoCircle aria-hidden className="size-3.5" /> More info
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-lg p-0 gap-0 grid-rows-[auto_minmax(0,1fr)]">
        <DialogHeader className="border-b p-6 pr-12">
          <DialogTitle>Ticket information</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-6 space-y-5">
          <div className="rounded-lg bg-muted/50 p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Published price</p>
            <p className="text-lg font-semibold">{ticketDisplayPrice(item)}</p>
            {item.price_basis === "journey" ? (
              <p className="text-sm text-muted-foreground">
                Choose a route, direction and travel date to check the price for
                your journey.
              </p>
            ) : item.price_basis !== "published" ? (
              <p className="text-sm text-muted-foreground">
                The applicable price depends on the ticket conditions. Confirm
                it with the operator.
              </p>
            ) : null}
            {item.prices_truncated ? (
              <p className="text-sm text-muted-foreground">
                Only some published prices are available. Check the complete
                price with the operator.
              </p>
            ) : null}
          </div>
          <dl className="divide-y">
            {rows.map((row) => {
              const Icon = icons[row.icon];
              return (
                <div
                  key={row.label}
                  className="flex gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon aria-hidden className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="text-sm wrap-anywhere">
                      <p className="font-medium">{row.value}</p>
                      {row.description ? (
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          {row.description}
                        </p>
                      ) : null}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
          {needsCheck ? (
            <div
              role="status"
              className="flex gap-3 rounded-lg border p-3 text-sm"
            >
              <IconAlertTriangle
                aria-hidden
                className="size-5 shrink-0 text-muted-foreground"
              />
              <p>
                Some published restrictions could not be fully resolved. Check
                with the operator before travelling.
              </p>
            </div>
          ) : null}
          {item.price_basis === "journey" || item.line_refs?.length ? (
            <details
              open={routesOpen}
              onToggle={(event) => setRoutesOpen(event.currentTarget.open)}
            >
              <summary className="cursor-pointer text-sm font-medium">
                Routes and journey prices
              </summary>
              <div className="mt-3 space-y-3">
                {item.journey_support?.status === "partial_or_unresolved" ? (
                  <p className="text-sm text-muted-foreground">
                    Published prices are available for only some journeys. If
                    your journey is missing, check with the operator.
                  </p>
                ) : null}
                {routesOpen ? (
                  <FareCatalogueList
                    compact
                    request={{
                      noc,
                      action: "ticketRoutes",
                      id: item.id,
                      generation,
                    }}
                  />
                ) : null}
              </div>
            </details>
          ) : null}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Published ticket conditions and exclusions apply. Confirm
            eligibility and travel restrictions with the operator if you’re
            unsure.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
