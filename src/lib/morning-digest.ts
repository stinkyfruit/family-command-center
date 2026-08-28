import { serverSupabase } from "@/lib/google-calendar";
import { skyEventForCalendarDate } from "@/lib/sky-events";

type ServerSupabase = ReturnType<typeof serverSupabase>;
type LocalDateTime = { date: string; hour: number; minute: number };

function localParts(date: Date, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour), minute: Number(values.minute) };
}

function localDateTimeToUtc(localDate: string, localTime: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);
  for (let pass = 0; pass < 3; pass += 1) {
    const formatted = localParts(new Date(timestamp), timeZone);
    const formattedTimestamp = Date.UTC(Number(formatted.date.slice(0, 4)), Number(formatted.date.slice(5, 7)) - 1, Number(formatted.date.slice(8, 10)), formatted.hour, formatted.minute);
    timestamp += Date.UTC(year, month - 1, day, hour, minute) - formattedTimestamp;
  }
  return new Date(timestamp);
}

function localDateRange(localDate: string, timeZone: string) {
  return {
    start: localDateTimeToUtc(localDate, "00:00", timeZone),
    end: localDateTimeToUtc(localDate, "23:59", timeZone).getTime() + 60_000,
  };
}

function formatEventTime(startsAt: string, allDay: boolean, timeZone: string) {
  if (allDay) return "All day";
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(startsAt));
}

function capList(items: string[], max = 5) {
  return items.length <= max ? items : [...items.slice(0, max), `+${items.length - max} more`];
}

export function currentHouseholdDateTime(date: Date, timeZone: string) {
  try {
    return localParts(date, timeZone);
  } catch {
    return localParts(date, "America/Chicago");
  }
}

export async function buildMorningDigest(admin: ServerSupabase, householdId: string, localDate: string, timeZone: string) {
  const range = localDateRange(localDate, timeZone);
  const [eventResult, todoResult] = await Promise.all([
    admin.from("events").select("title, starts_at, all_day").eq("household_id", householdId).gte("starts_at", range.start.toISOString()).lt("starts_at", new Date(range.end).toISOString()).order("starts_at").limit(100),
    admin.from("todos").select("title, due_at").eq("household_id", householdId).eq("status", "open").gte("due_at", range.start.toISOString()).lt("due_at", new Date(range.end).toISOString()).order("due_at").limit(100),
  ]);
  if (eventResult.error) throw eventResult.error;
  if (todoResult.error) throw todoResult.error;

  const events = (eventResult.data ?? []).map((event) => `${formatEventTime(event.starts_at, Boolean(event.all_day), timeZone)} ${event.title}`);
  const tasks = (todoResult.data ?? []).map((todo) => todo.title);
  const skyEvent = skyEventForCalendarDate(localDate);
  const total = events.length + tasks.length;
  const body = [
    events.length ? `Events: ${capList(events).join(" · ")}` : "Events: none",
    tasks.length ? `Due today: ${capList(tasks).join(" · ")}` : "Due today: no tasks",
    skyEvent ? `Sky watch: ${skyEvent.title} — ${skyEvent.detail}${skyEvent.kind === "solar" ? ". Use certified eclipse glasses; never look directly at the Sun." : ""}` : null,
  ].filter((line): line is string => Boolean(line)).join("\n");
  return {
    title: skyEvent ? `Good morning · ${skyEvent.title}` : total ? `Good morning · ${total} today` : "Good morning · A clear day",
    body,
    eventCount: events.length,
    taskCount: tasks.length,
  };
}
