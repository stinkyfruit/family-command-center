import clearNightAnimation from "@meteocons/lottie/flat/clear-night.json";
import cloudyAnimation from "../../../public/animations/general/weather/cloudy.json";
import fogAnimation from "@meteocons/lottie/flat/fog.json";
import partlyCloudyDayAnimation from "@meteocons/lottie/flat/partly-cloudy-day.json";
import partlyCloudyNightAnimation from "@meteocons/lottie/flat/partly-cloudy-night.json";
import rainAnimation from "../../../public/animations/general/weather/rain.json";
import snowAnimation from "@meteocons/lottie/flat/snow.json";
import thunderstormsAnimation from "../../../public/animations/general/weather/thunderstorms.json";
import sunnyAnimation from "../../../public/animations/general/weather/sunny.json";
import greatMoodAnimation from "../../../public/animations/general/moods/1f600.json";
import goodMoodAnimation from "../../../public/animations/general/moods/1f642.json";
import okayMoodAnimation from "../../../public/animations/general/moods/1f610.json";
import tiredMoodAnimation from "../../../public/animations/general/moods/1f634.json";
import lowMoodAnimation from "../../../public/animations/general/moods/1f622.json";
import { generalCompletionAnimations, halloweenCompletionAnimations } from "@/generated/animation-manifest";

export const halloweenScreensaverVideos = [
  "/animations/holidays/halloween/screensavers/halloween-screensaver-1.mp4",
  "/animations/holidays/halloween/screensavers/halloween-screensaver-2.mp4",
] as const;

export function isHalloweenSeason() {
  return new Date().getMonth() === 9;
}

export function pickCelebrationAnimation() {
  const animations = isHalloweenSeason() ? halloweenCompletionAnimations : generalCompletionAnimations;
  const storageKey = isHalloweenSeason() ? "family-last-halloween-celebration-animation" : "family-last-celebration-animation";
  const lastAnimation = window.sessionStorage.getItem(storageKey);
  const choices = animations.filter((animation) => animation !== lastAnimation);
  const animation = choices[Math.floor(Math.random() * choices.length)] ?? animations[0];
  window.sessionStorage.setItem(storageKey, animation);
  return animation;
}

export type Event = { id: string | number; title: string; time: string; person: string; color: string; startsAt: string; endsAt?: string | null; notes?: string | null; location?: string | null; category?: string | null; allDay?: boolean; memberIds?: string[]; externalId?: string | null; seriesExternalId?: string | null; generatedHoliday?: boolean; source?: "app" | "google" | "apple" };
export type Todo = { id: string | number; title: string; due: string; dueAt?: string | null; done: boolean; assigneeMemberId?: string | number | null };
export type Weather = { temperature: number; high: number; low: number; summary: string; location: string; code: number; isDay: boolean };
export type Member = { id: string | number; name: string; role: "adult" | "child"; color?: string; userId?: string | null };
export type MoodKey = "great" | "good" | "okay" | "tired" | "low";
export type MoodCheckin = { id: string | number; memberId: string | number; mood: MoodKey; checkedInAt: string };

