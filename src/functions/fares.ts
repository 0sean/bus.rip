import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/middleware/rate-limit";
import { operatorCode } from "./validation";
import {
  CATALOGUE_VERSION,
  fareIdPattern,
  type FareRequest,
} from "@/lib/fares";

const id = z.string().regex(fareIdPattern);
const generation = z
  .string()
  .regex(/^[1-9]\d*$/)
  .max(20);
export const fareRequestSchema = z
  .object({
    noc: operatorCode,
    action: z.enum([
      "areas",
      "families",
      "tickets",
      "routes",
      "detail",
      "areaFamilies",
      "areaTickets",
      "familyTickets",
      "ticketAreas",
      "ticketRoutes",
      "stops",
      "sources",
      "geometry",
      "origins",
      "destinations",
      "journey",
    ]),
    id: id.optional(),
    familyId: id.optional(),
    origin: id.optional(),
    destination: id.optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (d) =>
          Number.isFinite(Date.parse(d)) &&
          new Date(d).toISOString().slice(0, 10) === d,
      )
      .optional(),
    generation: generation.optional(),
    expectedGeneration: generation.optional(),
    cursor: z.string().min(1).max(4096).optional(),
    q: z.string().trim().max(120).optional(),
  })
  .superRefine((data, ctx) => {
    const requireKind = (
      value: string | undefined,
      kinds: string[],
      path: string,
    ) => {
      if (!value || !kinds.some((kind) => value.startsWith(kind + "_")))
        ctx.addIssue({
          code: "custom",
          message: "Invalid fare resource",
          path: [path],
        });
    };
    if (["detail", "sources"].includes(data.action))
      requireKind(
        data.id,
        ["area", "family", "ticket", "route", "point"],
        "id",
      );
    if (["stops", "geometry"].includes(data.action))
      requireKind(data.id, ["area", "point"], "id");
    if (["areaFamilies", "areaTickets"].includes(data.action))
      requireKind(data.id, ["area"], "id");
    if (data.action === "familyTickets") requireKind(data.id, ["family"], "id");
    if (["ticketAreas", "ticketRoutes"].includes(data.action))
      requireKind(data.id, ["ticket"], "id");
    if (["origins", "destinations", "journey"].includes(data.action))
      requireKind(data.id, ["route"], "id");
    if (data.familyId) requireKind(data.familyId, ["family"], "familyId");
    if (["destinations", "journey"].includes(data.action))
      requireKind(data.origin, ["point"], "origin");
    if (data.action === "journey") {
      requireKind(data.destination, ["point"], "destination");
      if (!data.date)
        ctx.addIssue({
          code: "custom",
          message: "Choose a travel date",
          path: ["date"],
        });
    }
  });
function resource(data: FareRequest) {
  const paths: Partial<Record<FareRequest["action"], string>> = {
    areaFamilies: `areas/${data.id}/families`,
    areaTickets: `areas/${data.id}/tickets`,
    familyTickets: `families/${data.id}/tickets`,
    ticketAreas: `tickets/${data.id}/areas`,
    ticketRoutes: `tickets/${data.id}/routes`,
    origins: `routes/${data.id}/origins`,
    destinations: `routes/${data.id}/destinations`,
    journey: "journey-fares",
  };
  if (["detail", "sources", "stops", "geometry"].includes(data.action)) {
    const kind = data.id!.split("_")[0];
    return `${kind === "family" ? "families" : kind + "s"}/${data.id}${data.action === "detail" ? "" : "/" + data.action}`;
  }
  return paths[data.action] ?? data.action;
}
const failure = (status: number, error: string) =>
  Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
// Exactly one bounded catalogue request per invocation. No raw entity/document
// reads, publication batches, matrix downloads or client-side deduplication.
export const getFareCatalogue = createServerFn({ method: "GET" })
  .middleware([rateLimit("fares")])
  .validator(fareRequestSchema)
  .handler(async ({ data }) => {
    if (process.env.BUSLANE_ENABLED === "0")
      return failure(503, "Fares are temporarily unavailable.");
    const params = new URLSearchParams({ limit: "50" });
    for (const [key, value] of Object.entries({
      generation: data.generation,
      cursor: data.cursor,
      q: data.q || undefined,
      family_id: data.familyId,
      origin: data.origin,
      destination: data.destination,
      date: data.date,
      route_id: data.action === "journey" ? data.id : undefined,
    })) {
      if (value !== undefined) params.set(key, value);
    }
    try {
      const response = await fetch(
        `${(process.env.BUSLANE_BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/api/fares/operators/${encodeURIComponent(data.noc)}/${resource(data)}?${params}`,
        {
          headers: { Authorization: `Bearer ${process.env.BUSLANE_API_KEY}` },
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (response.status === 409)
        return failure(
          409,
          "Fares have changed. Load the latest fares to continue.",
        );
      if (response.status === 410)
        return failure(
          410,
          "This fare has been removed or regrouped. Browse the latest fares.",
        );
      if (response.status === 404)
        return failure(
          404,
          "This fare is no longer available. Browse the latest fares.",
        );
      if (!response.ok)
        return failure(
          503,
          "Fares are temporarily unavailable. Please try again.",
        );
      const current = response.headers.get("x-catalogue-generation");
      if (
        !current ||
        !/^[1-9]\d*$/.test(current) ||
        response.headers.get("x-catalogue-version") !== CATALOGUE_VERSION
      )
        return failure(
          503,
          "The fares catalogue is not ready. Please try again later.",
        );
      if (
        (data.generation && current !== data.generation) ||
        (data.expectedGeneration && current !== data.expectedGeneration)
      )
        return failure(
          409,
          "Fares have changed. Load the latest fares to continue.",
        );
      const body: unknown = await response.json();
      const object =
        body !== null && typeof body === "object" && !Array.isArray(body);
      if (
        data.action === "journey"
          ? !object ||
            !Array.isArray((body as { candidates?: unknown }).candidates)
          : ["detail", "geometry"].includes(data.action)
            ? !object
            : !Array.isArray(body)
      )
        return failure(
          503,
          "Fares are temporarily unavailable. Please try again.",
        );
      return Response.json(
        {
          data: body,
          generation: current,
          version: CATALOGUE_VERSION,
          nextCursor: response.headers.get("x-next-cursor"),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return failure(
        503,
        "Fares are temporarily unavailable. Please try again.",
      );
    }
  });
