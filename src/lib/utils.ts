import { NocLine } from "@database-schema";

export { cn } from "cn";
export type Feature = "tracking" | "timetables" | "fares";

export function transformOperators(operators: NocLine[]) {
  const preferredOperators = [
    "Arriva",
    "Stagecoach",
    "Brighton & Hove Bus and Coach Company",
    "East Yorkshire",
    "Go-Ahead",
    "Go Ahead",
    "Go North East",
    "Go North West",
    "Oxford Bus Company",
    "Metrobus",
  ];

  const isPreferred = (name: string) =>
    preferredOperators.some((preferred) => name.includes(preferred));

  return [...operators]
    .sort(
      (a, b) =>
        Number(a.hasMissingLocationData) - Number(b.hasMissingLocationData) ||
        Number(isPreferred(b.publicName)) - Number(isPreferred(a.publicName)) ||
        a.publicName.localeCompare(b.publicName),
    )
    .map(({ nocCode, publicName, referenceName, hasMissingLocationData }) => {
      const subtitle = referenceName !== publicName ? referenceName : "";
      const label = subtitle ? `${publicName} - ${subtitle}` : publicName;

      return {
        value: JSON.stringify([nocCode, label]),
        label: publicName,
        subtitle,
        hasMissingLocationData,
      };
    });
}
