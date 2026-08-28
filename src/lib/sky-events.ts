export type CalendarSkyEvent = {
  kind: "solar" | "lunar";
  title: string;
  date: string;
  detail: string;
};

export type SkyCalendarEvent = CalendarSkyEvent & {
  calendarDate: string;
};

type SkyEventDefinition = CalendarSkyEvent & {
  visibleDates: readonly string[];
  expiresAt?: string;
};

// The August 2026 eclipse reaches maximum on August 28 UTC, but it is an
// August 27–28 night-time event for families in the Americas.
const skyEvents: readonly SkyEventDefinition[] = [
  {
    kind: "solar",
    title: "Annular solar eclipse",
    date: "2026-02-17",
    visibleDates: ["2026-02-17"],
    detail: "Visible mainly from Antarctica",
  },
  {
    kind: "lunar",
    title: "Total lunar eclipse",
    date: "2026-03-03",
    visibleDates: ["2026-03-03"],
    detail: "Visible across much of Asia, Australia, the Pacific, and the Americas",
  },
  {
    kind: "solar",
    title: "Total solar eclipse",
    date: "2026-08-12",
    visibleDates: ["2026-08-12"],
    detail: "Totality crosses Greenland, Iceland, Spain, and northern Russia",
  },
  {
    kind: "lunar",
    title: "Deep partial lunar eclipse",
    date: "2026-08-28",
    visibleDates: ["2026-08-27", "2026-08-28"],
    expiresAt: "2026-08-28T07:02:00Z",
    detail: "Visible from the Americas, Europe, Africa, and the Pacific",
  },
  {
    kind: "solar",
    title: "Annular solar eclipse",
    date: "2027-02-06",
    visibleDates: ["2027-02-06"],
    detail: "Visible from parts of South America and Africa",
  },
  {
    kind: "lunar",
    title: "Penumbral lunar eclipse",
    date: "2027-02-20",
    visibleDates: ["2027-02-20"],
    detail: "Visible across much of the world",
  },
  {
    kind: "solar",
    title: "Total solar eclipse",
    date: "2027-08-02",
    visibleDates: ["2027-08-02"],
    detail: "Totality crosses southern Spain, North Africa, and the Middle East",
  },
];

export function skyEventForCalendarDate(calendarDate: string, now = new Date()): CalendarSkyEvent | null {
  const event = skyEvents.find((candidate) => candidate.visibleDates.includes(calendarDate));
  if (!event) return null;
  if (event.expiresAt && now.getTime() >= Date.parse(event.expiresAt)) return null;
  return { kind: event.kind, title: event.title, date: event.date, detail: event.detail };
}

export function skyEventsForYear(year: number): SkyCalendarEvent[] {
  return skyEvents
    .filter((event) => event.date.startsWith(`${year}-`))
    .map((event) => ({ kind: event.kind, title: event.title, date: event.date, detail: event.detail, calendarDate: event.visibleDates[0] }));
}
