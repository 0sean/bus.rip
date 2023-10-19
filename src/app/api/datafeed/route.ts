import { parseStringPromise } from 'xml2js';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const r = await fetch("https://data.bus-data.dft.gov.uk/api/v1/datafeed/706/?api_key=***REMOVED***"),
        xml = await r.text(),
        json = await parseStringPromise(xml);

    return Response.json(json);
}