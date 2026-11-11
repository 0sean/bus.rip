import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  Source,
  Layer,
  NavigationControl,
  Popup,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import { Link } from "@tanstack/react-router";
import type { FilterSpecification } from "maplibre-gl";
import type { Stop } from "@/lib/buslane";
import type { FareMapArea, FareMapGeometry } from "@/lib/fare-map";
import {
  fareZoneFeatures,
  zoneColor,
  fareMapCoverageNote,
} from "@/lib/fare-map";
import { useMediaQuery } from "@/lib/use-media-query";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent } from "../ui/card";
import { IconChevronRight } from "@tabler/icons-react";
export default function FareMap({
  noc,
  zones,
  generation,
  stops,
  unavailable = false,
  precomputed,
  tall = false,
  overview = false,
  topInset = 115,
}: {
  noc: string;
  zones: FareMapArea[];
  generation: string;
  stops: Stop[];
  unavailable?: boolean;
  precomputed?: FareMapGeometry;
  tall?: boolean;
  overview?: boolean;
  topInset?: number;
}) {
  const map = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    longitude: number;
    latitude: number;
    ids: string[];
    pinned: boolean;
  } | null>(null);
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const data = useMemo(
    () => precomputed ?? fareZoneFeatures(zones, stops),
    [precomputed, zones, stops],
  );
  const fitCoverage = useCallback(() => {
    if (!map.current) return;
    const features = data.labels.features.filter(
      (f) => active === null || f.properties?.zoneId === active,
    );
    const coordinates = [
      ...data.points.features
        .filter((f) => active === null || f.properties?.zoneId === active)
        .map((f) => f.geometry.coordinates),
      ...features.map((f) => f.geometry.coordinates),
      ...data.areas.features
        .filter((f) => active === null || f.properties?.zoneId === active)
        .flatMap((f) => f.geometry.coordinates[0]),
    ];
    if (!coordinates.length) return;
    const bounds = coordinates.reduce(
      (b, p) => [
        [Math.min(b[0][0], p[0]), Math.min(b[0][1], p[1])],
        [Math.max(b[1][0], p[0]), Math.max(b[1][1], p[1])],
      ],
      [
        [Infinity, Infinity],
        [-Infinity, -Infinity],
      ],
    );
    map.current?.fitBounds(bounds as [[number, number], [number, number]], {
      padding: tall ? { top: topInset, bottom: 45, left: 45, right: 45 } : 45,
      maxZoom: 14,
      duration: 0,
    });
  }, [data, active, tall, topInset]);
  useEffect(() => {
    if (loaded) fitCoverage();
  }, [loaded, fitCoverage]);
  function hitZones(event: MapLayerMouseEvent) {
    // A named label is an unambiguous target even when stop coverage overlaps.
    const label = event.features?.find(
      (feature) => feature.layer.id === "fare-zone-names",
    );
    return label
      ? [String(label.properties.zoneId)]
      : [
          ...new Set(
            (event.features ?? []).map((f) => String(f.properties.zoneId)),
          ),
        ];
  }
  function clearHover() {
    setSelection((previous) => (previous?.pinned ? previous : null));
  }
  function selectZones(event: MapLayerMouseEvent, pinned: boolean) {
    if (
      (event.originalEvent.target as HTMLElement)?.closest?.(
        ".maplibregl-popup, .maplibregl-ctrl",
      )
    ) {
      if (!pinned) clearHover();
      return;
    }
    const ids = hitZones(event).filter((id) =>
      zones.some((zone) => zone.id === id),
    );
    const next = ids.length
      ? { longitude: event.lngLat.lng, latitude: event.lngLat.lat, ids, pinned }
      : null;
    setSelection((previous) => (!pinned && previous?.pinned ? previous : next));
  }
  const filter: FilterSpecification =
    active === null ? ["has", "zoneId"] : ["==", ["get", "zoneId"], active];
  const mapped = new Set(data.labels.features.map((f) => f.properties?.zoneId));
  return (
    <section
      aria-label="Published ticket-area stop locations"
      className="relative overflow-hidden rounded-[14px] border bg-muted/30"
    >
      <div
        className={`relative ${overview ? "h-[352px] lg:h-[565px]" : tall ? "h-[var(--fare-zone-map-height,648px)]" : "h-[352px]"}`}
      >
        <Map
          ref={map}
          initialViewState={{ longitude: -2.5, latitude: 54.5, zoom: 5 }}
          mapStyle={
            dark
              ? "https://tiles.openfreemap.org/styles/dark"
              : "https://tiles.openfreemap.org/styles/positron"
          }
          onLoad={() => setLoaded(true)}
          onResize={fitCoverage}
          onError={() => {
            queueMicrotask(() => setFailed(true));
          }}
          interactiveLayerIds={[
            "fare-zone-fill",
            "fare-zone-points",
            "fare-zone-names",
          ]}
          onClick={(event) => selectZones(event, true)}
          onMouseMove={(event) => selectZones(event, false)}
          onMouseLeave={clearHover}
          onMoveStart={() => setSelection(null)}
          cursor={selection ? "pointer" : "grab"}
          scrollZoom={false}
          dragRotate={false}
          touchPitch={false}
          attributionControl={{ compact: true }}
        >
          <NavigationControl showCompass={false} />
          <Source id="fare-zone-areas" type="geojson" data={data.areas}>
            <Layer
              id="fare-zone-fill"
              type="fill"
              filter={filter}
              paint={{
                "fill-color": ["get", "color"],
                "fill-opacity": [
                  "case",
                  ["==", ["get", "zoneId"], selection?.ids[0] ?? ""],
                  0.24,
                  0.08,
                ],
              }}
            />
            <Layer
              id="fare-zone-outline"
              type="line"
              filter={filter}
              paint={{
                "line-color": ["get", "color"],
                "line-width": 2,
                "line-dasharray": [3, 2],
              }}
            />
          </Source>
          <Source id="fare-zone-points" type="geojson" data={data.points}>
            <Layer
              id="fare-zone-points"
              type="circle"
              filter={filter}
              paint={{
                "circle-radius": overview ? 3 : 4,
                "circle-opacity": overview
                  ? [
                      "step",
                      ["zoom"],
                      ["case", ["get", "approximate"], 0, 1],
                      12,
                      1,
                    ]
                  : 1,
                "circle-stroke-opacity": overview
                  ? [
                      "step",
                      ["zoom"],
                      ["case", ["get", "approximate"], 0, 1],
                      12,
                      1,
                    ]
                  : 1,
                "circle-color": ["get", "color"],
                "circle-stroke-width": 1,
                "circle-stroke-color": dark ? "#171717" : "#ffffff",
              }}
            />
          </Source>
          <Source id="fare-zone-labels" type="geojson" data={data.labels}>
            <Layer
              id="fare-zone-names"
              type="symbol"
              filter={filter}
              layout={{
                "text-field": ["get", "name"],
                "text-font": ["Noto Sans Regular"],
                "text-size": 12,
                "text-offset": [0, 1],
                "text-anchor": "top",
                "text-max-width": 14,
              }}
              paint={{
                "text-color": dark ? "#ffffff" : "#171717",
                "text-halo-color": dark ? "#171717" : "#ffffff",
                "text-halo-width": 2,
              }}
            />
          </Source>
          {selection ? (
            <Popup
              longitude={selection.longitude}
              latitude={selection.latitude}
              onClose={() => setSelection(null)}
              closeOnClick={false}
              closeButton={false}
              className="pb-2 !min-w-64"
              maxWidth="calc(100vw - 2rem)"
            >
              <Card className="w-xs max-w-[calc(100vw-2rem)] !font-sans gap-0 py-0">
                <CardContent className="p-0 max-h-48 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50">
                  {selection.ids.map((id) => {
                    const zone = zones.find((zone) => zone.id === id);
                    if (!zone) return null;
                    return (
                      <Link
                        key={zone.id}
                        to="/fares/$nocCode/$fare"
                        params={{ nocCode: noc, fare: zone.id }}
                        search={{ generation }}
                        className="flex gap-2 items-center px-4 py-3 border-b last:border-b-0 font-medium hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span
                          className="shrink-0 size-6 bg-muted flex justify-center items-center rounded-md"
                          aria-hidden
                        >
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: zoneColor(zone.id) }}
                          />
                        </span>
                        <span className="min-w-0 wrap-anywhere">
                          {zone.name}
                        </span>
                        <span className="shrink-0 ms-auto inline-flex items-center text-muted-foreground">
                          <IconChevronRight aria-hidden size={16} />
                        </span>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </Popup>
          ) : null}
        </Map>
      </div>
      <div
        className={
          overview || tall
            ? `absolute ${overview ? "top-3" : "bottom-24 sm:bottom-10"} left-3 max-w-[calc(100%-6rem)] rounded-md bg-background/90 px-2 py-1 pointer-events-none`
            : "border-t p-3 flex flex-col gap-2"
        }
      >
        <p role="status" className="text-xs text-muted-foreground">
          {failed
            ? "Map could not load. Fare details remain available."
            : unavailable
              ? "Stop locations are temporarily unavailable."
              : precomputed
                ? fareMapCoverageNote(precomputed)
                : !mapped.size
                  ? "No loaded stops have matching timetable coordinates."
                  : overview
                    ? "Approximate zone coverage · ticket conditions apply"
                    : data.areas.features.length
                      ? "Shaded coverage is approximate, not an official fare boundary."
                      : zones.length === 1
                        ? `${data.points.features.length} stop locations shown.`
                        : `${mapped.size} of ${zones.length} areas have loaded stop locations. No ticket boundaries are published.`}
        </p>
        {zones.length > 1 && !overview && !tall ? (
          <div
            className="flex gap-2 flex-wrap max-h-28 overflow-y-auto"
            aria-label="Map ticket areas"
          >
            <button
              type="button"
              aria-pressed={active === null}
              onClick={() => {
                setActive(null);
                setSelection(null);
              }}
              className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
            >
              All areas
            </button>
            {zones.map((zone) => (
              <button
                type="button"
                key={zone.id}
                aria-pressed={active === zone.id}
                disabled={!mapped.has(zone.id)}
                onClick={() => {
                  setActive(active === zone.id ? null : zone.id);
                  setSelection(null);
                }}
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent aria-pressed:bg-accent disabled:opacity-50"
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: zoneColor(zone.id) }}
                />
                {zone.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
