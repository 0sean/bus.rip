import { describe, expect, it } from "vitest";
import { parseDatafeed } from "../src/functions/locations.server";
import { nearbyOperators } from "../src/lib/nearby-operators";

const now = Date.parse("2026-11-09T12:00:00Z");
const operators = [
  { value: "ABCD", label: "Local buses" },
  { value: "OTHER", label: "Elsewhere buses" },
  { value: "efgh", label: "Another local operator" },
];
const activity = (code: string, validUntil = "2026-11-09T12:05:00Z") => `
  <VehicleActivity>
    <RecordedAtTime>2026-11-09T11:59:00Z</RecordedAtTime>
    <ValidUntilTime>${validUntil}</ValidUntilTime>
    <MonitoredVehicleJourney>
      ${code ? `<OperatorRef>${code}</OperatorRef>` : ""}
      <PublishedLineName>1</PublishedLineName><VehicleRef>bus</VehicleRef>
      <VehicleLocation><Longitude>-0.12</Longitude><Latitude>51.5</Latitude></VehicleLocation>
      <OriginName>Town</OriginName><DestinationName>Station</DestinationName>
    </MonitoredVehicleJourney>
  </VehicleActivity>`;
const vehicles = (...activities: string[]) =>
  parseDatafeed(`<Siri><ServiceDelivery><VehicleMonitoringDelivery>
    ${activities.join("")}
  </VehicleMonitoringDelivery></ServiceDelivery></Siri>`);

describe("nearby operator discovery", () => {
  it("matches feed references to selectable operators once, preserving catalogue order", () => {
    expect(
      nearbyOperators(
        operators,
        vehicles(activity(" EFGH "), activity("abcd"), activity("ABCD")),
        now,
      ),
    ).toEqual([operators[0], operators[2]]);
  });

  it("ignores unknown and missing references, expired vehicles and invalid timestamps", () => {
    expect(
      nearbyOperators(
        operators,
        vehicles(
          activity("UNKNOWN"),
          activity(""),
          activity("ABCD", "2026-11-09T11:59:00Z"),
          activity("OTHER", "invalid"),
        ),
        now,
      ),
    ).toEqual([]);
  });

  it("handles an empty feed", () => {
    expect(nearbyOperators(operators, null, now)).toEqual([]);
    expect(nearbyOperators(operators, [], now)).toEqual([]);
  });
});
