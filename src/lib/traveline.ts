import { parseStringPromise } from "xml2js";

import type { NocLine } from "@prisma/client";

export async function fetchNocLines(): Promise<FormattedNocLine[]> {
  const r = await fetch(
      "https://www.travelinedata.org.uk/noc/api/1.0/nocrecords.xml",
    ),
    xml = await r.text(),
    json: TravelineResponse = await parseStringPromise(xml),
    lines = json.travelinedata.NOCLines[0].NOCLinesRecord.filter(
      (line: any) =>
        line.DateCeased[0] == "" &&
        line.Duplicate[0] != "Dup" &&
        line.Mode[0] == "Bus",
    );

  return lines
    .map((line) => ({
      lineNo: Number(line.NOCLineNo[0]),
      nocCode: line.NOCCODE[0],
      publicName: line.PubNm[0],
      referenceName: line.RefNm[0],
    }))
    .reduce(
      (prev, curr) =>
        prev.find((n) => n.nocCode == curr.nocCode) ? prev : [...prev, curr],
      [] as FormattedNocLine[],
    );
}

type TravelineResponse = {
  travelinedata: {
    $: { reportName: "NOC_Complete"; generationDate: string };
    DataOwner: Record<string, any>[];
    Groups: Record<string, any>[];
    Licence: Record<string, any>[];
    ManagementDivisions: Record<string, any>[];
    NOCLines: { NOCLinesRecord: NocLinesRecord[] }[];
    NOCTable: Record<string, any>[];
    Operators: Record<string, any>[];
    PublicName: Record<string, any>[];
  };
};

type NocLinesRecord = {
  NOCLineNo: string[];
  NOCCODE: string[];
  PubNm: string[];
  RefNm: string[];
  Licence: string[];
  Mode:
    | ["Rail"]
    | ["Bus"]
    | ["Taxi"]
    | ["Airline"]
    | ["Ferry"]
    | ["Coach"]
    | ["CT Operator"]
    | ["DRT"]
    | ["Permit"]
    | ["Metro"]
    | ["Tram"]
    | ["Other"]
    | ["Cable Car"]
    | ["Underground"]
    | [""]
    | ["Partly DRT"]
    | ["Section 19"];
  TLRegOwn: string[];
  EBSRAgent: string[];
  LO: string[];
  SW: string[];
  WM: string[];
  WA: string[];
  YO: string[];
  NW: string[];
  NE: string[];
  SC: string[];
  SE: string[];
  EA: string[];
  EM: string[];
  NI: string[];
  NX: string[];
  Megabus: string[];
  NewBharat: string[];
  Terravision: string[];
  NCSD: string[];
  Easybus: string[];
  Yorks_RT: string[];
  TravelEnq: string[];
  Comment: string[];
  AuditDate: string[];
  AuditEditor: string[];
  AuditComment: string[];
  Duplicate: ["OK"] | ["Dup"] | ["REF!"] | [""];
  DateCeased: string[];
  CessationComment: string[];
};

type FormattedNocLine = Omit<NocLine, "id">;
