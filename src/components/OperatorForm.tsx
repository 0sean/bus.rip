import { operatorsOptions } from "@/data/queries";
import { transformOperators } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, Loader2, RouteIcon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { ClientOnlyStorage } from "./ClientOnlyStorage";
import { OperatorCombobox } from "./OperatorCombobox";

export function OperatorForm({
  to,
}: {
  to: "/$nocCode" | "/$nocCode/timetables" | "/$nocCode/fares";
}) {
  const navigate = useNavigate();
  const { data, isLoading } = useSuspenseQuery(operatorsOptions());
  const operators = useMemo(() => transformOperators(data), [data]);
  const [operator, setOperator] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <ClientOnlyStorage storageKey="favourites" defaultValue={[] as string[]}>
        {(favourites, setFavourites) => (
          <OperatorCombobox
            options={operators}
            setValue={setOperator}
            value={operator}
            favourites={favourites}
            setFavourites={setFavourites}
            loading={isLoading}
          />
        )}
      </ClientOnlyStorage>
      <div className="grid gap-2 grid-cols-2">
        <Button
          variant="secondary"
          size="lg"
          render={<Link to="/nearby" />}
          nativeButton={false}
        >
          <MapPin /> Find nearby
        </Button>
        <Button
          size="lg"
          disabled={isLoading || !operator || isPending}
          onClick={() =>
            startTransition(() => {
              navigate({ to, params: { nocCode: operator! } });
            })
          }
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" /> Loading...
            </>
          ) : (
            <>
              <RouteIcon /> Track
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
