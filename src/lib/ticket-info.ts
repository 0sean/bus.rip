import {
  fareDate,
  fareTerm,
  ticketPrice,
  familyPrice,
  summariseFarePrices,
  type FareItem,
} from "./fares";

export type TicketInfoRow = {
  icon: "ticket" | "user" | "clock" | "bus" | "payment" | "calendar" | "route";
  label: string;
  value: string;
  description?: string;
};
const unique = (values: string[]) => [...new Set(values)].join(" · ");
const friendly = (
  values: string[] | undefined,
  names: Record<string, string>,
) =>
  unique(
    (values ?? []).flatMap((value) => {
      const known = names[value.toLowerCase().replace(/[_ -]/g, "")];
      return known ? [known] : [];
    }),
  );

export function ticketPassengers(item: FareItem) {
  return friendly(item.eligibility, {
    adult: "Adult",
    child: "Child",
    youngperson: "Young person",
    student: "Student",
    senior: "Senior",
    anyone: "Anyone",
    infant: "Infant",
    family: "Family",
    group: "Group",
    disabled: "Disabled passenger",
    companion: "Companion",
  });
}
export function ticketSales(item: FareItem) {
  return friendly(item.sales_channels, {
    onboard: "On board",
    mobiledevice: "In the app",
    mobileapp: "In the app",
    online: "Online",
    internet: "Online",
    ticketoffice: "Ticket office",
    ticketmachine: "Ticket machine",
    agency: "Ticket agent",
    driver: "From the driver",
  });
}
export function ticketDuration(item: FareItem) {
  const durations = [
    ...(item.duration ?? []),
    ...(item.duration_rules ?? []).map((rule) => rule.duration ?? ""),
  ].filter(Boolean);
  const labels = durations.flatMap((value) => {
    const match = /^P(\d+)([DWMY])$/i.exec(value);
    if (match) return [fareTerm(`P${match[1]}${match[2].toUpperCase()}`)];
    const hours = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(value);
    if (hours && (hours[1] || hours[2]))
      return [
        [
          hours[1] ? `${hours[1]} ${hours[1] === "1" ? "hour" : "hours"}` : "",
          hours[2]
            ? `${hours[2]} ${hours[2] === "1" ? "minute" : "minutes"}`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      ];
    return [];
  });
  return (
    unique(labels) ||
    friendly(item.product_type ? [item.product_type] : [], {
      singletrip: "Single journey",
      returntrip: "Return journey",
      dayreturntrip: "Same-day return",
    })
  );
}
export function ticketDisplayPrice(item: FareItem) {
  return item.price_basis === "published"
    ? familyPrice({ ...item, price_summary: summariseFarePrices([item]) })
    : ticketPrice(item);
}
function dates(values?: string[]) {
  return [...new Set((values ?? []).map((value) => value.slice(0, 10)))].filter(
    (value) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)),
  );
}
export function ticketAvailability(item: FareItem) {
  const starts = dates(item.valid_from);
  // Far-future administrative end dates are not a useful passenger expiry date.
  const ends = dates(item.valid_until).filter(
    (value) => Number(value.slice(0, 4)) < 2100,
  );
  if (starts.length === 1 && ends.length === 1)
    return `Published ${fareDate(starts[0])} – ${fareDate(ends[0])}`;
  if (starts.length === 1) return `Published from ${fareDate(starts[0])}`;
  if (ends.length === 1) return `Published until ${fareDate(ends[0])}`;
  return "Published ticket conditions apply";
}

export function ticketInformation(item: FareItem): TicketInfoRow[] {
  const conditions = item.detail?.conditions ?? {};
  const rows: TicketInfoRow[] = [];
  const add = (
    icon: TicketInfoRow["icon"],
    label: string,
    value: string,
    description?: string,
  ) => {
    if (value)
      rows.push({
        icon,
        label,
        value,
        ...(description ? { description } : {}),
      });
  };
  add(
    "ticket",
    "Ticket type",
    friendly(item.product_type ? [item.product_type] : [], {
      singletrip: "Single journey",
      returntrip: "Return journey",
      dayreturntrip: "Same-day return",
      periodpass: "Travel pass",
      multitrip: "Multiple-journey ticket",
      carnet: "Bundle of journeys",
    }),
  );
  add("user", "Who can travel", ticketPassengers(item));
  add("clock", "Valid for", ticketDuration(item));
  add("bus", "Where to buy", ticketSales(item));
  add(
    "payment",
    "Published payment methods",
    friendly(
      (conditions.PaymentMethods ?? []).flatMap((value) =>
        value.split(/[ ,]+/),
      ),
      {
        cash: "Cash",
        contactlesspaymentcard: "Contactless card",
        debitcard: "Debit card",
        creditcard: "Credit card",
        contactless: "Contactless",
        mobilepayment: "Mobile payment",
      },
    ),
  );
  add(
    "ticket",
    "Ticket format",
    friendly(conditions.MediaType, {
      paperticket: "Paper ticket",
      mobileticket: "Mobile ticket",
      smartcard: "Smartcard",
      electronicticket: "Electronic ticket",
    }),
  );
  const dayNames = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const days = new Set(
    (conditions.DaysOfWeek ?? [])
      .flatMap((value) => value.split(/[ ,]+/))
      .map((value) => value.toLowerCase()),
  );
  const selectedDays = dayNames.filter((day) => days.has(day.toLowerCase()));
  add(
    "calendar",
    "Travel days",
    selectedDays.length === 7
      ? "Every day"
      : selectedDays.length === 5 &&
          selectedDays.every((day, i) => day === dayNames[i])
        ? "Monday to Friday"
        : selectedDays.join(", "),
  );
  const times = (item.duration_rules ?? []).flatMap((rule) => {
    const validTime = (value?: string) =>
      !!value && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value);
    if (!validTime(rule.start_time) || !validTime(rule.end_time)) return [];
    const start = rule.start_time!.slice(0, 5),
      end = rule.end_time!.slice(0, 5);
    return [`${start}–${end}${end < start ? " (overnight)" : ""}`];
  });
  add(
    "clock",
    "Published travel-day hours",
    unique(times),
    times.length
      ? "These are travel-day times, not a promise of 24 hours from purchase."
      : undefined,
  );
  const services = (item.line_refs ?? [])
    .map((ref) => ref.split(":").at(-1)!)
    .filter((ref) => /^[A-Za-z0-9][A-Za-z0-9 /-]{0,15}$/.test(ref));
  add("route", "Bus services", unique(services));
  add(
    "route",
    "Direction",
    friendly(item.direction_refs, {
      inbound: "Inbound services",
      outbound: "Outbound services",
    }),
  );
  const availability = ticketAvailability(item);
  if (availability !== "Published ticket conditions apply")
    add(
      "calendar",
      "Published fare dates",
      availability,
      "These dates describe the fare listing. Your ticket duration is shown separately.",
    );
  return rows;
}
