export const CATALOGUE_VERSION = "1";
export const fareIdPattern = /^(area|family|ticket|route|point)_[a-f0-9]{64}$/;
export type FareKind = "area" | "family" | "ticket" | "route" | "point";
export type FarePrice = { amount: string; currency: string | null };
export type FarePriceSummary = {
  prices: FarePrice[];
  journeyDependent: boolean;
  conditional: boolean;
  incomplete: boolean;
};
export type FareItem = {
  id: string;
  kind: FareKind;
  name: string;
  revision: number;
  ticket_count: number;
  family_id?: string;
  single_ticket_id?: string;
  variant_count?: number;
  stop_count?: number;
  membership?: string;
  prices?: FarePrice[];
  prices_truncated?: boolean;
  price_summary?: FarePriceSummary;
  price_basis?: string;
  product_type?: string;
  eligibility?: string[];
  sales_channels?: string[];
  duration?: string[];
  duration_rules?: {
    name?: string;
    duration?: string;
    start_time?: string;
    end_time?: string;
  }[];
  valid_from?: string[];
  valid_until?: string[];
  line?: string;
  directions?: string[];
  line_refs?: string[];
  direction_refs?: string[];
  resolution?: string;
  source_count?: number;
  journey_support?: { status: string; resolved_cells: number; cells: number };
  detail?: {
    conditions?: Record<string, string[]>;
    unresolved?: string[];
    unresolved_count?: number;
    lookup_issues?: string[];
    conditions_truncated?: boolean;
  };
};
export type FareStop = { code: string; name: string | null };
export type FareSource = {
  document_id: number;
  anchor: string;
  source_ref: string;
  source_version: string;
  name: string;
  context: unknown;
};
export type FareCandidate = FareItem &
  FarePrice & {
    date: string;
    status: "published_candidate" | "outside_published_validity";
    unresolved_count: number;
  };
export type JourneyFares = {
  status: string;
  candidates: FareCandidate[];
  conditions_evaluated: false;
  unsupported_patterns_possible: boolean;
};
export type FarePage<T> = {
  data: T;
  generation: string;
  version: string;
  nextCursor: string | null;
};
export type FareAction =
  | "areas"
  | "families"
  | "tickets"
  | "routes"
  | "detail"
  | "areaFamilies"
  | "areaTickets"
  | "familyTickets"
  | "ticketAreas"
  | "ticketRoutes"
  | "stops"
  | "sources"
  | "geometry"
  | "origins"
  | "destinations"
  | "journey";
export type FareRequest = {
  noc: string;
  action: FareAction;
  id?: string;
  familyId?: string;
  origin?: string;
  destination?: string;
  date?: string;
  generation?: string;
  expectedGeneration?: string;
  cursor?: string;
  q?: string;
};
export class FareApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "FareApiError";
  }
}
export async function readFareResponse<T>(
  response: Response,
): Promise<FarePage<T>> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new FareApiError(
      response.status,
      body?.error || "Fares are temporarily unavailable. Please try again.",
    );
  }
  return response.json();
}
export function money(amount: string, currency: string | null) {
  if (
    !currency ||
    !/^[A-Z]{3}$/.test(currency) ||
    !Number.isFinite(Number(amount))
  )
    return `${amount}${currency ? ` ${currency}` : " (currency not supplied)"}`;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(amount),
  );
}
// Journey band amounts must never be advertised as a flat ticket price.
export function ticketPrice(item: FareItem) {
  if (item.price_basis === "journey") return "Choose a journey";
  if (item.price_basis !== "published") return "Check ticket conditions";
  return item.prices?.length
    ? item.prices.map((p) => money(p.amount, p.currency)).join(" / ")
    : "Price unavailable";
}

export function summariseFarePrices(tickets: FareItem[]): FarePriceSummary {
  const currencies = new Map<
    string | null,
    { min: FarePrice; max: FarePrice }
  >();
  let incomplete = tickets.length === 0;
  for (const ticket of tickets) {
    incomplete ||= !!ticket.prices_truncated || !ticket.prices?.length;
    for (const price of ticket.prices ?? []) {
      if (
        !/^\d+(?:\.\d+)?$/.test(price.amount) ||
        !Number.isFinite(Number(price.amount))
      ) {
        incomplete = true;
        continue;
      }
      const range = currencies.get(price.currency);
      if (!range) currencies.set(price.currency, { min: price, max: price });
      else {
        if (Number(price.amount) < Number(range.min.amount)) range.min = price;
        if (Number(price.amount) > Number(range.max.amount)) range.max = price;
      }
    }
  }
  return {
    prices: [...currencies.values()].flatMap(({ min, max }) =>
      Number(min.amount) === Number(max.amount) ? [min] : [min, max],
    ),
    journeyDependent: tickets.some(
      (ticket) => ticket.price_basis === "journey",
    ),
    conditional: tickets.some(
      (ticket) => !["published", "journey"].includes(ticket.price_basis ?? ""),
    ),
    incomplete,
  };
}

export function familyPrice(item: FareItem) {
  const summary = item.price_summary;
  if (!summary) return "Price unavailable";
  if (summary.incomplete) return "Prices vary · Check ticket conditions";
  const currencies = new Map<string | null, FarePrice[]>();
  for (const price of summary.prices) {
    const prices = currencies.get(price.currency) ?? [];
    prices.push(price);
    currencies.set(price.currency, prices);
  }
  const label = [...currencies.values()]
    .map((prices) => {
      const sorted = [...prices].sort(
        (a, b) => Number(a.amount) - Number(b.amount),
      );
      const min = sorted[0],
        max = sorted.at(-1)!;
      return Number(min.amount) === Number(max.amount)
        ? money(min.amount, min.currency)
        : `${money(min.amount, min.currency)}–${money(max.amount, max.currency)}`;
    })
    .join(" / ");
  return [
    label || "Price unavailable",
    summary.journeyDependent ? "Depends on journey" : undefined,
    summary.conditional ? "Check ticket conditions" : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function londonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function fareDate(value: string) {
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))
    return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
export function fareTerm(value: string) {
  const duration = /^P(\d+)([DWMY])$/.exec(value);
  if (duration) {
    const unit = (
      { D: "day", W: "week", M: "month", Y: "year" } as Record<string, string>
    )[duration[2]];
    return `${duration[1]} ${unit}${duration[1] === "1" ? "" : "s"}`;
  }
  const words = value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
