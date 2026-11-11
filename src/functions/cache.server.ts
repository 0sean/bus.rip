type Entry = { expiresAt: number; promise: Promise<unknown> };
const entries = new Map<string, Entry>();
const MAX_ENTRIES = 200;

// Public transit data only. Share in-flight reads and bound process memory.
export function cached<T>(
  key: string,
  ttl: number,
  load: () => Promise<T>,
): Promise<T> {
  const existing = entries.get(key);
  if (existing && existing.expiresAt > Date.now())
    return existing.promise as Promise<T>;
  entries.delete(key);
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  const entry: Entry = {
    expiresAt: Infinity,
    promise: Promise.resolve().then(load),
  };
  entries.set(key, entry);
  entry.promise.then(
    () => {
      entry.expiresAt = Date.now() + ttl;
    },
    () => {
      if (entries.get(key) === entry) entries.delete(key);
    },
  );
  return entry.promise as Promise<T>;
}

export function invalidateCache(prefix: string) {
  for (const key of entries.keys())
    if (key.startsWith(prefix)) entries.delete(key);
}
