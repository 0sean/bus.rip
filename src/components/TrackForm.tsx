import { Button } from "./ui/button";
import { useEffect, useRef, useState, useMemo } from "react";
import { getCookie, setCookie } from "@/lib/cookies";
import { useNavigate } from "@tanstack/react-router";
import type { NocLine } from "@prisma/client";
import { OperatorCombobox } from "./ui/combobox";
import type { Feature } from "@/lib/utils";

export default function TrackForm({
  lines,
  feature,
}: {
  lines: NocLine[];
  feature: Feature;
}) {
  const navigate = useNavigate();
  const [line, setLine] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    options = useMemo(() => {
      const preferredOperators = [
        "Arriva",
        "Stagecoach",
        "Brighton & Hove Bus and Coach Company",
        "East Yorkshire",
        "Go-Ahead",
        "Go Ahead",
        "Go North East",
        "Go North West",
        "Oxford Bus Company",
        "Metrobus",
      ];

      return [...lines]
        .sort((a, b) => {
          if (a.hasMissingLocationData !== b.hasMissingLocationData) {
            return (
              Number(a.hasMissingLocationData) -
              Number(b.hasMissingLocationData)
            );
          }

          const aIsPreferred = preferredOperators.some((name) =>
              a.publicName.includes(name),
            ),
            bIsPreferred = preferredOperators.some((name) =>
              b.publicName.includes(name),
            );

          if (aIsPreferred !== bIsPreferred) {
            return aIsPreferred ? -1 : 1;
          }

          return a.publicName.localeCompare(b.publicName);
        })
        .map((l) => {
          const label = `${l.publicName}${
            l.referenceName != l.publicName && l.referenceName
              ? ` - ${l.referenceName}`
              : ""
          }`;

          return {
            value: JSON.stringify([l.nocCode, label]),
            label: l.publicName,
            subtitle: l.referenceName != l.publicName ? l.referenceName : "",
            hasMissingLocationData: l.hasMissingLocationData,
          };
        });
    }, [lines]),
    [favourites, setFavourites] = useState<string[]>([]),
    favouritesLoaded = useRef(false);

  useEffect(() => {
    const cookie = getCookie("line");
    if (cookie) {
      const option = options.find((o) => o.value == cookie);
      if (option) setLine(option.value);
    }
  }, [options]);

  useEffect(() => {
    if (!favouritesLoaded.current) {
      const cookie = getCookie("favourites");
      if (cookie) {
        setFavourites(cookie.split(","));
      }
      favouritesLoaded.current = true;
    } else {
      setCookie("favourites", favourites.join(","), {
        expires: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      });
    }
  }, [favourites]);

  return (
    <>
      <OperatorCombobox
        options={options}
        setValue={setLine}
        value={line}
        favourites={favourites}
        setFavourites={setFavourites}
      />
      {favourites.length > 0 && (
        <div className="mt-4 flex gap-2">
          {favourites.map((f) => (
            <button
              key={f}
              onClick={() =>
                setLine(options.find((o) => o.value == f)?.value ?? null)
              }
              className="max-w-[150px] whitespace-nowrap text-ellipsis overflow-hidden border rounded-full px-3 py-1 border-zinc-800 text-zinc-300 text-xs"
            >
              {options.find((o) => o.value == f)?.label}
            </button>
          ))}
        </div>
      )}
      <Button
        className="mt-4 w-fit"
        disabled={!line || loading}
        onClick={async () => {
          if (line != null) {
            setLoading(true);
            setCookie("line", line, {
              expires: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1),
              ),
            });

            const nocCode = JSON.parse(line)[0];
            try {
              const to =
                feature === "tracking"
                  ? "/$nocCode"
                  : feature === "timetables"
                    ? "/$nocCode/timetables"
                    : "/$nocCode/fares";
              await navigate({
                to,
                params: { nocCode },
                search: {},
                state: { mapView: false },
              });
            } finally {
              setLoading(false);
            }
          }
        }}
      >
        {loading ? "Loading..." : "Track"}
      </Button>
    </>
  );
}
