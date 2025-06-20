import { cn } from "@/lib/utils";
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

export default function Combobox({
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
          <span className="grow-0 shrink-1 overflow-hidden text-ellipsis">
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
          <CommandList>
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}
