import { useHydrated } from "@tanstack/react-router";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { LuChevronsUpDown, LuSearch, LuStar, LuStarOff } from "react-icons/lu";
import { useDebounce } from "use-debounce";
import { VList, type VListHandle } from "virtua";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/use-media-query";
import { Star } from "lucide-react";

type OperatorOption = {
  value: string;
  label: string;
  subtitle: string;
  hasMissingLocationData: boolean;
};

const shortcuts = [
  { name: "Arriva", search: "Arriva" },
  { name: "Stagecoach", search: "Stagecoach" },
  { name: "TfL", search: "Transport for London" },
  { name: "Go Ahead", search: "Go " },
  { name: "First", search: "First" },
];

export function OperatorCombobox({
  options,
  setValue,
  value,
  favourites,
  setFavourites,
  loading = false,
}: {
  options: OperatorOption[];
  setValue: Dispatch<SetStateAction<string | null>>;
  value: string | null;
  favourites: string[];
  setFavourites: Dispatch<SetStateAction<string[]>>;
  loading?: boolean;
}) {
  const hydrated = useHydrated();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);
  const listRef = useRef<VListHandle>(null);
  const filteredOptions = useMemo(() => {
    const query = debouncedSearch.toLowerCase();
    return options.filter(
      (option) =>
        (!favouritesOnly || favourites.includes(option.value)) &&
        (option.label.toLowerCase().includes(query) ||
          option.subtitle.toLowerCase().includes(query)),
    );
  }, [debouncedSearch, options, favouritesOnly, favourites]);
  const selectedOption =
    options.find((option) => option.value === value) ?? null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
      setFavouritesOnly(false);
    }
  }

  const trigger = (
    <Button
      variant="outline"
      size="lg"
      className="flex w-full max-w-full justify-between"
      disabled={!hydrated || loading}
      aria-busy={loading}
      aria-label={
        selectedOption ? `Operator: ${selectedOption.label}` : "Select operator"
      }
    >
      <span
        className={`shrink truncate${!value ? " text-muted-foreground" : ""}`}
      >
        {selectedOption?.label ?? "Select operator..."}
      </span>
      <LuChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
    </Button>
  );

  const content = (
    <>
      <div className="flex h-9 items-center gap-2 border-b border-zinc-800 px-3">
        <LuSearch className="size-4 shrink-0 text-zinc-400 opacity-80" />
        <ComboboxPrimitive.Input
          placeholder="Search operators..."
          aria-label="Search operators"
          className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="flex w-full gap-2 overflow-x-auto p-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-900">
        <button
          type="button"
          aria-pressed={favouritesOnly}
          className="flex gap-1 items-center shrink-0 rounded-sm bg-zinc-800/50 px-2 py-1 text-xs font-medium text-zinc-400 transition-colors duration-150 hover:bg-zinc-800 aria-pressed:bg-zinc-800 aria-pressed:text-zinc-50"
          onClick={() => setFavouritesOnly((current) => !current)}
        >
          <Star size={12} />
          Favourites
        </button>
        {shortcuts.map((shortcut) => (
          <button
            key={shortcut.name}
            type="button"
            className="shrink-0 rounded-sm bg-zinc-800/50 px-2 py-1 text-xs font-medium text-zinc-400 transition-colors duration-150 hover:bg-zinc-800"
            onClick={() => {
              setFavouritesOnly(false);
              setSearch(shortcut.search);
            }}
          >
            {shortcut.name}
          </button>
        ))}
      </div>
      <ComboboxEmpty className="flex py-6 empty:py-0">
        {favouritesOnly
          ? "No favourite operators found."
          : "No operators found."}
      </ComboboxEmpty>
      <ComboboxList className="max-h-none overflow-hidden">
        {filteredOptions.length > 0 && (
          <VList
            ref={listRef}
            style={{ height: debouncedSearch ? 292 : 260, maxHeight: "50dvh" }}
            className="scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-zinc-900 [scrollbar-gutter:stable]"
          >
            {filteredOptions.map((option, index) => {
              const favourite = favourites.includes(option.value);
              return (
                <ComboboxItem
                  key={option.value}
                  value={option}
                  index={index}
                  className="rounded-sm py-1.5 pr-2 pl-10 text-zinc-50 data-highlighted:bg-zinc-800 data-highlighted:text-zinc-50 not-data-[variant=destructive]:data-highlighted:**:text-inherit [&>span:last-child]:right-auto [&>span:last-child]:left-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span>{option.label}</span>
                    {option.subtitle && (
                      <span className="text-xs text-zinc-500!">
                        {option.subtitle}
                      </span>
                    )}
                    {option.hasMissingLocationData && (
                      <span className="text-xs text-amber-400!">
                        Historically no live location
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ml-auto mr-2 shrink-0 text-zinc-400!"
                    aria-label={`${favourite ? "Remove" : "Add"} ${option.label} ${favourite ? "from" : "to"} favourites`}
                    aria-pressed={favourite}
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      setFavourites((current) =>
                        current.includes(option.value)
                          ? current.filter((item) => item !== option.value)
                          : [...current, option.value],
                      );
                    }}
                  >
                    {favourite ? <LuStarOff /> : <LuStar />}
                  </button>
                </ComboboxItem>
              );
            })}
          </VList>
        )}
      </ComboboxList>
    </>
  );

  return (
    <Combobox<OperatorOption>
      items={options}
      filteredItems={filteredOptions}
      value={selectedOption}
      onValueChange={(option) => {
        setValue(option?.value === value ? "" : (option?.value ?? null));
        handleOpenChange(false);
      }}
      isItemEqualToValue={(option, selected) => option.value === selected.value}
      inputValue={search}
      onInputValueChange={setSearch}
      open={open}
      onOpenChange={handleOpenChange}
      inline={!isDesktop}
      autoHighlight
      virtualized
      onItemHighlighted={(option, details) => {
        if (option && details.reason === "keyboard") {
          listRef.current?.scrollToIndex(filteredOptions.indexOf(option), {
            align: "nearest",
          });
        }
      }}
    >
      {isDesktop ? (
        <>
          <ComboboxPrimitive.Trigger render={trigger} />
          <ComboboxContent
            sideOffset={4}
            className="w-[350px] min-w-0 max-w-full rounded-md border border-zinc-800 bg-zinc-900 text-zinc-50 ring-0"
          >
            {content}
          </ComboboxContent>
        </>
      ) : (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerTrigger render={trigger} />
          <DrawerContent aria-describedby={undefined}>
            <DrawerTitle className="sr-only">Select operator</DrawerTitle>
            <div className="group/combobox-content">{content}</div>
          </DrawerContent>
        </Drawer>
      )}
    </Combobox>
  );
}
