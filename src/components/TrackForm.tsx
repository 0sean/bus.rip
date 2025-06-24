"use client";

import { Button } from "./ui/button";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGetCookie, setCookie } from "cookies-next";
import { OperatorCombobox } from "./ui/combobox";

export default function TrackForm({ lines }: { lines: any[] }) {
  const [line, setLine] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    router = useRouter(),
    options = useMemo(
      () =>
        lines
          .sort((a, b) =>
            b.publicName.includes("Arriva") ||
            b.publicName.includes("Stagecoach") ||
            b.publicName.includes("Brighton & Hove Bus and Coach Company") ||
            b.publicName.includes("East Yorkshire") ||
            b.publicName.includes("Go-Ahead") ||
            b.publicName.includes("Go Ahead") ||
            b.publicName.includes("Go North East") ||
            b.publicName.includes("Go North West") ||
            b.publicName.includes("Oxford Bus Company") ||
            b.publicName.includes("Metrobus")
              ? 1
              : -1,
          )
          .map((l) => {
            const label = `${l.publicName}${
              l.referenceName != l.publicName && l.referenceName
                ? ` - ${l.referenceName}`
                : ""
            }`;

            return {
              value: JSON.stringify([l.lineNo, label]),
              label: l.publicName,
              subtitle: l.referenceName != l.publicName ? l.referenceName : "",
            };
          }),
      [lines],
    ),
    [favourites, setFavourites] = useState<any[]>([]),
    getCookie = useGetCookie(),
    favouritesLoaded = useRef(false);

  useEffect(() => {
    const cookie = getCookie("line");
    if (cookie) {
      const option = options.find((o) => o.value == cookie);
      if (option) setLine(option.value);
    }
  }, [getCookie, options]);

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
  }, [favourites, getCookie]);

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
              onClick={() => setLine(options.find((o) => o.value == f)!.value)}
              className="max-w-[150px] whitespace-nowrap text-ellipsis overflow-hidden border rounded-full px-3 py-1 border-zinc-800 text-zinc-300 text-xs"
            >
              {options.find((o) => o.value == f)?.label}
            </button>
          ))}
        </div>
      )}
      <Button
        className="mt-4 w-fit"
        onClick={() => {
          if (line != null) {
            setLoading(true);
            setCookie("line", line, {
              expires: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1),
              ),
            });

            const lineId = JSON.parse(line)[0];
            router.push(`/map/${lineId}`);
          }
        }}
      >
        {loading ? "Loading..." : "Track"}
      </Button>
    </>
  );
}
