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

type FullMoonDefinition = {
  at: string;
  calendarDate: string;
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

// Full-moon instants are from the U.S. Naval Observatory. calendarDate is the
// local family-calendar date in the app's default America/Chicago timezone.
const fullMoonDefinitions: readonly FullMoonDefinition[] = [
  { at: "2026-01-03T10:03:00Z", calendarDate: "2026-01-03" },
  { at: "2026-02-01T22:09:00Z", calendarDate: "2026-02-01" },
  { at: "2026-03-03T11:38:00Z", calendarDate: "2026-03-03" },
  { at: "2026-04-02T02:12:00Z", calendarDate: "2026-04-01" },
  { at: "2026-05-01T17:23:00Z", calendarDate: "2026-05-01" },
  { at: "2026-05-31T08:45:00Z", calendarDate: "2026-05-31" },
  { at: "2026-06-29T23:56:00Z", calendarDate: "2026-06-29" },
  { at: "2026-07-29T14:36:00Z", calendarDate: "2026-07-29" },
  { at: "2026-08-28T04:18:00Z", calendarDate: "2026-08-27" },
  { at: "2026-09-26T16:49:00Z", calendarDate: "2026-09-26" },
  { at: "2026-10-26T04:12:00Z", calendarDate: "2026-10-25" },
  { at: "2026-11-24T14:53:00Z", calendarDate: "2026-11-24" },
  { at: "2026-12-24T01:28:00Z", calendarDate: "2026-12-23" },
  { at: "2027-01-22T12:17:00Z", calendarDate: "2027-01-22" },
  { at: "2027-02-20T23:23:00Z", calendarDate: "2027-02-20" },
  { at: "2027-03-22T10:44:00Z", calendarDate: "2027-03-22" },
  { at: "2027-04-20T22:27:00Z", calendarDate: "2027-04-20" },
  { at: "2027-05-20T10:59:00Z", calendarDate: "2027-05-20" },
  { at: "2027-06-19T00:44:00Z", calendarDate: "2027-06-18" },
  { at: "2027-07-18T15:45:00Z", calendarDate: "2027-07-18" },
  { at: "2027-08-17T07:29:00Z", calendarDate: "2027-08-17" },
  { at: "2027-09-15T23:04:00Z", calendarDate: "2027-09-15" },
  { at: "2027-10-15T13:47:00Z", calendarDate: "2027-10-15" },
  { at: "2027-11-14T03:26:00Z", calendarDate: "2027-11-13" },
  { at: "2027-12-13T16:09:00Z", calendarDate: "2027-12-13" },
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

export function fullMoonsForYear(year: number): SkyCalendarEvent[] {
  return fullMoonDefinitions
    .filter((moon) => moon.at.startsWith(`${year}-`))
    .map((moon) => ({ kind: "lunar", title: "Full moon", date: moon.at.slice(0, 10), detail: "Peak full moon", calendarDate: moon.calendarDate }));
}
