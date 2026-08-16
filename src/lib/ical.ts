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

function dateValue(value?: string) {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) return { value: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`, allDay: true };
  const normalized = value.endsWith("Z") ? value : `${value}Z`;
  const match = normalized.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return null;
  return { value: new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]))).toISOString(), allDay: false };
}

export function parseIcal(text: string): ParsedEvent[] {
  const lines = text.replace(/\r\n[ \t]/g, "").split(/\r?\n/);
  const events: ParsedEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { current = {}; continue; }
    if (line === "END:VEVENT" && current) {
      const start = dateValue(current.DTSTART);
      const end = dateValue(current.DTEND);
      if (start && current.UID) events.push({ uid: current.UID, title: unescapeIcal(current.SUMMARY ?? "Untitled event"), startsAt: start.allDay ? `${start.value}T00:00:00.000Z` : start.value, endsAt: end ? (end.allDay ? `${end.value}T00:00:00.000Z` : end.value) : null, allDay: start.allDay, location: current.LOCATION ? unescapeIcal(current.LOCATION) : null, notes: current.DESCRIPTION ? unescapeIcal(current.DESCRIPTION) : null, recurrenceRule: current.RRULE ?? null });
      current = null;
      continue;
    }
    if (!current) continue;
    const divider = line.indexOf(":");
    if (divider < 0) continue;
    const key = line.slice(0, divider).split(";")[0];
    if (["UID", "SUMMARY", "DTSTART", "DTEND", "LOCATION", "DESCRIPTION", "RRULE"].includes(key)) current[key] = line.slice(divider + 1);
  }
  return events;
}
