import {
  FareApiError,
  summariseFarePrices,
  type FareItem,
  type FarePage,
  type FareRequest,
} from "./fares";

export async function priceFareFamilies(
  page: FarePage<FareItem[]>,
  noc: string,
  read: (request: FareRequest) => Promise<FarePage<FareItem[]>>,
) {
  let next = 0,
    reads = 0;
  const families = [...page.data];
  await Promise.all(
    Array.from({ length: Math.min(4, families.length) }, async () => {
      while (next < families.length) {
        const index = next++;
        const family = families[index];
        const tickets: FareItem[] = [];
        const cursors = new Set<string>();
        let cursor: string | undefined;
        do {
          if (++reads > 1000)
            throw new Error("Family price request budget exceeded");
          const variants = await read({
            noc,
            action: "familyTickets",
            id: family.id,
            generation: page.generation,
            cursor,
          });
          if (variants.generation !== page.generation)
            throw new FareApiError(
              409,
              "Fares have changed. Load the latest fares to continue.",
            );
          tickets.push(...variants.data);
          cursor = variants.nextCursor ?? undefined;
          if (cursor && cursors.has(cursor))
            throw new Error("Repeated family price cursor");
          if (cursor) cursors.add(cursor);
        } while (cursor);
        families[index] = {
          ...family,
          price_summary: summariseFarePrices(tickets),
          single_ticket_id:
            tickets.length === 1 && tickets[0].kind === "ticket"
              ? tickets[0].id
              : undefined,
        };
      }
    }),
  );
  return { ...page, data: families };
}
