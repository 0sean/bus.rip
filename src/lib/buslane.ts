const BASE_URL = process.env.BUSLANE_BASE_URL || "http://localhost:3000",
  API_KEY = process.env.BUSLANE_API_KEY,
  ENABLED = process.env.BUSLANE_ENABLED != "0";

export type ApiError = { error: string };

async function get<T>(
  url: string,
  cache: boolean = true,
): Promise<T | ApiError> {
  if (!ENABLED) return { error: "Buslane is not enabled." };
  return await (
    await fetch(`${BASE_URL}/api${url}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      next: {
        revalidate: cache ? 43200 : undefined,
      },
      cache: cache ? undefined : "no-store",
    })
  ).json();
}

export type Stop = {
  id: string;
  code: string;
  name: string;
  lat: string;
  lon: string;
  wheelchair_boarding: boolean;
  location_type: "stop"; // TODO: are there other types?
  platform_code: string | null;
  created_at: string;
  updated_at: string;
  parent_station_id: string | null;
};

export async function getStops(noc: string): Promise<Stop[] | ApiError> {
  return await get<Stop[]>(`/agencies/noc:${noc}/stops`);
}

export type StopTime = {
  id: number;
  stop_id: string;
  trip_id: string;
  arrival_time: string;
  departure_time: string;
  stop_sequence: number | null;
  stop_headsign: string | null;
  pickup_type: number | null;
  drop_off_type: number | null;
  shape_dist_traveled: number | null;
  timepoint: boolean | null;
  created_at: string;
  updated_at: string;
};

export type StopTimeWithAssociations = StopTime & {
  trip: StopTimeTripWithAssociations;
};

export type StopTimeWithStop = StopTime & {
  stop: Stop;
};

export type Trip = {
  id: string;
  route_id: number;
  service_id: number;
  headsign: string | null;
  direction_id: "inbound" | "outbound";
  block_id: string;
  wheelchair_accessible: boolean;
  vehicle_journey_code: string;
  created_at: string;
  updated_at: string;
  shape_id: string | null;
};

export type StopTimeTripWithAssociations = Trip & {
  route: Route & { agency: Agency };
  service: Service;
};

export type TripWithAssociations = Trip & {
  service: Service;
  frequencies: Frequency[];
  stop_times: StopTimeWithStop[];
  shape: Shape | null;
  route: Route;
};

export type TripWithStops = Trip & {
  stop_times: StopTimeWithStop[];
};

type Shape = {
  id: string;
  pt_lat: string;
  pt_lon: string;
  pt_sequence: number;
  dist_traveled: number | null;
  created_at: string;
  updated_at: string;
};

type Frequency = {
  id: number;
  trip_id: string;
  start_time: string;
  end_time: string;
  headway_secs: number;
  exact_times: boolean;
  created_at: string;
  updated_at: string;
};

export type Route = {
  id: number;
  agency_id: string;
  short_name: string;
  long_name: string;
  route_type: number;
  created_at: string;
  updated_at: string;
};

export type RouteWithTrips = Route & {
  trips: Trip[];
};

export type RouteWithStops = Route & {
  trips: TripWithStops[];
};

type Agency = {
  id: string;
  name: string;
  url: string;
  timezone: string | null;
  lang: string | null;
  phone: string | null;
  noc: string;
  created_at: string;
  updated_at: string;
};

type Service = {
  id: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export async function getStopTimes(
  noc: string,
  stopId: string,
): Promise<StopTime[] | ApiError> {
  const data = await get<StopTimeWithAssociations[]>(
    `/timetables/stops/${stopId}/stop_times`,
    true,
  );
  if (Array.isArray(data)) {
    return data.filter(
      (stopTime) =>
        stopTime.trip.route.agency.noc.toLowerCase() === noc.toLowerCase(),
    );
  } else {
    return { error: "Failed to fetch stop times" };
  }
}

export async function getRoutes(
  noc: string,
): Promise<RouteWithTrips[] | ApiError> {
  const data = await get<RouteWithTrips[]>(`/agencies/noc:${noc}/routes`);
  if (Array.isArray(data)) {
    return data;
  } else {
    return { error: "Failed to fetch routes" };
  }
}

export async function getTrip(
  tripId: string,
): Promise<TripWithAssociations | ApiError> {
  const data = await get<TripWithAssociations>(`/timetables/trips/${tripId}`);
  if ("error" in data) {
    return { error: "Failed to fetch trip" };
  }
  return data;
}

export async function getRoute(
  routeId: string,
): Promise<RouteWithStops | ApiError> {
  const data = await get<RouteWithStops>(`/timetables/routes/${routeId}`);
  if ("error" in data) {
    return { error: "Failed to fetch route" };
  }
  return data;
}

export type RouteRow = {
  id: number;
  route: string;
  mainRoute: string;
  additionalRoutes: string[];
};

export function getRouteRow(route: RouteWithTrips): RouteRow {
  const outboundTrips = route.trips?.filter(
      (t) => t.direction_id == "outbound",
    ),
    inboundTrips = route.trips?.filter((t) => t.direction_id == "inbound"),
    allRouteVariations = outboundTrips.map((trip, i) => {
      const oppositeTrip = inboundTrips[i];
      if (!oppositeTrip || !oppositeTrip.headsign)
        return (trip.headsign || "-").replaceAll(" - ", " ");
      if (!trip.headsign) return oppositeTrip.headsign.replaceAll(" - ", " ");
      return `${trip.headsign.replaceAll(" - ", " ")} - ${oppositeTrip.headsign.replaceAll(" - ", " ")}`;
    }),
    routeVariations = allRouteVariations
      .filter((v, i) => allRouteVariations.indexOf(v) === i)
      .sort((a, b) => {
        // if(!b.includes(" - ")) return allRouteVariations.length;
        const freq: Record<string, number> = {};
        for (const x of allRouteVariations) freq[x] = (freq[x] || 0) + 1;
        return freq[b] - freq[a];
      });

  return {
    id: route.id,
    route: route.short_name,
    mainRoute: routeVariations[0],
    additionalRoutes: routeVariations.slice(1),
  };
}
