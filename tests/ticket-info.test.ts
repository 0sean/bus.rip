import { describe, expect, it } from "vitest";
import {
  ticketInformation,
  ticketDuration,
  ticketAvailability,
  ticketDisplayPrice,
  ticketPassengers,
  ticketSales,
} from "../src/lib/ticket-info";
import type { FareItem } from "../src/lib/fares";
const ticket: FareItem = {
  id: "ticket_test",
  name: "Adult day pass",
  kind: "ticket",
  revision: 1,
  ticket_count: 0,
  price_basis: "published",
  prices: [{ amount: "10.00", currency: "GBP" }],
  eligibility: ["adult"],
  sales_channels: ["onBoard"],
  product_type: "periodPass",
  duration_rules: [
    {
      duration: "P1d",
      name: "1 day",
      start_time: "03:00:00",
      end_time: "02:59:59",
    },
  ],
  valid_from: ["2026-11-04T00:00:00", "2026-11-04T00:00:00Z"],
  valid_until: ["2126-11-04T00:00:00"],
};
describe("passenger-friendly ticket information", () => {
  it("translates passenger types, sales channels and case-insensitive durations", () => {
    expect(ticketPassengers(ticket)).toBe("Adult");
    expect(ticketSales(ticket)).toBe("On board");
    expect(ticketDuration(ticket)).toBe("1 day");
    expect(
      ticketDuration({ ...ticket, duration_rules: [], duration: ["PT1H30M"] }),
    ).toBe("1 hour 30 minutes");
  });
  it("shows useful payment, ticket format, weekdays and overnight times", () => {
    const rows = ticketInformation({
      ...ticket,
      detail: {
        conditions: {
          PaymentMethods: ["cash contactlessPaymentCard"],
          MediaType: ["paperTicket"],
          DaysOfWeek: [
            "Monday Tuesday Wednesday Thursday Friday Saturday Sunday",
          ],
        },
      },
    });
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Published payment methods",
          value: "Cash · Contactless card",
        }),
        expect.objectContaining({
          label: "Ticket format",
          value: "Paper ticket",
        }),
        expect.objectContaining({ label: "Travel days", value: "Every day" }),
        expect.objectContaining({
          label: "Published travel-day hours",
          value: "03:00–02:59 (overnight)",
        }),
      ]),
    );
  });
  it("keeps publication dates separate from ticket duration and omits administrative far-future dates", () => {
    expect(ticketAvailability(ticket)).toBe("Published from 4 Nov 2026");
    expect(
      ticketInformation(ticket).find(
        (row) => row.label === "Published fare dates",
      )?.description,
    ).toContain("ticket duration is shown separately");
    expect(JSON.stringify(ticketInformation(ticket))).not.toContain("2126");
  });
  it("does not expose unknown raw values or source references", () => {
    const rows = ticketInformation({
      ...ticket,
      eligibility: ["fxc:private_ref"],
      sales_channels: ["unknown_internal_value"],
      line_refs: ["ANEA:PB0002717:308:X4", "a".repeat(64)],
      detail: {
        conditions: { TariffRef: ["Tariff@PRIVATE"], CanTransfer: ["false"] },
      },
    });
    expect(rows).toContainEqual(
      expect.objectContaining({ label: "Bus services", value: "X4" }),
    );
    const text = JSON.stringify(rows);
    for (const raw of [
      "fxc:",
      "unknown_internal_value",
      "Tariff@PRIVATE",
      "a".repeat(64),
    ])
      expect(text).not.toContain(raw);
  });
  it("retains journey-dependent pricing and shows ranges only for published flat prices", () => {
    expect(ticketDisplayPrice({ ...ticket, price_basis: "journey" })).toBe(
      "Choose a journey",
    );
    expect(
      ticketDisplayPrice({
        ...ticket,
        prices: [
          { amount: "2", currency: "GBP" },
          { amount: "5", currency: "GBP" },
        ],
      }),
    ).toBe("£2.00–£5.00");
  });
});
