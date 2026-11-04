import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { farePagesOptions, journeyFaresOptions } from "@/data/queries";
import {
  FareApiError,
  londonDate,
  money,
  type FareItem,
  type FareRequest,
} from "@/lib/fares";
import { FareCard, FareError } from "./FareCatalogueList";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
const selectClass =
  "w-full min-w-0 rounded-md border bg-background px-3 py-2 text-sm";
function PointPicker({
  request,
  label,
  value,
  onChange,
}: {
  request: FareRequest;
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const query = useInfiniteQuery(farePagesOptions(request));
  const points = query.data?.pages.flatMap((p) => p.data) ?? [];
  const expired =
    query.error instanceof FareApiError &&
    [404, 409, 410].includes(query.error.status);
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {label}
        <select
          className={selectClass}
          aria-label={label}
          value={expired ? "" : value}
          disabled={query.isPending || expired}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">
            {query.isPending ? "Loading…" : `Choose ${label.toLowerCase()}`}
          </option>
          {!expired
            ? points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))
            : null}
        </select>
      </label>
      {query.error ? (
        <FareError
          error={query.error}
          noc={request.noc}
          retry={() => {
            void (query.isFetchNextPageError
              ? query.fetchNextPage()
              : query.refetch());
          }}
        />
      ) : null}
      {query.hasNextPage && !expired ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more {label === "From" ? "origins" : "destinations"}
        </Button>
      ) : null}
      {!query.isPending && !query.error && !points.length ? (
        <p className="text-sm text-muted-foreground">
          No supported {label === "From" ? "origins" : "destinations"} are
          available for this direction.
        </p>
      ) : null}
    </div>
  );
}
export default function FareJourney({
  noc,
  route,
  generation,
}: {
  noc: string;
  route: FareItem;
  generation: string;
}) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState(() => londonDate());
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date;
  const query = useInfiniteQuery({
    ...journeyFaresOptions({
      noc,
      action: "journey",
      id: route.id,
      origin,
      destination,
      date,
      generation,
    }),
    enabled: !!origin && !!destination && validDate,
  });
  const expired =
    query.error instanceof FareApiError &&
    [404, 409, 410].includes(query.error.status);
  const candidates = expired
    ? []
    : (query.data?.pages.flatMap((p) => p.data.candidates) ?? []);
  return (
    <section className="flex flex-col gap-4 min-w-0" aria-label="Journey fares">
      <h2 className="font-semibold">Find a journey fare</h2>
      <p className="text-sm text-muted-foreground">
        Choose the exact direction and travel date. Reverse journeys can have
        different fares. Only supported published journeys are listed.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PointPicker
          request={{ noc, action: "origins", id: route.id, generation }}
          label="From"
          value={origin}
          onChange={(value) => {
            setOrigin(value);
            setDestination("");
          }}
        />
        {origin ? (
          <PointPicker
            key={origin}
            request={{
              noc,
              action: "destinations",
              id: route.id,
              origin,
              generation,
            }}
            label="To"
            value={destination}
            onChange={setDestination}
          />
        ) : null}
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-medium sm:max-w-64">
        Travel date
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      {origin && destination && validDate && query.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Looking up published fares…
        </p>
      ) : null}
      {query.error ? (
        <FareError
          error={query.error}
          noc={noc}
          retry={() => {
            void (query.isFetchNextPageError
              ? query.fetchNextPage()
              : query.refetch());
          }}
        />
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {candidates.map((candidate) => (
          <div
            key={`${candidate.id}:${candidate.amount}:${candidate.currency}`}
            className="flex flex-col gap-2"
          >
            <FareCard
              item={candidate}
              noc={noc}
              generation={generation}
              priceLabel={money(candidate.amount, candidate.currency)}
            />
            <p className="px-4 text-sm font-semibold">
              {candidate.status === "outside_published_validity"
                ? "Outside published validity — do not use for this date"
                : "Published candidate — conditions apply"}
            </p>
            {candidate.unresolved_count ? (
              <p className="px-4 text-xs text-muted-foreground">
                Some conditions could not be resolved. Confirm with the
                operator.
              </p>
            ) : null}
          </div>
        ))}
      </div>
      {query.data && !expired && !candidates.length ? (
        <p role="status" className="text-sm text-muted-foreground">
          No supported published fare was found for this direction and date.
          Other ticket patterns may exist; check with the operator.
        </p>
      ) : null}
      {!expired && query.hasNextPage ? (
        <Button
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Show more fare candidates
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Passenger eligibility, sales channels, time restrictions and other rules
        are not fully evaluated. These are published candidates, not a
        guaranteed payable or cheapest fare.
      </p>
    </section>
  );
}
