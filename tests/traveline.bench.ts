import { readFileSync } from "node:fs";
import { bench, describe } from "vitest";
import { parseStringPromise } from "xml2js";
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
    "previous full XML parse",
    async () => {
      const json = await parseStringPromise(xml);
      const seen = new Set();
      return json.travelinedata.NOCLines[0].NOCLinesRecord.filter(
        (line: Record<string, string[]>) =>
          line.DateCeased[0] === "" &&
          line.Duplicate[0] !== "Dup" &&
          line.Mode[0] === "Bus",
      ).flatMap((line: Record<string, string[]>) => {
        const nocCode = line.NOCCODE[0];
        if (seen.has(nocCode)) return [];
        seen.add(nocCode);
        return [
          {
            lineNo: Number(line.NOCLineNo[0]),
            nocCode,
            publicName: line.PubNm[0],
            referenceName: line.RefNm[0],
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
