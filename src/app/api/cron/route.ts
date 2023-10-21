import { NextRequest } from "next/server";
import { parseStringPromise } from "xml2js";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const prisma = new PrismaClient(),
    r = await fetch(
      "https://www.travelinedata.org.uk/noc/api/1.0/nocrecords.xml",
    ),
    xml = await r.text(),
    json = await parseStringPromise(xml),
    lines = json.travelinedata.NOCLines[0].NOCLinesRecord.filter(
      (line: any) => line.DateCeased[0] == "" && line.Duplicate[0] != "Dup",
    );

  await prisma.nocLine.deleteMany({});

  await prisma.nocLine.createMany({
    data: lines.map((line: any) => ({
      lineNo: Number(line.NOCLineNo[0]),
      nocCode: line.NOCCODE[0],
      publicName: line.PubNm[0],
      referenceName: line.RefNm[0],
    })),
  });

  await prisma.$disconnect();
  return Response.json({ success: true });
}
