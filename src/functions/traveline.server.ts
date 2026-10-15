import type { NocLine } from "@/db/schema";

type FormattedNocLine = Omit<NocLine, "id">;

// Project the flat NOC export rather than constructing objects for every field
// in every table. The fast path follows Traveline's usual export column order.
const table = /<NOCLines\b[^>]*>([\s\S]*?)<\/NOCLines\s*>/;
const record = /<NOCLinesRecord\b[^>]*>([\s\S]*?)<\/NOCLinesRecord\s*>/g;
const text = "([^<]*(?:<!\\[CDATA\\[[\\s\\S]*?\\]\\]>[^<]*)*)";
const field = (name: string) =>
  `<${name}\\b[^>]*?(?:\\/>|>${text}<\\/${name}\\s*>)`;
const names = [
  "NOCLineNo",
  "NOCCODE",
  "PubNm",
  "RefNm",
  "Mode",
  "Duplicate",
  "DateCeased",
] as const;
const fields = names.map((name) => new RegExp(field(name)));
const orderedRecord = new RegExp(
  `<NOCLinesRecord\\b[^>]*>\\s*` +
    names.slice(0, 4).map(field).join("\\s*") +
    `\\s*<Licence\\b[^>]*?(?:\\/>|>[^<]*<\\/Licence\\s*>)\\s*` +
    field("Mode") +
    `[\\s\\S]*?` +
    field("Duplicate") +
    `\\s*` +
    field("DateCeased") +
    `[\\s\\S]*?<\\/NOCLinesRecord\\s*>`,
  "g",
);

export async function fetchNocLines(): Promise<FormattedNocLine[]> {
  const response = await fetch(
    "https://www.travelinedata.org.uk/noc/api/1.0/nocrecords.xml",
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!response.ok) throw new Error("Operator data is temporarily unavailable");
  return parseOperators(await response.text());
}

export function parseOperators(xml: string): FormattedNocLine[] {
  const section = table.exec(xml)?.[1];
  if (section === undefined)
    throw new Error("Operator feed contains missing or incomplete NOCLines");

  const count = section.match(/<NOCLinesRecord\b[^>]*>/g)?.length ?? 0;
  let matched = 0;
  const lines: FormattedNocLine[] = [];
  const seen = new Set<string>();
  for (const row of section.matchAll(orderedRecord)) {
    matched++;
    append(row, lines, seen);
  }
  if (matched === count) return lines;

  // A changed column order or an extra column must not silently drop records:
  // doing so would delete valid database rows. Read those exports by field name.
  lines.length = 0;
  seen.clear();
  matched = 0;
  for (const row of section.matchAll(record)) {
    matched++;
    append(
      [
        undefined,
        ...fields.map((pattern) => {
          const value = pattern.exec(row[1]);
          if (!value)
            throw new Error("Operator feed is missing a required field");
          return value[1] ?? "";
        }),
      ],
      lines,
      seen,
    );
  }
  if (matched !== count)
    throw new Error("Operator feed contains an incomplete record");
  return lines;
}

function append(
  values: (string | undefined)[],
  lines: FormattedNocLine[],
  seen: Set<string>,
) {
  if (
    decodeText(values[5] ?? "") !== "Bus" ||
    decodeText(values[6] ?? "") === "Dup" ||
    decodeText(values[7] ?? "") !== ""
  )
    return;
  const code = decodeText(values[2] ?? "");
  if (seen.has(code)) return;
  seen.add(code);
  lines.push({
    lineNo: Number(decodeText(values[1] ?? "")),
    nocCode: code,
    publicName: decodeText(values[3] ?? ""),
    referenceName: decodeText(values[4] ?? ""),
    hasMissingLocationData: false,
  });
}

function decodeText(value: string): string {
  if (value.includes("\r")) value = value.replace(/\r\n?/g, "\n");
  if (!value.includes("&") && !value.includes("<")) return value;
  return value.replace(
    /<!\[CDATA\[([\s\S]*?)\]\]>|&([^;]*);|&/g,
    (_, cdata, entity) => {
      if (cdata !== undefined) return cdata;
      switch (entity) {
        case "amp":
          return "&";
        case "lt":
          return "<";
        case "gt":
          return ">";
        case "quot":
          return '"';
        case "apos":
          return "'";
        default: {
          const codePoint = /^#x[\da-f]+$/i.test(entity)
            ? parseInt(entity.slice(2), 16)
            : /^#\d+$/.test(entity)
              ? Number(entity.slice(1))
              : NaN;
          if (
            !Number.isInteger(codePoint) ||
            !(
              codePoint === 9 ||
              codePoint === 10 ||
              codePoint === 13 ||
              (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
              (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
              (codePoint >= 0x10000 && codePoint <= 0x10ffff)
            )
          )
            throw new Error("Operator feed contains an invalid XML entity");
          return String.fromCodePoint(codePoint);
        }
      }
    },
  );
}
