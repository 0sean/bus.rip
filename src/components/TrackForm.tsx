"use client";

import Select, { OptionProps, components } from "react-select";
import { Button } from "./ui/button";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie, setCookie } from "cookies-next";
import { FaStar } from "react-icons/fa";

export default function TrackForm({ lines }: { lines: any[] }) {
  const [line, setLine] = useState<{ value: string; label: string } | null>(
      null,
    ),
    [loading, setLoading] = useState(false),
    router = useRouter(),
    options = lines
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
      .map((l) => ({
        value: l.lineNo,
        label: `${l.publicName}${
          l.referenceName != l.publicName && l.referenceName
            ? ` - ${l.referenceName}`
            : ""
        }`,
      })),
    [favourites, setFavourites] = useState<any[]>([]),
    Option = useCallback(
      ({ children, ...props }: OptionProps) => {
        const isFavourite = favourites.includes(props.data.value.toString()),
          toggleFavourite = (e) => {
            e.stopPropagation();
            if (isFavourite) {
              setFavourites(
                favourites.filter((f) => f != props.data.value.toString()),
              );
            } else {
              setFavourites([...favourites, props.data.value.toString()]);
            }
          };

        return (
          <components.Option {...props}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {children}
              <button onClick={toggleFavourite}>
                <FaStar style={{ opacity: isFavourite ? 1 : 0.1 }} />
              </button>
            </div>
          </components.Option>
        );
      },
      [favourites],
    ),
    favouritesLoaded = useRef(false);

  useEffect(() => {
    const cookie = getCookie("line");
    if (cookie) {
      const option = options.find((o) => o.value == cookie);
      if (option) setLine(option);
    }
  }, []);

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
      <Select
        components={{ Option }}
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: "#18181b",
            borderColor: "#27272a",
            maxWidth: "300px",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#18181b",
            maxWidth: "300px",
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected
              ? "#27272a"
              : state.isFocused
              ? "#3f3f46"
              : "#18181b",
          }),
          singleValue: (base) => ({ ...base, color: "#f4f4f5" }),
          placeholder: (base) => ({ ...base, color: "#71717a" }),
          input: (base) => ({ ...base, color: "#f4f4f5" }),
        }}
        placeholder="Select operator"
        value={line}
        onChange={(v) => {
          setLine(v);
        }}
        isClearable
        options={options}
      />
      {favourites.length > 0 && (
        <div className="mt-4 flex gap-2">
          {favourites.map((f) => (
            <button
              key={f}
              onClick={() => setLine(options.find((o) => o.value == f)!)}
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
            setCookie("line", line.value, {
              expires: new Date(
                new Date().setFullYear(new Date().getFullYear() + 1),
              ),
            });
            router.push(`/map/${line.value}`);
          }
        }}
      >
        {loading ? "Loading..." : "Track"}
      </Button>
    </>
  );
}
