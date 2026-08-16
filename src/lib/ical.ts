type ParsedEvent = {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  recurrenceRule: string | null;
};

function unescapeIcal(value: string) {
  return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function zonedDateTime(value: string, timeZone: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  try {
    const values = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(utcGuess));
    const parts = Object.fromEntries(values.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const displayedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return new Date(utcGuess - (displayedAsUtc - utcGuess)).toISOString();
  } catch {
    // A malformed timezone should never make a calendar feed unusable.
    return new Date(utcGuess).toISOString();
  }
}

function dateValue(value?: string, timeZone = "America/Chicago") {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) return { value: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, allDay: true };
  if (!value.endsWith("Z")) {
    const zoned = zonedDateTime(value, timeZone);
    return zoned ? { value: zoned, allDay: false } : null;
  }
  const normalized = value;
  const match = normalized.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  return { value: new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]))).toISOString(), allDay: false };
}

export function parseIcal(text: string, defaultTimeZone = "America/Chicago"): ParsedEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const events: ParsedEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { current = {}; continue; }
    if (line === "END:VEVENT" && current) {
      const start = dateValue(current.DTSTART, current.DTSTART_TZID ?? defaultTimeZone);
      const end = dateValue(current.DTEND, current.DTEND_TZID ?? current.DTSTART_TZID ?? defaultTimeZone);
      if (start && current.UID) events.push({ uid: current.UID, title: unescapeIcal(current.SUMMARY ?? "Untitled event"), startsAt: start.allDay ? `${start.value}T00:00:00.000Z` : start.value, endsAt: end ? (end.allDay ? `${end.value}T00:00:00.000Z` : end.value) : null, allDay: start.allDay, location: current.LOCATION ? unescapeIcal(current.LOCATION) : null, notes: current.DESCRIPTION ? unescapeIcal(current.DESCRIPTION) : null, recurrenceRule: current.RRULE ?? null });
      current = null;
      continue;
    }
    if (!current) continue;
    const divider = line.indexOf(":");
    if (divider < 0) continue;
    const keyParts = line.slice(0, divider).split(";");
    const key = keyParts[0];
    if (["UID", "SUMMARY", "DTSTART", "DTEND", "LOCATION", "DESCRIPTION", "RRULE"].includes(key)) current[key] = line.slice(divider + 1);
    const timeZone = keyParts.find((part) => part.startsWith("TZID="))?.slice(5);
    if (timeZone && (key === "DTSTART" || key === "DTEND")) current[`${key}_TZID`] = timeZone.replace(/^"|"$/g, "");
  }
  return events;
}
