import { readFileSync } from "node:fs";
import { bench, describe } from "vitest";
import { parse, filter, type TNode } from "txml";
import { parseOperators } from "../src/functions/traveline.server";

// Use one saved upstream response for a reproducible comparison. Downloading
// data is deliberately outside the measurements; elapsed network time is not CPU.
const path = process.env.TRAVELINE_FEED_PATH;
if (!path) throw new Error("Set TRAVELINE_FEED_PATH to a saved nocrecords.xml");
const xml = readFileSync(path, "utf8");

describe("Traveline operator import", () => {
  bench(
    "project operator fields",
    () => {
      parseOperators(xml);
    },
    {
      iterations: 10,
      time: 0,
      warmupIterations: 2,
      warmupTime: 0,
    },
  );
  bench(
    "full txml parse",
    () => {
      const nodes = parse(xml, { decodeEntities: true, keepWhitespace: true });
      const table = filter(nodes, (node) => node.tagName === "NOCLines")[0];
      const records = table.children.filter(
        (node): node is TNode =>
          typeof node !== "string" && node.tagName === "NOCLinesRecord",
      );
      const value = (line: TNode, name: string) => {
        const field = line.children.find(
          (node): node is TNode =>
            typeof node !== "string" && node.tagName === name,
        );
        return field?.children.join("") ?? "";
      };
      const seen = new Set<string>();
      records
        .filter(
          (line) =>
            value(line, "DateCeased") === "" &&
            value(line, "Duplicate") !== "Dup" &&
            value(line, "Mode") === "Bus",
        )
        .flatMap((line) => {
          const nocCode = value(line, "NOCCODE");
          if (seen.has(nocCode)) return [];
          seen.add(nocCode);
          return [
            {
              lineNo: Number(value(line, "NOCLineNo")),
              nocCode,
              publicName: value(line, "PubNm"),
              referenceName: value(line, "RefNm"),
              hasMissingLocationData: false,
            },
          ];
        });
    },
    {
      iterations: 3,
      time: 0,
      warmupIterations: 1,
      warmupTime: 0,
    },
  );
});
