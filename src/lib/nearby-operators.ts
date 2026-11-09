import type { Vehicle } from "./bods";

export function nearbyOperators<T extends { value: string }>(
  operators: T[],
  vehicles: Vehicle[] | null,
  now = Date.now(),
): T[] {
  const codes = new Set(
    vehicles
      ?.filter((vehicle) => Date.parse(vehicle.validUntil) > now)
      .map((vehicle) => vehicle.operatorRef?.trim().toUpperCase())
      .filter(Boolean),
  );
  return operators.filter((operator) =>
    codes.has(operator.value.trim().toUpperCase()),
  );
}
