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
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { LuCheck, LuChevronsUpDown, LuStar, LuStarOff } from "react-icons/lu";
import { FeatureBadgeIcon } from "../FeatureBadge";
import { VList } from "virtua";
import { useDebounce } from "use-debounce";
export function OperatorCombobox({
  options,
  setValue,
  value,
  favourites,
  setFavourites,
}: {
  options: { value: string; label: string; subtitle: string }[];
  setValue: Dispatch<SetStateAction<string | null>>;
  value: string | null;
  favourites: string[];
  setFavourites: Dispatch<SetStateAction<string[]>>;
}) {
  const [open, setOpen] = useState(false),
    isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <OperatorComboboxTrigger
            value={value}
            options={options}
            open={open}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-[350px] max-w-full p-0 combobox-content"
          align="start"
        >
          <OperatorComboboxContent
            options={options}
            setValue={setValue}
            value={value}
            favourites={favourites}
            setFavourites={setFavourites}
            setOpen={setOpen}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <OperatorComboboxTrigger value={value} options={options} open={open} />
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-4">
          <OperatorComboboxContent
            options={options}
            setValue={setValue}
            value={value}
            favourites={favourites}
            setFavourites={setFavourites}
            setOpen={setOpen}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function OperatorComboboxContent({
  options,
  setValue,
  value,
  favourites,
  setFavourites,
  setOpen,
}: {
  options: { value: string; label: string; subtitle: string }[];
  setValue: Dispatch<SetStateAction<string | null>>;
  value: string | null;
  favourites: string[];
  setFavourites: Dispatch<SetStateAction<string[]>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [search, setSearch] = useState(""),
    [debouncedSearch] = useDebounce(search, 500),
    filteredOptions = useMemo(
      () =>
        debouncedSearch
          ? options.filter(
              (o) =>
                o.label.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                o.subtitle
                  .toLowerCase()
                  .includes(debouncedSearch.toLowerCase()),
            )
          : options,
      [debouncedSearch, options],
    );

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search operators..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="overflow-visible">
        {!debouncedSearch && (
          <OperatorComboboxShortcuts setSearch={setSearch} />
        )}
        <OperatorComboboxOptions
          options={filteredOptions}
          setValue={setValue}
          value={value}
          favourites={favourites}
          setFavourites={setFavourites}
          setOpen={setOpen}
        />
      </CommandList>
    </Command>
  );
}

function OperatorComboboxOptions({
  options,
  setValue,
  value,
  favourites,
  setFavourites,
  setOpen,
}: {
  options: { value: string; label: string; subtitle: string }[];
  setValue: Dispatch<SetStateAction<string | null>>;
  value: string | null;
  favourites: string[];
  setFavourites: Dispatch<SetStateAction<string[]>>;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <>
      <CommandEmpty>No operators found.</CommandEmpty>
      <CommandGroup>
        <VList
          style={{ height: 350 }}
          className="scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-900"
        >
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
              <div className="inline-flex flex-col">
                <span>{option.label}</span>
                <span className="text-xs text-zinc-500">{option.subtitle}</span>
              </div>
              {favourites.includes(option.value) ? (
                <div
                  className="ml-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFavourites((f) => f.filter((o) => o != option.value));
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
        </VList>
      </CommandGroup>
    </>
  );
}

function OperatorComboboxShortcuts({
  setSearch,
}: {
  setSearch: Dispatch<SetStateAction<string>>;
}) {
  return (
    <CommandGroup>
      <div className="flex gap-2 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-900">
        <OperatorComboboxShortcut name="Arriva" setSearch={setSearch} />
        <OperatorComboboxShortcut name="Stagecoach" setSearch={setSearch} />
        <OperatorComboboxShortcut
          name="TfL"
          search="Transport for London"
          setSearch={setSearch}
        />
        <OperatorComboboxShortcut
          name="Go Ahead"
          search="Go "
          setSearch={setSearch}
        />
        <OperatorComboboxShortcut name="First" setSearch={setSearch} />
      </div>
    </CommandGroup>
  );
}

function OperatorComboboxShortcut({
  name,
  search,
  setSearch,
}: {
  name: string;
  search?: string;
  setSearch: Dispatch<SetStateAction<string>>;
}) {
  return (
    <div
      className="bg-zinc-800/50 hover:bg-zinc-800 transition-colors duration-150 rounded-sm px-2 py-1 flex items-center gap-2 cursor-pointer"
      onClick={() => setSearch(search || name)}
    >
      <p className="text-xs font-medium text-zinc-400">{name}</p>
    </div>
  );
}

function OperatorComboboxTrigger({
  value,
  options,
  open,
  ...props
}: {
  value: string | null;
  options: { value: string; label: string; subtitle: string }[];
  open: boolean;
}) {
  return (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className="min-w-[250px] w-fit max-w-full lg:max-w-[350px] justify-between flex"
      {...props}
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
