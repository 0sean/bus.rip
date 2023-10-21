import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { lineNo: string } }) {
    const nocLine = await prisma.nocLine.findUnique({
            where: {
                lineNo: Number(params.lineNo)
            }
        });

    if (!nocLine) {
        return Response.json({ error: "Invalid lineNo" }, { status: 404 });
    } else {
        const r = await fetch(`https://data.bus-data.dft.gov.uk/api/v1/datafeed/?operatorRef=${nocLine.nocCode}&api_key=***REMOVED***`, {
                next: { revalidate: 10 }
            }),
            xml = await r.text(),
            json = await parseStringPromise(xml);

        return Response.json({ line: nocLine, data: json });
    }
}