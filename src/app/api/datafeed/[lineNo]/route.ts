import { PrismaClient } from '@prisma/client';
import { parseStringPromise } from 'xml2js';

export async function GET(request: Request, { params }: { params: { lineNo: string } }) {
    const prisma = new PrismaClient(),
        nocLine = await prisma.nocLine.findUnique({
            where: {
                lineNo: Number(params.lineNo)
            }
        });

    if (!nocLine) {
        prisma.$disconnect();
        return Response.json({ error: "Invalid lineNo" }, { status: 404 });
    } else {
        const r = await fetch(`https://data.bus-data.dft.gov.uk/api/v1/datafeed/706/?operatorRef=${nocLine.nocCode}&api_key=***REMOVED***`, {
                next: { revalidate: 10 }
            }),
            xml = await r.text(),
            json = await parseStringPromise(xml);

        prisma.$disconnect();
        return Response.json(json);
    }
}