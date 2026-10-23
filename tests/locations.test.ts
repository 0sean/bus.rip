import { describe, expect, it } from "vitest";
import { parseDatafeed } from "../src/functions/locations.server";
import { Validity } from "../src/lib/bods";

const feed = (activities: string) =>
  `<?xml version="1.0"?><Siri xmlns="http://www.siri.org.uk/siri" version="2.0"><ServiceDelivery><VehicleMonitoringDelivery>${activities}</VehicleMonitoringDelivery></ServiceDelivery></Siri>`;

function activity(optional = "", validUntil = "2026-10-23T12:05:00") {
  return `<VehicleActivity>
    <RecordedAtTime>2026-10-23T12:00:00Z</RecordedAtTime>
    <ValidUntilTime>${validUntil}</ValidUntilTime>
    <MonitoredVehicleJourney>
      <PublishedLineName lang="en">A &amp; B &#233; &#x1F68C;</PublishedLineName>
      <VehicleRef>bus-1</VehicleRef>
      <VehicleLocation><Longitude>-0.12</Longitude><Latitude>51.5</Latitude></VehicleLocation>
      <OriginName>Town_Centre</OriginName>
      <DestinationName>Before <![CDATA[A &amp; B]]> after &lt;end&gt;</DestinationName>
      ${optional}
    </MonitoredVehicleJourney>
  </VehicleActivity>`;
}

describe("vehicle feed parsing", () => {
  it("maps a single vehicle, decodes entities, and preserves CDATA and spacing", () => {
    expect(parseDatafeed(feed(activity()))).toEqual([
      {
        lineName: "A & B é 🚌",
        ref: "bus-1",
        longitude: -0.12,
        latitude: 51.5,
        bearing: null,
        arrivalTime: undefined,
        departureTime: undefined,
        originName: "Town Centre",
        destinationName: "Before A &amp; B after <end>",
        validUntil: "2026-10-23T12:05:00Z",
        recordedAt: "2026-10-23T12:00:00Z",
        validity: Validity.Valid,
      },
    ]);
  });

  it("keeps repeated vehicles and optional journey fields", () => {
    const vehicles = parseDatafeed(
      feed(
        activity(
          "<Bearing>0</Bearing><OriginAimedDepartureTime>2026-10-23T11:00:00Z</OriginAimedDepartureTime><DestinationAimedArrivalTime>2026-10-23T13:00:00Z</DestinationAimedArrivalTime>",
        ) + activity().replace("bus-1", "bus-2"),
      ),
    );
    expect(vehicles).toHaveLength(2);
    expect(vehicles?.[0]).toMatchObject({
      bearing: 0,
      departureTime: "2026-10-23T11:00:00Z",
      arrivalTime: "2026-10-23T13:00:00Z",
    });
    expect(vehicles?.[1].ref).toBe("bus-2");
  });

  it.each(["Z", "+01:00", "-05:30"])("preserves the %s timezone", (zone) => {
    const timestamp = "2026-10-23T12:05:00" + zone;
    expect(parseDatafeed(feed(activity("", timestamp)))?.[0].validUntil).toBe(
      timestamp,
    );
  });

  it("returns null for an empty delivery", () => {
    expect(parseDatafeed(feed(""))).toBeNull();
  });

  it("preserves empty elements and normalizes line endings", () => {
    const xml = feed(activity("<Bearing/><OriginAimedDepartureTime/>"))
      .replace("Town_Centre", "A\r\nB\rC")
      .replace(/>\n/g, ">\r\n");
    expect(parseDatafeed(xml)?.[0]).toMatchObject({
      originName: "A\nB\nC",
      bearing: 0,
      departureTime: "",
    });
  });

  it.each([
    "",
    "<Siri/>",
    feed(activity().replace("<VehicleRef>bus-1</VehicleRef>", "")),
  ])("rejects feeds missing required elements", (xml) =>
    expect(() => parseDatafeed(xml)).toThrow(),
  );
});
