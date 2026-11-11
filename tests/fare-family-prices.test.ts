import { describe, expect, it, vi } from "vitest";
import {
  familyPrice,
  summariseFarePrices,
  type FareItem,
  type FarePage,
  type FareRequest,
} from "../src/lib/fares";
import { priceFareFamilies } from "../src/lib/fare-family-prices";

const ticket = (amount: string, extra: Partial<FareItem> = {}): FareItem => ({
  id: "ticket_test",
  name: "Day",
  kind: "ticket",
  revision: 1,
  ticket_count: 0,
  price_basis: "published",
  prices: [{ amount, currency: "GBP" }],
  ...extra,
});
const family: FareItem = {
  id: "family_test",
  name: "Day",
  kind: "family",
  revision: 1,
  ticket_count: 2,
};
const label = (tickets: FareItem[]) =>
  familyPrice({ ...family, price_summary: summariseFarePrices(tickets) });
const page = (
  data: FareItem[],
  nextCursor: string | null = null,
  generation = "8",
): FarePage<FareItem[]> => ({ data, nextCursor, generation, version: "1" });

describe("ticket family price labels", () => {
  it("shows one price for equal amounts and a numeric range for different prices", () => {
    expect(label([ticket("6.00"), ticket("6.0")])).toBe("£6.00");
    expect(label([ticket("12.00"), ticket("2.40"), ticket("6.00")])).toBe(
      "£2.40–£12.00",
    );
    expect(label([ticket("0.00")])).toBe("£0.00");
  });
  it("finds a range across multiple prices within each variant", () => {
    expect(
      label([
        ticket("1", {
          prices: [
            { amount: "9", currency: "GBP" },
            { amount: "3", currency: "GBP" },
          ],
        }),
        ticket("12"),
      ]),
    ).toBe("£3.00–£12.00");
  });
  it("keeps separate currencies separate", () => {
    expect(
      label([
        ticket("2"),
        ticket("5"),
        ticket("3", { prices: [{ amount: "3", currency: "EUR" }] }),
      ]),
    ).toBe("£2.00–£5.00 / €3.00");
  });
  it("labels journey-dependent and conditional published amounts", () => {
    expect(
      label([
        ticket("1.80", { price_basis: "journey" }),
        ticket("3.00", { price_basis: "journey" }),
      ]),
    ).toBe("£1.80–£3.00 · Depends on journey");
    expect(label([ticket("5", { price_basis: "conditional" })])).toBe(
      "£5.00 · Check ticket conditions",
    );
  });
  it("does not imply a complete range from truncated, missing or invalid amounts", () => {
    for (const tickets of [
      [],
      [ticket("5", { prices_truncated: true })],
      [ticket("5", { prices: [] })],
      [ticket("Infinity")],
      [ticket("")],
    ]) {
      expect(label(tickets)).toBe("Prices vary · Check ticket conditions");
    }
  });
});

describe("ticket family price aggregation", () => {
  it("traverses every variant page at the original generation and retains family pagination", async () => {
    const read = vi.fn(async (request: FareRequest) =>
      request.cursor
        ? page([ticket("12")])
        : page([ticket("3")], "more-variants"),
    );
    const result = await priceFareFamilies(
      page([family], "more-families"),
      "ANEA",
      read,
    );
    expect(result.nextCursor).toBe("more-families");
    expect(familyPrice(result.data[0])).toBe("£3.00–£12.00");
    expect(result.data[0].single_ticket_id).toBeUndefined();
    expect(read).toHaveBeenLastCalledWith({
      noc: "ANEA",
      action: "familyTickets",
      id: family.id,
      generation: "8",
      cursor: "more-variants",
    });
  });
  it("rejects mixed generations and repeated cursors", async () => {
    await expect(
      priceFareFamilies(page([family]), "ANEA", async () =>
        page([], null, "9"),
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      priceFareFamilies(page([family]), "ANEA", async () =>
        page([], "repeated"),
      ),
    ).rejects.toThrow("Repeated family price cursor");
  });
  it("bounds concurrent variant reads to four", async () => {
    let active = 0,
      peak = 0;
    const families = Array.from({ length: 9 }, (_, i) => ({
      ...family,
      id: `family_${i}`,
    }));
    const result = await priceFareFamilies(page(families), "ANEA", async () => {
      peak = Math.max(peak, ++active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return page([ticket("6")]);
    });
    expect(peak).toBe(4);
    expect(result.data.every((item) => familyPrice(item) === "£6.00")).toBe(
      true,
    );
  });
});

it("links directly only when the complete family contains one ticket", async () => {
  const single = await priceFareFamilies(
    page([{ ...family, variant_count: 1 }]),
    "ANEA",
    async () => page([ticket("6")]),
  );
  expect(single.data[0].single_ticket_id).toBe("ticket_test");
  const empty = await priceFareFamilies(
    page([{ ...family, variant_count: 1 }]),
    "ANEA",
    async () => page([]),
  );
  expect(empty.data[0].single_ticket_id).toBeUndefined();
  const multiple = await priceFareFamilies(
    page([{ ...family, variant_count: 1 }]),
    "ANEA",
    async (request) =>
      request.cursor
        ? page([ticket("8", { id: "ticket_second" })])
        : page([ticket("6")], "next"),
  );
  expect(multiple.data[0].single_ticket_id).toBeUndefined();
});
