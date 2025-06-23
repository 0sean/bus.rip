import { cn, Feature } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dispatch, SetStateAction, useState } from "react";
import { LuCheck, LuChevronsUpDown, LuStar, LuStarOff } from "react-icons/lu";
import { FeatureBadgeIcon } from "../FeatureBadge";
import { ScrollArea } from "./scroll-area";

export function OperatorCombobox({
  options,
  setValue,
  value,
  favourites,
  setFavourites,
}: {
  options: { value: string; label: string }[];
  setValue: Dispatch<SetStateAction<string | null>>;
  value: string | null;
  favourites: string[];
  setFavourites: Dispatch<SetStateAction<string[]>>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="min-w-[250px] w-fit max-w-full lg:max-w-[350px] justify-between flex"
        >
          <span
            className={`grow-0 shrink-1 overflow-hidden text-ellipsis${!value ? " text-zinc-500" : ""}`}
          >
            {value
              ? options.find((option) => option.value === value)?.label
              : "Select operator..."}
          </span>
          <LuChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[350px] max-w-full p-0 combobox-content"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search operators..." />
          <ScrollArea>
            <CommandList className="overflow-visible">
              <CommandEmpty>No operators found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      setValue(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                  >
                    <LuCheck
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                    {favourites.includes(option.value) ? (
                      <div
                        className="ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFavourites((f) =>
                            f.filter((o) => o != option.value),
                          );
                        }}
                      >
                        <LuStarOff className="mr-2 h-4 w-4" />
                      </div>
                    ) : (
                      <div
                        className="ml-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFavourites((f) => [...f, option.value]);
                        }}
                      >
                        <LuStar className="mr-2 h-4 w-4" />
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FeatureCombobox({
  setFeature,
  feature,
  width,
  children,
}: {
  setFeature: Dispatch<SetStateAction<Feature>>;
  feature: Feature;
  width: number;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="min-w-fit max-w-full p-0 combobox-content"
        align="start"
        style={{ width }}
      >
        <Command>
          <CommandList>
            <CommandGroup>
              {["tracking", "timetables", "fares"]
                .filter((f) => f != feature)
                .map((f) => (
                  <CommandItem
                    key={f}
                    value={f}
                    onSelect={(currentValue) => {
                      setFeature(currentValue as Feature);
                      setOpen(false);
                    }}
                  >
                    <FeatureBadgeIcon
                      feature={f as Feature}
                      className="text-zinc-50"
                    />
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
