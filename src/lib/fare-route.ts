import { getRouteRow, type RouteWithTrips } from "./buslane";
import type { FareItem } from "./fares";

export function fareRouteTitles(routes: RouteWithTrips[]) {
  const titles = new Map<string, Set<string>>();
  for (const route of routes) {
    const key = route.short_name?.trim().toLowerCase();
    if (!key) continue;
    const title = getRouteRow(route).mainRoute;
    if (!title || title === "-" || title === route.short_name) continue;
    const names = titles.get(key) ?? new Set<string>();
    names.add(title);
    titles.set(key, names);
  }
  // A line number can have several timetable routes. Retain their distinct
  // endpoint names rather than silently choosing an unrelated first match.
  return new Map(
    [...titles].map(([line, names]) => [line, [...names].join(" / ")]),
  );
}

export function fareRouteDirections(
  item: FareItem,
): ("inbound" | "outbound")[] {
  const published = (item.directions ?? []).flatMap(
    (value) => value.match(/\b(?:inbound|outbound)\b/gi) ?? [],
  );
  const values = published.length
    ? published
    : (item.name.match(/\b(?:inbound|outbound)\b/gi) ?? []);
  return [
    ...new Set(
      values.map((value) => value.toLowerCase() as "inbound" | "outbound"),
    ),
  ];
}
