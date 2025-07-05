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
  return await get<Stop[]>(`/timetables/agencies/noc:${noc}/stops`, true);
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
  trip: Trip;
};

type Trip = {
  id: string;
  route_id: number;
  service_id: number;
  headsign: string | null;
  direction_id: number;
  block_id: string;
  wheelchair_accessible: boolean;
  vehicle_journey_code: string;
  created_at: string;
  updated_at: string;
  shape_id: string | null;
  route: Route;
  service: Service;
};

type Route = {
  id: number;
  agency_id: string;
  short_name: string;
  long_name: string;
  route_type: number;
  created_at: string;
  updated_at: string;
  agency: Agency;
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
  const data = await get<StopTime[]>(
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