export const moodOptions = [
  { key: "great", label: "Great", emoji: "😀", animation: greatMoodAnimation, color: "bg-amber-100 text-amber-900 ring-amber-200" },
  { key: "good", label: "Good", emoji: "🙂", animation: goodMoodAnimation, color: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  { key: "okay", label: "Okay", emoji: "😐", animation: okayMoodAnimation, color: "bg-slate-100 text-slate-800 ring-slate-200" },
  { key: "tired", label: "Tired", emoji: "😴", animation: tiredMoodAnimation, color: "bg-indigo-100 text-indigo-900 ring-indigo-200" },
  { key: "low", label: "Low", emoji: "😢", animation: lowMoodAnimation, color: "bg-sky-100 text-sky-900 ring-sky-200" },
] as const satisfies ReadonlyArray<{ key: MoodKey; label: string; emoji: string; animation: object; color: string }>;

export function isMoodKey(value: unknown): value is MoodKey {
  return moodOptions.some((mood) => mood.key === value);
}

export function moodOption(key: MoodKey) {
  return moodOptions.find((mood) => mood.key === key) ?? moodOptions[2];
}

export function localDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export type ChoreEntry = { id: string | number; title: string; emoji: string; assigneeMemberId: string | number | null; completionId?: string | number; sortOrder: number; routine: string; isDaily: boolean; isFixed: boolean; scheduledFor?: string | null };
export const choreRoutines = [
  { id: "Before school", label: "Before school", icon: "☀️" },
  { id: "After school", label: "After school & nighttime", icon: "🎒" },
  { id: "To-do", label: "Anytime to-dos", icon: "✨" },
] as const;
export const fixedRoutineChoreKeys = new Set([
  "before school|potty", "before school|eat breakfast", "before school|put on clothes", "before school|brush hair", "before school|put on shoes", "before school|pack backpack", "before school|pack snacks", "before school|pack water", "before school|pack lunch", "before school|give mama a hug and/or kiss",
  "after school|change clothes and put school clothes in laundry basket", "after school|do homework", "after school|move body", "after school|eat dinner", "after school|bring plate to the sink", "after school|help mama and dada clean up dinner", "after school|take a bath/shower", "after school|brush teeth", "after school|read a book",
]);
export function isVisibleRoutineChore(chore: ChoreEntry, today: string) {
  return chore.routine === "To-do" || fixedRoutineChoreKeys.has(`${chore.routine.toLowerCase()}|${chore.title.toLowerCase()}`) || (!chore.isFixed && chore.scheduledFor === today);
}
export type SharedListItem = { id: string | number; title: string; done: boolean };
export type SharedList = { id: string | number; title: string; icon: string; items: SharedListItem[] };
export type GoogleConnection = { id: string; name: string; enabled: boolean };
export type AppleFeed = { id: string; name: string; enabled: boolean };
export type ThemeMode = "auto" | "light" | "dark";
export const defaultMemberColor = "#7c3aed";
export const memberColorOptions = ["#f43f5e", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"] as const;

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function displayEventsOnce(events: Event[]) {
  const unique = new Map<string, Event>();
  const score = (event: Event) => ({ app: 30, google: 20, apple: 10 }[event.source ?? "app"] ?? 0) + (event.notes?.length ?? 0) + (event.location?.length ?? 0) + (event.memberIds?.length ?? 0);
  for (const event of events) {
    if (event.generatedHoliday) { unique.set(String(event.id), event); continue; }
    const startsAt = new Date(event.startsAt);
    const birthdayDay = [startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()].join("-");
    const key = event.category === "Birthday"
      ? ["birthday", event.title.trim().toLocaleLowerCase(), birthdayDay].join("|")
      : [event.title.trim().toLocaleLowerCase(), startsAt.getTime(), event.endsAt ? new Date(event.endsAt).getTime() : "", Boolean(event.allDay)].join("|");
    const current = unique.get(key);
    if (!current || score(event) > score(current)) unique.set(key, event);
  }
  return [...unique.values()];
}

export const starterEvents: Event[] = [
  { id: 1, title: "School drop-off", time: "8:10 AM", person: "Everyone", color: "bg-sky-400", startsAt: new Date().toISOString() },
  { id: 2, title: "Maya — dance", time: "4:30 PM", person: "Maya", color: "bg-violet-400", startsAt: new Date().toISOString() },
  { id: 3, title: "Soccer practice", time: "5:30 PM", person: "Owen", color: "bg-amber-400", startsAt: new Date().toISOString() },
  { id: 4, title: "Family dinner", time: "6:30 PM", person: "Everyone", color: "bg-rose-400", startsAt: new Date().toISOString() },
];

export const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function listIcon(title: string) {
  const text = title.toLowerCase();
  if (/groc|shop|market/.test(text)) return "🛒";
  if (/dinner|meal|recipe|food/.test(text)) return "🍽️";
  if (/pack|trip|travel|vacation/.test(text)) return "🧳";
  if (/note|idea/.test(text)) return "📝";
  return "📝";
}

export function listVisualIcon(icon: string) {
  return icon === "☰" || icon === "✦" ? "📝" : icon;
}

export function choreIcon(title: string) {
  const text = title.toLowerCase();
  if (/bed|pillow|blanket/.test(text)) return "🛏️";
  if (/potty|toilet/.test(text)) return "🚽";
  if (/hair|comb/.test(text)) return "🪮";
  if (/teeth|brush|tooth/.test(text)) return "🪥";
  if (/dish|plate|kitchen|table/.test(text)) return "🍽️";
  if (/trash|garbage|bin/.test(text)) return "🗑️";
  if (/laundry|clothes|fold/.test(text)) return "🧺";
  if (/dog|cat|pet|feed/.test(text)) return "🐾";
  if (/room|toy|clean|tidy/.test(text)) return "🧸";
  if (/homework|school|read/.test(text)) return "📚";
  if (/shower|bath/.test(text)) return "🫧";
  return "✨";
}

export const notoIconCodes = new Set([
  "2728", "1f373", "1f382", "1f383", "1f384", "1f386", "1f389", "1f392", "1f3c3", "1f371", "1f37d", "1f423", "1f43e", "1f455", "1f497", "1f4a7", "1f4d6", "1f4da", "1f4dd", "1f5d1", "1f6c1", "1f6cf", "1f6d2", "1f968", "1f983", "1f9f3", "1f9f8", "1f9fa", "1faa5", "1fae7",
]);

export function notoIconPath(emoji: string) {
  const code = Array.from(emoji)
    .filter((character) => character !== "\uFE0F" && character !== "\u200D")
    .map((character) => character.codePointAt(0)?.toString(16))
    .join("_");
  return notoIconCodes.has(code) ? `/chore-icons/${code}.svg` : null;
}


export function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  if (hour < 21) return "GOOD EVENING";
  return "GOOD NIGHT";
}

export function nthWeekday(year: number, month: number, weekday: number, occurrence: number) {
  const date = new Date(year, month, 1);
  date.setDate(1 + ((weekday - date.getDay() + 7) % 7) + (occurrence - 1) * 7);
  return date;
}

export function lastWeekday(year: number, month: number, weekday: number) {
  const date = new Date(year, month + 1, 0);
  date.setDate(date.getDate() - ((date.getDay() - weekday + 7) % 7));
  return date;
}

export function easterSunday(year: number) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}

