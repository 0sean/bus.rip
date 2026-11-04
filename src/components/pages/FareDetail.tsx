import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IconArrowLeft } from "@tabler/icons-react";
import {
  fareAmounts,
  fareText,
  money,
  fareKey,
  groupFares,
  type FareEntity,
  type FareDetailData,
} from "@/lib/fares";
import { fareDetailOptions, stopsOptions } from "@/data/queries";
import { FareMapPlaceholder } from "../map/FareMapPlaceholder";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
const FareMap = lazy(() => import("../map/FareMap"));
type Detail = FareDetailData;
export default function FareDetail({
  noc,
  detail,
}: {
  noc: string;
  detail: Detail;
}) {
  const [documentId, setDocumentId] = useState(detail.document.id);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const selectedDetail = useQuery({
    ...fareDetailOptions(noc, detail.entity.id, documentId),
    enabled: documentId !== detail.document.id,
  });
  const current =
    documentId === detail.document.id ? detail : selectedDetail.data;
  const { entity, labels, prices } = current ?? detail;
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(60);
  const stops = useQuery(stopsOptions(noc));
  const zones = useMemo(
    () =>
      entity.category === "zone"
        ? groupFares([entity])
        : groupFares(labels.filter((e) => e.category === "zone")),
    [entity, labels],
  );
  const points = useMemo(() => {
    const codes = new Set(zones.flatMap((zone) => zone.stops));
    return (stops.data ?? []).filter((stop) => codes.has(stop.id));
  }, [zones, stops.data]);
  const names = new Map(
    labels.map((e) => [fareKey(e.document_id, e.ref), e.name || e.ref]),
  );
  const zoneName = (ref: string) =>
    [
      ...new Set(
        labels
          .filter((label) => label.category === "zone" && label.ref === ref)
          .map((label) => label.name || ref),
      ),
    ].join(" / ") || ref;
  const published = prices;
  const pairs = (price: FareEntity) =>
    price.matrices?.length
      ? price.matrices
      : [{ start_ref: price.start_ref, end_ref: price.end_ref }];
  const availableOrigins = [
    ...new Set(
      published
        .flatMap((p) => pairs(p).map((m) => m.start_ref))
        .filter((s): s is string => !!s),
    ),
  ];
  const availableDestinations = [
    ...new Set(
      published
        .flatMap((p) =>
          pairs(p)
            .filter((m) => !origin || m.start_ref === origin)
            .map((m) => m.end_ref),
        )
        .filter((s): s is string => !!s),
    ),
  ];
  const variant =
    detail.variants.find((variant) => variant.documentId === documentId) ??
    detail.variants[0];
  const lines = variant.lines;
  const rows = (current ? published : []).filter(
    (p) =>
      ((!origin && !destination) ||
        pairs(p).some(
          (m) =>
            (!origin || m.start_ref === origin) &&
            (!destination || m.end_ref === destination),
        )) &&
      ([
        names.get(fareKey(p.document_id, p.product_ref || "")),
        names.get(fareKey(p.document_id, p.profile_ref || "")),
        ...lines,
        ...(p.matrices ?? []).flatMap((m) => [
          names.get(fareKey(p.document_id, m.start_ref || "")),
          names.get(fareKey(p.document_id, m.end_ref || "")),
        ]),
      ].some((s) => s?.toLowerCase().includes(search.trim().toLowerCase())) ||
        !search.trim()),
  );
  const selectClass =
    "w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm";
  return (
    <main className="flex flex-col gap-4">
      <Link
        to="/fares/$nocCode"
        params={{ nocCode: noc }}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground self-start"
      >
        <IconArrowLeft aria-hidden className="size-4" />
        All fares
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {entity.name || "Fare details"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lines.length
              ? `Route${lines.length === 1 ? "" : "s"} ${[...new Set(lines)].join(", ")} · `
              : ""}
            Published fares
            {variant.published
              ? ` · Published ${variant.published.slice(0, 10)}`
              : ""}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {!current ? (
          <FareMapPlaceholder tall />
        ) : (
          <ClientOnly fallback={<FareMapPlaceholder tall />}>
            <Suspense fallback={<FareMapPlaceholder tall />}>
              <FareMap
                noc={noc}
                zones={zones}
                stops={points}
                unavailable={!!stops.error}
                tall
              />
            </Suspense>
          </ClientOnly>
        )}
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <h2 className="font-semibold">
              {entity.category === "zone"
                ? "Fares to and from this zone"
                : "Published ticket prices"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {entity.category === "zone"
                ? "Prices below are linked to this zone. Area tickets can also be found under Tickets."
                : "Choose a route, then select your origin and destination to see the published journey prices."}
            </p>
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Route / fare publication
            <select
              aria-label="Choose route"
              className={selectClass}
              value={documentId}
              onChange={(e) => {
                setDocumentId(Number(e.target.value));
                setOrigin("");
                setDestination("");
                setSearch("");
                setLimit(60);
              }}
            >
              {detail.variants.map((variant) => (
                <option key={variant.documentId} value={variant.documentId}>
                  {variant.lines.length
                    ? `Route${variant.lines.length === 1 ? "" : "s"} ${variant.lines.join(", ")}`
                    : "Area ticket"}
                  {variant.published
                    ? ` · Published ${variant.published.slice(0, 10)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          {current && availableOrigins.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                From
                <select
                  aria-label="From zone"
                  className={selectClass}
                  value={origin}
                  onChange={(e) => {
                    setOrigin(e.target.value);
                    setDestination("");
                    setLimit(60);
                  }}
                >
                  <option value="">All origins</option>
                  {availableOrigins.map((ref) => (
                    <option key={ref} value={ref}>
                      {zoneName(ref)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                To
                <select
                  aria-label="To zone"
                  className={selectClass}
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setLimit(60);
                  }}
                >
                  <option value="">All destinations</option>
                  {availableDestinations.map((ref) => (
                    <option key={ref} value={ref}>
                      {zoneName(ref)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          {!current && selectedDetail.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading fares for this route…
            </p>
          ) : null}
          {!current &&
          (selectedDetail.error || selectedDetail.data === null) ? (
            <div role="alert" className="text-sm">
              <p>Fares for this route could not load.</p>
              <Button
                variant="outline"
                onClick={() => void selectedDetail.refetch()}
              >
                Retry
              </Button>
            </div>
          ) : null}
          <Input
            aria-label="Filter published prices"
            placeholder="Filter tickets, passengers or destinations"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(60);
            }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rows.slice(0, limit).map((price) => (
              <PriceCard
                key={price.id}
                price={price}
                names={names}
                fallbackName={
                  entity.category === "product" ? entity.name : null
                }
              />
            ))}
          </div>
          {current && !rows.length ? (
            <p role="status" className="text-muted-foreground py-8 text-sm">
              {search
                ? "No prices match your search."
                : "No directly linked prices are published for this fare. Check the operator for journey prices and ticket coverage."}
            </p>
          ) : null}
          {rows.length > limit ? (
            <Button variant="outline" onClick={() => setLimit((n) => n + 60)}>
              Show more prices ({rows.length - limit} remaining)
            </Button>
          ) : null}
          {fareText(entity, "Description") ? (
            <p className="text-sm text-muted-foreground">
              {fareText(entity, "Description")}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Fares are supplied through Bus Open Data Service. Check the
            publication date and ticket conditions before travelling.
          </p>
        </div>
      </div>
    </main>
  );
}
function PriceCard({
  price,
  names,
  fallbackName,
}: {
  price: FareEntity;
  names: Map<string, string>;
  fallbackName: string | null;
}) {
  const amounts = fareAmounts(price);
  const routes = price.matrices?.length
    ? price.matrices
    : [{ start_ref: price.start_ref, end_ref: price.end_ref }];
  const title =
    names.get(fareKey(price.document_id, price.product_ref || "")) ||
    fallbackName ||
    price.name ||
    "Published fare";
  const profile = names.get(
    fareKey(price.document_id, price.profile_ref || ""),
  );
  const offer = names.get(fareKey(price.document_id, price.package_ref || ""));
  return (
    <details className="rounded-[14px] bg-card text-card-foreground ring-1 ring-foreground/10 shadow-sm group">
      <summary className="cursor-pointer list-none flex items-center gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[14px]">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium wrap-anywhere">{title}</h3>
          {profile ? (
            <p className="text-xs text-muted-foreground mt-1">{profile}</p>
          ) : null}
          {routes.map((r, i) =>
            r.start_ref || r.end_ref ? (
              <p
                key={i}
                className="text-xs text-muted-foreground mt-1 wrap-anywhere"
              >
                {names.get(fareKey(price.document_id, r.start_ref || "")) ||
                  r.start_ref ||
                  "Unspecified origin"}{" "}
                →{" "}
                {names.get(fareKey(price.document_id, r.end_ref || "")) ||
                  r.end_ref ||
                  "Unspecified destination"}
              </p>
            ) : null,
          )}
        </div>
        <span className="text-sm font-medium text-right shrink-0 max-w-[45%] wrap-anywhere">
          {amounts.length
            ? [
                ...new Set(amounts.map((a) => money(a.amount, a.currency))),
              ].join(" / ")
            : "Price unavailable"}
          <span aria-hidden className="ml-2 inline-block group-open:rotate-90">
            ›
          </span>
        </span>
      </summary>
      <div className="border-t px-4 py-3 text-xs text-muted-foreground flex flex-col gap-2 wrap-anywhere">
        {offer ? <p>Sales option: {offer}</p> : null}
        <p>
          {amounts.length > 1
            ? "Several published price versions are available. Confirm the applicable price with the operator."
            : "Price applies to the published journey and passenger conditions."}
        </p>
        <p>Version {price.version || "unspecified"}</p>
        {fareText(price, "Description") ? (
          <p>{fareText(price, "Description")}</p>
        ) : null}
      </div>
    </details>
  );
}
