export type ParsedEvent = {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  recurrenceRule: string | null;
};

export type IcalOccurrence = ParsedEvent & {
  occurrenceId: string;
  seriesUid: string | null;
};

type RecurrenceRule = {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  interval: number;
  count: number | null;
  until: Date | null;
  byDay: number[];
  byMonth: number | null;
  byMonthDay: number | null;
};

const dayCodes = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const dayMilliseconds = 86_400_000;

function dateOnly(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function addDays(value: Date, days: number) {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function parseUntil(value: string) {
  if (/^\d{8}$/.test(value)) {
    return new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(4, 6)) - 1, Number(value.slice(6, 8)), 23, 59, 59, 999));
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])));
}

function parseRecurrenceRule(value: string | null): RecurrenceRule {
  const parts = new Map(value?.split(";").map((part) => {
    const [key, ...rest] = part.toUpperCase().split("=");
    return [key, rest.join("=")];
  }) ?? []);
  const frequency = parts.get("FREQ");
  const byDay = (parts.get("BYDAY") ?? "").split(",").flatMap((day) => {
    const code = day.replace(/^[+-]?\d+/, "");
    const index = dayCodes.indexOf(code);
    return index >= 0 ? [index] : [];
  });
  const parsedInterval = Number(parts.get("INTERVAL"));
  const parsedCount = Number(parts.get("COUNT"));
  const parsedMonth = Number(parts.get("BYMONTH"));
  const parsedMonthDay = Number(parts.get("BYMONTHDAY"));
  return {
    frequency: frequency === "DAILY" || frequency === "WEEKLY" || frequency === "MONTHLY" || frequency === "YEARLY" ? frequency : null,
    interval: Number.isInteger(parsedInterval) && parsedInterval > 0 ? parsedInterval : 1,
    count: Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : null,
    until: parts.get("UNTIL") ? parseUntil(parts.get("UNTIL")!) : null,
    byDay,
    byMonth: Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : null,
    byMonthDay: Number.isInteger(parsedMonthDay) && parsedMonthDay >= 1 && parsedMonthDay <= 31 ? parsedMonthDay : null,
  };
}

function occurrenceId(uid: string, start: Date, frequency: RecurrenceRule["frequency"]) {
  if (frequency === "YEARLY") return `${uid}:${start.getUTCFullYear()}`;
  return `${uid}:${start.toISOString()}`;
}

function makeOccurrence(event: ParsedEvent, start: Date, duration: number | null, frequency: RecurrenceRule["frequency"]): IcalOccurrence {
  return {
    ...event,
    uid: occurrenceId(event.uid, start, frequency),
    startsAt: start.toISOString(),
    endsAt: duration === null ? null : new Date(start.getTime() + duration).toISOString(),
    occurrenceId: occurrenceId(event.uid, start, frequency),
    seriesUid: event.uid,
  };
}

/**
 * Materialize recurring iCalendar events for the same bounded window used by
 * the dashboard's generated calendar events. Public iCloud feeds commonly
 * provide an RRULE master instead of individual occurrences.
 */
export function expandIcalEvent(event: ParsedEvent, range: { start: Date; end: Date }): IcalOccurrence[] {
  if (!event.recurrenceRule) {
    return [{ ...event, occurrenceId: event.uid, seriesUid: null }];
  }

  const start = new Date(event.startsAt);
  const duration = event.endsAt ? new Date(event.endsAt).getTime() - start.getTime() : null;
  const rule = parseRecurrenceRule(event.recurrenceRule);
  if (!rule.frequency || !Number.isFinite(start.getTime())) {
    return [{ ...event, occurrenceId: event.uid, seriesUid: event.uid }];
  }

  const occurrences: IcalOccurrence[] = [];
  const rangeStart = range.start.getTime();
  const rangeEnd = range.end.getTime();
  const addOccurrence = (candidate: Date) => {
    if (candidate.getTime() < start.getTime() || candidate.getTime() < rangeStart || candidate.getTime() >= rangeEnd || (rule.until && candidate > rule.until)) return false;
    occurrences.push(makeOccurrence(event, candidate, duration, rule.frequency));
    return rule.count !== null && occurrences.length >= rule.count;
  };

  if (rule.frequency === "DAILY") {
    const firstDay = Math.max(0, Math.ceil((dateOnly(range.start) - dateOnly(start)) / dayMilliseconds));
    let dayOffset = Math.ceil(firstDay / rule.interval) * rule.interval;
    while (true) {
      const candidate = addDays(start, dayOffset);
      if (candidate.getTime() >= rangeEnd || (rule.until && candidate > rule.until)) break;
      if (addOccurrence(candidate)) break;
      dayOffset += rule.interval;
    }
  } else if (rule.frequency === "WEEKLY") {
    const weekStart = addDays(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds())), -start.getUTCDay());
    const firstWeek = Math.max(0, Math.floor((dateOnly(range.start) - dateOnly(weekStart)) / (7 * dayMilliseconds)));
    const lastWeek = Math.ceil((rangeEnd - weekStart.getTime()) / (7 * dayMilliseconds));
    const weekdays = rule.byDay.length ? rule.byDay : [start.getUTCDay()];
    for (let week = firstWeek; week <= lastWeek; week += 1) {
      if (week % rule.interval !== 0) continue;
      for (const weekday of weekdays) {
        const candidate = addDays(weekStart, week * 7 + weekday);
        if (addOccurrence(candidate)) return occurrences;
      }
    }
  } else if (rule.frequency === "MONTHLY") {
    const firstMonth = Math.max(0, (range.start.getUTCFullYear() - start.getUTCFullYear()) * 12 + range.start.getUTCMonth() - start.getUTCMonth());
    for (let month = Math.floor(firstMonth / rule.interval) * rule.interval; ; month += rule.interval) {
      const monthStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + month, 1, start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()));
      if (monthStart.getTime() >= rangeEnd || (rule.until && monthStart > rule.until)) break;
      const monthDay = rule.byMonthDay ?? start.getUTCDate();
      const candidate = new Date(monthStart);
      candidate.setUTCDate(monthDay);
      if (candidate.getUTCMonth() !== monthStart.getUTCMonth()) continue;
      if (addOccurrence(candidate)) break;
    }
  } else {
    const month = rule.byMonth ? rule.byMonth - 1 : start.getUTCMonth();
    const yearsFromStart = Math.max(0, range.start.getUTCFullYear() - start.getUTCFullYear());
    const firstYear = start.getUTCFullYear() + Math.ceil(yearsFromStart / rule.interval) * rule.interval;
    for (let year = firstYear; year <= range.end.getUTCFullYear(); year += rule.interval) {
      const candidate = new Date(Date.UTC(year, month, rule.byMonthDay ?? start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()));
      if (candidate.getUTCMonth() !== month) continue;
      if (addOccurrence(candidate)) break;
    }
  }
  return occurrences;
}

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