export function familyHolidaysForYear(year: number): Event[] {
  const entries: [string, Date, string][] = [
    ["New Year’s Day", new Date(year, 0, 1), "🎉 A fresh family year"], ["Valentine’s Day", new Date(year, 1, 14), "💌 Share the love"], ["Martin Luther King Jr. Day", nthWeekday(year, 0, 1, 3), "A day of service"], ["Presidents’ Day", nthWeekday(year, 1, 1, 3), "Family holiday"], ["St. Patrick’s Day", new Date(year, 2, 17), "🍀 Wear green"], ["Easter", easterSunday(year), "🐣 Family celebration"], ["Mother’s Day", nthWeekday(year, 4, 0, 2), "💐 Celebrate Mom"], ["Memorial Day", lastWeekday(year, 4, 1), "Family holiday"], ["Father’s Day", nthWeekday(year, 5, 0, 3), "🧡 Celebrate Dad"], ["Juneteenth", new Date(year, 5, 19), "Family holiday"], ["Independence Day", new Date(year, 6, 4), "🎆 Fireworks!"], ["Labor Day", nthWeekday(year, 8, 1, 1), "Family holiday"], ["Halloween", new Date(year, 9, 31), "🎃 Costume day"], ["Veterans Day", new Date(year, 10, 11), "Family holiday"], ["Thanksgiving", nthWeekday(year, 10, 4, 4), "🦃 Give thanks"], ["Christmas Eve", new Date(year, 11, 24), "🎄 Family time"], ["Christmas Day", new Date(year, 11, 25), "🎁 Merry Christmas"], ["New Year’s Eve", new Date(year, 11, 31), "✨ Countdown!"],
  ];
  return entries.map(([title, date, notes]) => ({ id: `holiday-${year}-${title}`, title, notes, time: "All day", person: "Family", color: "bg-amber-300", startsAt: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString(), allDay: true, category: "Holiday", generatedHoliday: true }));
}



export function weatherLabel(code: number) {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Showers";
}

export function weatherSummary(code: number) {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Showers";
}

export function weatherOrbClass(weather: Weather | null) {
  if (!weather || weather.code <= 1) return weather?.isDay === false ? "bg-indigo-200/45" : "bg-yellow-200/70";
  if (weather.code <= 3) return "bg-slate-200/60";
  if (weather.code === 45 || weather.code === 48) return "bg-slate-300/60";
  if (weather.code >= 71 && weather.code <= 86) return "bg-white/75";
  if (weather.code >= 95) return "bg-violet-200/60";
  return "bg-sky-200/65";
}

export function weatherAnimation(code: number, isDay: boolean) {
  if (code <= 1) return isDay ? sunnyAnimation : clearNightAnimation;
  if (code <= 2) return isDay ? partlyCloudyDayAnimation : partlyCloudyNightAnimation;
  if (code === 3) return cloudyAnimation;
  if (code === 45 || code === 48) return fogAnimation;
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return snowAnimation;
  if (code >= 95) return thunderstormsAnimation;
  return rainAnimation;
}
