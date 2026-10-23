import { parse, type TNode } from "txml";
import { Validity, type Vehicle } from "@/lib/bods";

function child(nodes: (TNode | string)[], name: string): TNode | undefined {
  return nodes.find(
    (node): node is TNode => typeof node !== "string" && node.tagName === name,
  );
}

function required(nodes: (TNode | string)[], name: string): TNode {
  const node = child(nodes, name);
  if (!node) throw new Error(`Vehicle feed is missing ${name}`);
  return node;
}

function text(node: TNode): string {
  return node.children.filter((value) => typeof value === "string").join("");
}

function optionalText(node: TNode, name: string): string | undefined {
  const value = child(node.children, name);
  return value ? text(value) : undefined;
}

export function parseDatafeed(xml: string): Vehicle[] | null {
  const nodes = parse(xml.replace(/\r\n?/g, "\n"), {
    decodeEntities: true,
    keepWhitespace: true,
    skipXmlDeclaration: true,
    selfClosingTags: [],
  });
  const siri = required(nodes, "Siri");
  const service = required(siri.children, "ServiceDelivery");
  const delivery = required(service.children, "VehicleMonitoringDelivery");
  const activities = delivery.children.filter(
    (node): node is TNode =>
      typeof node !== "string" && node.tagName === "VehicleActivity",
  );
  if (!activities.length) return null;

  return activities.map((activity) => {
    const journey = required(activity.children, "MonitoredVehicleJourney");
    const location = required(journey.children, "VehicleLocation");
    const bearing = optionalText(journey, "Bearing");
    const validUntil = text(required(activity.children, "ValidUntilTime"));
    return {
      lineName: text(required(journey.children, "PublishedLineName")),
      ref: text(required(journey.children, "VehicleRef")),
      longitude: Number(text(required(location.children, "Longitude"))),
      latitude: Number(text(required(location.children, "Latitude"))),
      bearing: bearing === undefined ? null : Number(bearing),
      arrivalTime: optionalText(journey, "DestinationAimedArrivalTime"),
      departureTime: optionalText(journey, "OriginAimedDepartureTime"),
      originName: text(required(journey.children, "OriginName")).replaceAll(
        "_",
        " ",
      ),
      destinationName: text(
        required(journey.children, "DestinationName"),
      ).replaceAll("_", " "),
      validUntil: /(?:Z|[+-]\d{2}:\d{2})$/.test(validUntil)
        ? validUntil
        : validUntil + "Z",
      recordedAt: text(required(activity.children, "RecordedAtTime")),
      validity: Validity.Valid,
    };
  });
}
