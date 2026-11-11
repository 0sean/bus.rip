import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, MapPin } from "lucide-react";
import { locationsOptions } from "@/data/queries";
import { nearbyBoundingBox, type BoundingBox } from "@/lib/bods";
import { nearbyOperators } from "@/lib/nearby-operators";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  to: "/timetables/$nocCode" | "/fares/$nocCode";
  operators: { value: string; label: string; subtitle: string }[];
};

export function NearbyOperatorsButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="secondary" size="lg" />}>
        <MapPin /> Find nearby
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nearby operators</DialogTitle>
          <DialogDescription>
            Choose an operator found from live buses near your location to view
            their {props.to === "/fares/$nocCode" ? "fares" : "timetables"}.
          </DialogDescription>
        </DialogHeader>
        {open && <NearbyOperators {...props} />}
      </DialogContent>
    </Dialog>
  );
}

function NearbyOperators({ to, operators }: Props) {
  const [boundingBox, setBoundingBox] = useState<BoundingBox | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { data, error, isFetching, refetch } = useQuery({
    ...locationsOptions(boundingBox),
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (cancelled) return;
        setBoundingBox(nearbyBoundingBox(coords.longitude, coords.latitude));
      },
      (error) => {
        if (cancelled) return;
        setLocationError(
          error.code === 1
            ? "Allow location access in your browser to find nearby operators."
            : error.code === 3
              ? "Finding your location took too long. Please try again."
              : "Unable to find your location. Please try again.",
        );
      },
      { timeout: 15_000, maximumAge: 60_000 },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (locationError || error) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert">
          {locationError ??
            "Nearby bus data is temporarily unavailable. Please try again."}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            if (locationError) {
              setLocationError(null);
              setAttempt((current) => current + 1);
            } else {
              void refetch();
            }
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (!boundingBox || isFetching) {
    return (
      <p role="status" className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        {boundingBox ? "Finding nearby operators…" : "Finding your location…"}
      </p>
    );
  }

  const nearby = nearbyOperators(operators, data?.vehicles ?? null);
  if (!nearby.length) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status">
          No operators found from live buses nearby. Try again later or close
          this window to search all operators.
        </p>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <ul
      aria-label="Nearby operators"
      className="max-h-[50dvh] overflow-y-auto space-y-2"
    >
      {nearby.map((operator) => (
        <li key={operator.value}>
          <Button
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal py-3 text-left"
            render={<Link to={to} params={{ nocCode: operator.value }} />}
            nativeButton={false}
          >
            <span className="flex min-w-0 flex-col">
              <span>{operator.label}</span>
              {operator.subtitle && (
                <span className="text-xs text-muted-foreground">
                  {operator.subtitle}
                </span>
              )}
            </span>
          </Button>
        </li>
      ))}
    </ul>
  );
}
