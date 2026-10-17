import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import type { Feature } from "@/lib/utils";
import { FeatureBadgeIcon } from "./FeatureBadge";

const features: Feature[] = ["tracking", "timetables", "fares"];

export function FeatureCombobox({
  setFeature,
  feature,
  width,
  children,
}: {
  setFeature: Dispatch<SetStateAction<Feature>>;
  feature: Feature;
  width: number;
  children?: ReactNode;
}) {
  const options = features.filter((option) => option !== feature);

  return (
    <Combobox<Feature>
      items={options}
      value={feature}
      onValueChange={(nextFeature) => {
        if (nextFeature) setFeature(nextFeature);
      }}
    >
      <ComboboxTrigger
        aria-label="Change feature"
        render={<button type="button" className="cursor-pointer" />}
        className="[&>svg]:hidden"
      >
        {children}
      </ComboboxTrigger>
      <ComboboxContent className="min-w-fit max-w-full" style={{ width }}>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem
              key={option}
              value={option}
              disabled={option === "fares"}
            >
              <FeatureBadgeIcon feature={option} className="text-zinc-50" />
              {option.charAt(0).toUpperCase() + option.slice(1)}
              {option === "fares" && (
                <span className="-mb-0.5 text-[10px] text-muted-foreground">
                  Coming soon
                </span>
              )}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
