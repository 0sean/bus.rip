import { Link } from "@tanstack/react-router";
import {
  IconChevronRight,
  IconArrowLeft,
  IconArrowRight,
  IconArrowsLeftRight,
  IconBus,
} from "@tabler/icons-react";
import { fareRouteDirections } from "@/lib/fare-route";
import type { FareItem } from "@/lib/fares";

export function FareRouteCard({
  item,
  noc,
  generation,
  title,
}: {
  item: FareItem;
  noc: string;
  generation: string;
  title?: string;
}) {
  const directions = fareRouteDirections(item);
  const heading =
    title ||
    item.name.replace(/\s+(?:inbound|outbound)$/i, "").trim() ||
    item.name;
  return (
    <Link
      to="/fares/$nocCode/$fare"
      params={{ nocCode: noc, fare: item.id }}
      search={{ generation }}
      className="group flex min-w-0 flex-col rounded-[14px] bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 p-4 min-h-[70px]">
        <span className="flex min-w-8 h-8 shrink-0 items-center justify-center rounded-[10px] bg-neutral-100 dark:bg-neutral-800 px-2 text-base font-semibold">
          {item.line || <IconBus aria-label="Bus route" className="size-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-5 wrap-anywhere">
            {heading}
          </h3>
        </div>
        <IconChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
        />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
        {directions.length ? (
          directions.map((direction) => {
            const Icon =
              direction === "inbound" ? IconArrowLeft : IconArrowRight;
            return (
              <span key={direction} className="flex items-center gap-1">
                <Icon aria-hidden className="size-4" />
                {direction === "inbound" ? "Inbound" : "Outbound"}
              </span>
            );
          })
        ) : (
          <span className="flex items-center gap-1">
            <IconArrowsLeftRight aria-hidden className="size-4" />
            Direction not supplied
          </span>
        )}
      </div>
    </Link>
  );
}
