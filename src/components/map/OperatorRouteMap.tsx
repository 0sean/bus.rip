import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Point } from "geojson";
import { Link } from "@tanstack/react-router";
import {
  Map,
  Layer,
  Source,
  Popup,
  NavigationControl,
  type MapRef,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import { routeNetworkOptions } from "@/data/queries";
import {
  getRouteRow,
  type RouteWithStops,
  type RouteWithTrips,
  type StopTimeWithStop,
} from "@/lib/buslane";
import {
  networkBounds,
  routeLines,
  type RouteNetwork,
} from "@/lib/route-network";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";
import { Card, CardContent } from "../ui/card";
import { IconChevronRight } from "@tabler/icons-react";

const HIT_LAYER = "operator-route-hit";
const STOP_HIT_LAYER = "trip-stop-hit";
const COLORS = [
  "#60a5fa",
  "#fb923c",
  "#4ade80",
  "#c084fc",
  "#f87171",
  "#facc15",
];

type Selection = {
  ids: number[];
  longitude: number;
  latitude: number;
  pinned: boolean;
};

export default function OperatorRouteMap({
  noc,
  routes,
  route,
  variant = "overview",
  stopTimes,
}: {
  noc: string;
  routes: RouteWithTrips[];
  route?: RouteWithStops;
  variant?: "overview" | "trip";
  stopTimes?: StopTimeWithStop[];
}) {
  const {
    data: operatorData,
    isPending,
    error,
    refetch,
    isFetching,
  } = useQuery({
    ...routeNetworkOptions(noc),
    enabled: !route,
  });
  const data = useMemo(() => {
    if (!route) return operatorData;
    const coordinates = routeLines(route.trips);
    const network: RouteNetwork = {
      type: "FeatureCollection",
      features: coordinates.length
        ? [
            {
              type: "Feature",
              id: route.id,
              properties: { routeId: route.id },
              geometry: { type: "MultiLineString", coordinates },
            },
          ]
        : [],
    };
    return { network, missingRouteIds: [] };
  }, [route, operatorData]);
  const map = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hoveredStop, setHoveredStop] = useState<{
    name: string;
    longitude: number;
    latitude: number;
  } | null>(null);
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const stops = useMemo<FeatureCollection<Point>>(() => {
    const seen = new Set<string>();
    const features: FeatureCollection<Point>["features"] = [];
    for (const { stop } of stopTimes ?? []) {
      if (!stop || seen.has(stop.id)) continue;
      const longitude = Number(stop.lon);
      const latitude = Number(stop.lat);
      if (
        stop.lon == null ||
        stop.lat == null ||
        String(stop.lon).trim() === "" ||
        String(stop.lat).trim() === "" ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        Math.abs(longitude) > 180 ||
        Math.abs(latitude) > 90
      )
        continue;
      seen.add(stop.id);
      features.push({
        type: "Feature",
        properties: { name: stop.name },
        geometry: { type: "Point", coordinates: [longitude, latitude] },
      });
    }
    return { type: "FeatureCollection", features };
  }, [stopTimes]);
  const rows = useMemo(
    () =>
      new globalThis.Map(
        routes.map((route) => [
          route.id,
          { ...getRouteRow(route), longName: route.long_name },
        ]),
      ),
    [routes],
  );
  const network = useMemo(
    () =>
      data
        ? {
            ...data.network,
            features: data.network.features.map((feature) => ({
              ...feature,
              properties: {
                ...feature.properties,
                color:
                  COLORS[Math.abs(feature.properties.routeId) % COLORS.length],
              },
            })),
          }
        : null,
    [data],
  );
  const bounds = useMemo(
    () => (data ? networkBounds(data.network) : null),
    [data],
  );
  const fitRoute = useCallback(() => {
    if (loaded && bounds) {
      const wide = (map.current?.getContainer().clientWidth ?? 0) > 640;
      map.current?.fitBounds(bounds, {
        padding:
          variant === "trip"
            ? wide
              ? { left: 380, right: 40, top: 40, bottom: 40 }
              : { left: 30, right: 30, top: 360, bottom: 80 }
            : route
              ? wide
                ? { left: 380, right: 40, top: 40, bottom: 40 }
                : { left: 30, right: 30, top: 180, bottom: 35 }
              : 40,
        maxZoom: 14,
        duration: 0,
      });
    }
  }, [loaded, bounds, route, variant]);
  useEffect(fitRoute, [fitRoute]);

  function clearHover() {
    setSelection((previous) => (previous?.pinned ? previous : null));
  }

  function hoverStop(event: MapLayerMouseEvent) {
    const feature = event.features?.find(
      (feature) => feature.layer.id === STOP_HIT_LAYER,
    );
    if (feature?.geometry.type === "Point" && feature.properties.name) {
      const [longitude, latitude] = feature.geometry.coordinates;
      setHoveredStop({ name: feature.properties.name, longitude, latitude });
      event.target.getCanvas().style.cursor = "pointer";
    } else {
      setHoveredStop(null);
      event.target.getCanvas().style.cursor = "grab";
    }
  }

  function selectRoutes(event: MapLayerMouseEvent, pinned: boolean) {
    if (
      (event.originalEvent.target as HTMLElement)?.closest?.(
        ".maplibregl-popup, .maplibregl-ctrl",
      )
    ) {
      if (!pinned) clearHover();
      return;
    }
    const ids = [
      ...new Set(
        (event.features ?? []).map((feature) =>
          Number(feature.properties.routeId),
        ),
      ),
    ].filter((id) => rows.has(id));
    event.target.getCanvas().style.cursor = ids.length ? "pointer" : "grab";
    if (pinned) {
      setSelection(
        ids.length
          ? {
              ids,
              longitude: event.lngLat.lng,
              latitude: event.lngLat.lat,
              pinned,
            }
          : null,
      );
    } else {
      setSelection((previous) =>
        previous?.pinned
          ? previous
          : ids.length
            ? {
                ids,
                longitude: event.lngLat.lng,
                latitude: event.lngLat.lat,
                pinned,
              }
            : null,
      );
    }
  }

  const missing = data?.missingRouteIds.length ?? 0;
  return (
    <section
      aria-label={
        route ? `Route ${route.short_name} map` : "Operator route map"
      }
      className={cn(
        "relative overflow-hidden rounded-[14px] border bg-muted/30",
        variant === "trip" ? "h-[648px]" : "h-[352px]",
      )}
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
        onResize={fitRoute}
        onError={() => setMapError(true)}
        interactiveLayerIds={[
          ...(network && !route ? [HIT_LAYER] : []),
          ...(stops.features.length ? [STOP_HIT_LAYER] : []),
        ]}
        onMouseMove={route ? hoverStop : (event) => selectRoutes(event, false)}
        onMouseLeave={() => {
          setHoveredStop(null);
          clearHover();
          if (map.current) map.current.getCanvas().style.cursor = "grab";
        }}
        onClick={route ? undefined : (event) => selectRoutes(event, true)}
        scrollZoom={false}
        touchPitch={false}
        dragRotate={false}
        attributionControl={{ compact: true }}
      >
        <NavigationControl
          position={variant === "trip" ? "bottom-right" : "top-right"}
          showCompass={false}
        />
        {network ? (
          <Source id="operator-routes" type="geojson" data={network}>
            <Layer
              id="operator-route-casing"
              type="line"
              paint={{
                "line-color": dark ? "#171717" : "#ffffff",
                "line-width": 6,
                "line-opacity": 0.8,
              }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
            <Layer
              id="operator-route-lines"
              type="line"
              paint={{
                "line-color": ["get", "color"],
                "line-width": 3,
                "line-opacity": 0.85,
              }}
              layout={{ "line-join": "round", "line-cap": "round" }}
            />
            <Layer
              id={HIT_LAYER}
              type="line"
              paint={{ "line-width": 18, "line-opacity": 0 }}
            />
          </Source>
        ) : null}
        {stops.features.length ? (
          <Source id="trip-stops" type="geojson" data={stops}>
            <Layer
              id={STOP_HIT_LAYER}
              type="circle"
              paint={{ "circle-radius": 9, "circle-opacity": 0 }}
            />
            <Layer
              id="trip-stop-dots"
              type="circle"
              paint={{
                "circle-radius": 3,
                "circle-color": dark ? "#171717" : "#ffffff",
                "circle-stroke-width": 1.5,
                "circle-stroke-color": route
                  ? COLORS[Math.abs(route.id) % COLORS.length]
                  : dark
                    ? "#fafafa"
                    : "#262626",
              }}
            />
          </Source>
        ) : null}
        {hoveredStop ? (
          <Popup
            longitude={hoveredStop.longitude}
            latitude={hoveredStop.latitude}
            anchor="bottom"
            offset={10}
            closeButton={false}
            closeOnClick={false}
            maxWidth="240px"
            className="pointer-events-none"
          >
            <div
              role="tooltip"
              className="rounded-md border bg-popover px-2.5 py-1.5 font-sans text-xs font-medium text-popover-foreground shadow-sm"
            >
              {hoveredStop.name}
            </div>
          </Popup>
        ) : null}
        {!route && selection ? (
          <Popup
            longitude={selection.longitude}
            latitude={selection.latitude}
            closeOnClick={false}
            closeButton={false}
            onClose={() => setSelection(null)}
            className="pb-2 !min-w-64"
            maxWidth="calc(100vw - 2rem)"
          >
            <Card className="w-xs max-w-[calc(100vw-2rem)] !font-sans gap-0 py-0">
              <CardContent className="p-0 max-h-48 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/30 hover:scrollbar-thumb-muted-foreground/50">
                {selection.ids.map((id) => {
                  const route = rows.get(id)!;
                  return (
                    <Link
                      key={id}
                      to="/timetables/$nocCode/route/$route"
                      params={{ nocCode: noc, route: String(id) }}
                      className="flex gap-2 items-center px-4 py-3 border-b last:border-b-0 font-medium hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span
                        className={`shrink-0 size-6 bg-muted text-primary flex justify-center items-center rounded-md ${route.route.length > 1 ? (route.route.length > 2 ? "text-[10px]" : "text-xs") : "text-sm"}`}
                      >
                        {route.route}
                      </span>
                      <span>
                        {route.mainRoute || route.longName || route.route}
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
      {(!route && (isPending || error)) || !bounds || mapError || missing ? (
        <div
          role={error ? "alert" : "status"}
          className={`absolute left-3 ${route ? "bottom-10" : "top-14"} max-w-[calc(100%-5rem)] rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-sm`}
        >
          {!route && isPending
            ? "Loading operator routes…"
            : !route && error
              ? "Route map is temporarily unavailable."
              : mapError
                ? "Map tiles could not load. Timetables are available below."
                : !bounds
                  ? "No route locations are available yet."
                  : `${missing} route${missing === 1 ? " is" : "s are"} missing some map data.`}
          {!route && (error || missing) ? (
            <button
              type="button"
              className="ml-2 underline cursor-pointer"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              {isFetching ? "Retrying…" : "Retry"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
