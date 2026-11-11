import { ClientOnly } from "@tanstack/react-router";
import { useLocalStorage } from "@uidotdev/usehooks";
import { Dispatch, ReactNode, SetStateAction } from "react";

export function ClientOnlyStorage<T>({
  storageKey: key,
  defaultValue,
  children,
}: {
  storageKey: string;
  defaultValue: T;
  children: (value: T, setValue: Dispatch<SetStateAction<T>>) => ReactNode;
}) {
  return (
    <ClientOnly fallback={children(defaultValue, () => {})}>
      <WithStorage key={key} defaultValue={defaultValue} children={children} />
    </ClientOnly>
  );
}

function WithStorage<T>({
  key,
  defaultValue,
  children,
}: {
  key: string;
  defaultValue: T;
  children: (value: T, setValue: Dispatch<SetStateAction<T>>) => ReactNode;
}) {
  const [value, setValue] = useLocalStorage<T>(key, defaultValue);
  return children(value, setValue);
}
