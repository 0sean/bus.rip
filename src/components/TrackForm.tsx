"use client";

import Select from "react-select";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCookie, setCookie } from "cookies-next";

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
      }));

  useEffect(() => {
    const cookie = getCookie("line");
    if (cookie) {
      const option = options.find((o) => o.value == cookie);
      if (option) setLine(option);
    }
  }, []);

  return (
    <>
      <Select
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
      <Button
        className="mt-4 w-fit"
        onClick={() => {
          if (line != null) {
            setLoading(true);
            setCookie("line", line.value);
            router.push(`/map/${line.value}`);
          }
        }}
      >
        {loading ? "Loading..." : "Track"}
      </Button>
    </>
  );
}
