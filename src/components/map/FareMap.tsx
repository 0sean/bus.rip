import { useEffect, useMemo, useRef, useState } from "react";
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
import type { FareMapArea } from "@/lib/fare-map";
import { fareZoneFeatures, zoneColor } from "@/lib/fare-map";
import { useMediaQuery } from "@/lib/use-media-query";
import "maplibre-gl/dist/maplibre-gl.css";
export default function FareMap({
  noc,
  zones,
  generation,
  stops,
  unavailable = false,
  tall = false,
}: {
  noc: string;
  zones: FareMapArea[];
  generation: string;
  stops: Stop[];
  unavailable?: boolean;
  tall?: boolean;
}) {
  const map = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    longitude: number;
    latitude: number;
    ids: string[];
  } | null>(null);
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const data = useMemo(() => fareZoneFeatures(zones, stops), [zones, stops]);
  useEffect(() => {
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
      padding: 45,
      maxZoom: 14,
      duration: 0,
    });
  }, [loaded, data, active]);
  function select(event: MapLayerMouseEvent) {
    const ids = [
      ...new Set(
        (event.features ?? []).map((f) => String(f.properties.zoneId)),
      ),
    ];
    setSelected(
      ids.length
        ? { longitude: event.lngLat.lng, latitude: event.lngLat.lat, ids }
        : null,
    );
  }
  const filter: FilterSpecification =
    active === null ? ["has", "zoneId"] : ["==", ["get", "zoneId"], active];
  const mapped = new Set(data.labels.features.map((f) => f.properties?.zoneId));
  return (
    <section
      aria-label="Published ticket-area stop locations"
      className="overflow-hidden rounded-[14px] border bg-muted/30"
    >
      <div
        className={`relative ${tall ? "h-[352px] lg:h-[648px]" : "h-[352px]"}`}
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
          onError={() => {
            queueMicrotask(() => setFailed(true));
          }}
          interactiveLayerIds={[
            "fare-zone-fill",
            "fare-zone-points",
            "fare-zone-names",
          ]}
          onClick={select}
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
              paint={{ "fill-color": ["get", "color"], "fill-opacity": 0.18 }}
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
                "circle-radius": 4,
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
          {selected ? (
            <Popup
              longitude={selected.longitude}
              latitude={selected.latitude}
              onClose={() => setSelected(null)}
              closeOnClick={false}
            >
              <div className="bg-popover text-popover-foreground rounded-lg border p-3 font-sans max-h-60 overflow-y-auto">
                {zones
                  .filter((z) => selected.ids.includes(z.id))
                  .map((z) => (
                    <Link
                      key={z.id}
                      to="/fares/$nocCode/$fare"
                      params={{ nocCode: noc, fare: z.id }}
                      search={{ generation }}
                      className="block text-sm underline py-2"
                    >
                      {z.name}
                    </Link>
                  ))}
              </div>
            </Popup>
          ) : null}
        </Map>
      </div>
      <div className="border-t p-3 flex flex-col gap-2">
        <p role="status" className="text-xs text-muted-foreground">
          {failed
            ? "Map could not load. Fare details remain available."
            : unavailable
              ? "Stop locations are temporarily unavailable."
              : !mapped.size
                ? "No loaded stops have matching timetable coordinates."
                : `${mapped.size} of ${zones.length} areas have loaded stop locations. No ticket boundaries are published.`}
        </p>
        {zones.length ? (
          <div
            className="flex gap-2 flex-wrap max-h-28 overflow-y-auto"
            aria-label="Map ticket areas"
          >
            <button
              type="button"
              aria-pressed={active === null}
              onClick={() => {
                setActive(null);
                setSelected(null);
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
                  setSelected(null);
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
