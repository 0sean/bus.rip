import { useState, useEffect } from "react";

export function useMediaQuery(query: string) {
  const defaultValue =
    typeof window !== "undefined" ? matchMedia(query).matches : false;
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}
