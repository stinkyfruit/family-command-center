"use client";

import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, CheckSquareIcon, ClipboardTextIcon, HouseIcon, ListBulletsIcon, MoonIcon, PencilSimpleIcon, PlusIcon, SlidersHorizontalIcon, SunIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Lottie } from "lottie-react";
import { supabase } from "@/lib/supabase";
import clearNightAnimation from "@meteocons/lottie/flat/clear-night.json";
import cloudyAnimation from "../../public/animations/general/weather/cloudy.json";
import fogAnimation from "@meteocons/lottie/flat/fog.json";
import partlyCloudyDayAnimation from "@meteocons/lottie/flat/partly-cloudy-day.json";
import partlyCloudyNightAnimation from "@meteocons/lottie/flat/partly-cloudy-night.json";
import rainAnimation from "../../public/animations/general/weather/rain.json";
import snowAnimation from "@meteocons/lottie/flat/snow.json";
import thunderstormsAnimation from "../../public/animations/general/weather/thunderstorms.json";
import sunnyAnimation from "../../public/animations/general/weather/sunny.json";
import greatMoodAnimation from "../../public/animations/general/moods/1f600.json";
import goodMoodAnimation from "../../public/animations/general/moods/1f642.json";
import okayMoodAnimation from "../../public/animations/general/moods/1f610.json";
import tiredMoodAnimation from "../../public/animations/general/moods/1f634.json";
import lowMoodAnimation from "../../public/animations/general/moods/1f622.json";
import { generalCompletionAnimations, halloweenCompletionAnimations } from "@/generated/animation-manifest";

const halloweenScreensaverVideos = [
  "/animations/holidays/halloween/screensavers/halloween-screensaver-1.mp4",
  "/animations/holidays/halloween/screensavers/halloween-screensaver-2.mp4",
] as const;

function isHalloweenSeason() {
  return new Date().getMonth() === 9;
}

function pickCelebrationAnimation() {
  const animations = isHalloweenSeason() ? halloweenCompletionAnimations : generalCompletionAnimations;
  const storageKey = isHalloweenSeason() ? "family-last-halloween-celebration-animation" : "family-last-celebration-animation";
  const lastAnimation = window.sessionStorage.getItem(storageKey);
  const choices = animations.filter((animation) => animation !== lastAnimation);
  const animation = choices[Math.floor(Math.random() * choices.length)] ?? animations[0];
  window.sessionStorage.setItem(storageKey, animation);
  return animation;
}

type Event = { id: string | number; title: string; time: string; person: string; color: string; startsAt: string; endsAt?: string | null; notes?: string | null; location?: string | null; category?: string | null; allDay?: boolean; memberIds?: string[]; externalId?: string | null; seriesExternalId?: string | null; generatedHoliday?: boolean; source?: "app" | "google" | "apple" };
type Todo = { id: string | number; title: string; due: string; dueAt?: string | null; done: boolean; assigneeMemberId?: string | number | null };
type Weather = { temperature: number; high: number; low: number; summary: string; location: string; code: number; isDay: boolean };
type Member = { id: string | number; name: string; role: "adult" | "child"; color?: string; userId?: string | null };
type MoodKey = "great" | "good" | "okay" | "tired" | "low";
type MoodCheckin = { id: string | number; memberId: string | number; mood: MoodKey; checkedInAt: string };

const moodOptions = [
  { key: "great", label: "Great", emoji: "😀", animation: greatMoodAnimation, color: "bg-amber-100 text-amber-900 ring-amber-200" },
  { key: "good", label: "Good", emoji: "🙂", animation: goodMoodAnimation, color: "bg-emerald-100 text-emerald-900 ring-emerald-200" },
  { key: "okay", label: "Okay", emoji: "😐", animation: okayMoodAnimation, color: "bg-slate-100 text-slate-800 ring-slate-200" },
  { key: "tired", label: "Tired", emoji: "😴", animation: tiredMoodAnimation, color: "bg-indigo-100 text-indigo-900 ring-indigo-200" },
  { key: "low", label: "Low", emoji: "😢", animation: lowMoodAnimation, color: "bg-sky-100 text-sky-900 ring-sky-200" },
] as const satisfies ReadonlyArray<{ key: MoodKey; label: string; emoji: string; animation: object; color: string }>;

function isMoodKey(value: unknown): value is MoodKey {
  return moodOptions.some((mood) => mood.key === value);
}

function moodOption(key: MoodKey) {
  return moodOptions.find((mood) => mood.key === key) ?? moodOptions[2];
}

function localDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
type ChoreEntry = { id: string | number; title: string; emoji: string; assigneeMemberId: string | number | null; completionId?: string | number; sortOrder: number; routine: string; isDaily: boolean; isFixed: boolean; scheduledFor?: string | null };
const choreRoutines = [
  { id: "Before school", label: "Before school", icon: "☀️" },
  { id: "After school", label: "After school & nighttime", icon: "🎒" },
  { id: "To-do", label: "Anytime to-dos", icon: "✨" },
] as const;
const fixedRoutineChoreKeys = new Set([
  "before school|eat breakfast", "before school|put on clothes", "before school|brush hair", "before school|put on shoes", "before school|pack backpack", "before school|pack snacks", "before school|pack water", "before school|pack lunch", "before school|give mama a hug and/or kiss",
  "after school|change clothes and put school clothes in laundry basket", "after school|do homework", "after school|move body", "after school|eat dinner", "after school|bring plate to the sink", "after school|help mama and dada clean up dinner", "after school|take a bath/shower", "after school|brush teeth", "after school|read a book",
]);
function isVisibleRoutineChore(chore: ChoreEntry, today: string) {
  return chore.routine === "To-do" || fixedRoutineChoreKeys.has(`${chore.routine.toLowerCase()}|${chore.title.toLowerCase()}`) || (!chore.isFixed && chore.scheduledFor === today);
}
type SharedListItem = { id: string | number; title: string; done: boolean };
type SharedList = { id: string | number; title: string; icon: string; items: SharedListItem[] };
type GoogleConnection = { id: string; name: string; enabled: boolean };
type AppleFeed = { id: string; name: string; enabled: boolean };
type ThemeMode = "auto" | "light" | "dark";
const defaultMemberColor = "#7c3aed";
const memberColorOptions = ["#f43f5e", "#f97316", "#f59e0b", "#84cc16", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"] as const;

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function displayEventsOnce(events: Event[]) {
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
type IconName = "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "plus" | "close" | "trash" | "edit" | "chevronLeft" | "chevronRight" | "sun" | "moon";

function AppIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const Icon = {
    home: HouseIcon,
    calendar: CalendarBlankIcon,
    tasks: CheckSquareIcon,
    chores: ClipboardTextIcon,
    lists: ListBulletsIcon,
    settings: SlidersHorizontalIcon,
    plus: PlusIcon,
    close: XIcon,
    trash: TrashIcon,
    edit: PencilSimpleIcon,
    chevronLeft: CaretLeftIcon,
    chevronRight: CaretRightIcon,
    sun: SunIcon,
    moon: MoonIcon,
  }[name];
  return <Icon className={className} weight="bold" aria-hidden="true" />;
}

const starterEvents: Event[] = [
  { id: 1, title: "School drop-off", time: "8:10 AM", person: "Everyone", color: "bg-sky-400", startsAt: new Date().toISOString() },
  { id: 2, title: "Maya — dance", time: "4:30 PM", person: "Maya", color: "bg-violet-400", startsAt: new Date().toISOString() },
  { id: 3, title: "Soccer practice", time: "5:30 PM", person: "Owen", color: "bg-amber-400", startsAt: new Date().toISOString() },
  { id: 4, title: "Family dinner", time: "6:30 PM", person: "Everyone", color: "bg-rose-400", startsAt: new Date().toISOString() },
];

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function listIcon(title: string) {
  const text = title.toLowerCase();
  if (/groc|shop|market/.test(text)) return "🛒";
  if (/dinner|meal|recipe|food/.test(text)) return "🍽️";
  if (/pack|trip|travel|vacation/.test(text)) return "🧳";
  if (/note|idea/.test(text)) return "📝";
  return "📝";
}

function listVisualIcon(icon: string) {
  return icon === "☰" || icon === "✦" ? "📝" : icon;
}

function choreIcon(title: string) {
  const text = title.toLowerCase();
  if (/bed|pillow|blanket/.test(text)) return "🛏️";
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

const notoIconCodes = new Set([
  "2728", "1f373", "1f382", "1f383", "1f384", "1f386", "1f389", "1f392", "1f3c3", "1f371", "1f37d", "1f423", "1f43e", "1f455", "1f497", "1f4a7", "1f4d6", "1f4da", "1f4dd", "1f5d1", "1f6c1", "1f6cf", "1f6d2", "1f968", "1f983", "1f9f3", "1f9f8", "1f9fa", "1faa5", "1fae7",
]);

function notoIconPath(emoji: string) {
  const code = Array.from(emoji)
    .filter((character) => character !== "\uFE0F" && character !== "\u200D")
    .map((character) => character.codePointAt(0)?.toString(16))
    .join("_");
  return notoIconCodes.has(code) ? `/chore-icons/${code}.svg` : null;
}

function NotoEmoji({ emoji, className = "size-4", alt = "" }: { emoji: string; className?: string; alt?: string }) {
  const source = notoIconPath(emoji);
  return source ? <img src={source} alt={alt} className={`inline-block shrink-0 object-contain ${className}`} /> : <span aria-hidden={alt ? undefined : "true"}>{emoji}</span>;
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  if (hour < 21) return "GOOD EVENING";
  return "GOOD NIGHT";
}

function nthWeekday(year: number, month: number, weekday: number, occurrence: number) {
  const date = new Date(year, month, 1);
  date.setDate(1 + ((weekday - date.getDay() + 7) % 7) + (occurrence - 1) * 7);
  return date;
}

function lastWeekday(year: number, month: number, weekday: number) {
  const date = new Date(year, month + 1, 0);
  date.setDate(date.getDate() - ((date.getDay() - weekday + 7) % 7));
  return date;
}

function easterSunday(year: number) {
  const a = year % 19; const b = Math.floor(year / 100); const c = year % 100; const d = Math.floor(b / 4); const e = b % 4; const f = Math.floor((b + 8) / 25); const g = Math.floor((b - f + 1) / 3); const h = (19 * a + b - d - g + 15) % 30; const i = Math.floor(c / 4); const k = c % 4; const l = (32 + 2 * e + 2 * i - h - k) % 7; const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}

function familyHolidaysForYear(year: number): Event[] {
  const entries: [string, Date, string][] = [
    ["New Year’s Day", new Date(year, 0, 1), "🎉 A fresh family year"], ["Valentine’s Day", new Date(year, 1, 14), "💌 Share the love"], ["Martin Luther King Jr. Day", nthWeekday(year, 0, 1, 3), "A day of service"], ["Presidents’ Day", nthWeekday(year, 1, 1, 3), "Family holiday"], ["St. Patrick’s Day", new Date(year, 2, 17), "🍀 Wear green"], ["Easter", easterSunday(year), "🐣 Family celebration"], ["Mother’s Day", nthWeekday(year, 4, 0, 2), "💐 Celebrate Mom"], ["Memorial Day", lastWeekday(year, 4, 1), "Family holiday"], ["Father’s Day", nthWeekday(year, 5, 0, 3), "🧡 Celebrate Dad"], ["Juneteenth", new Date(year, 5, 19), "Family holiday"], ["Independence Day", new Date(year, 6, 4), "🎆 Fireworks!"], ["Labor Day", nthWeekday(year, 8, 1, 1), "Family holiday"], ["Halloween", new Date(year, 9, 31), "🎃 Costume day"], ["Veterans Day", new Date(year, 10, 11), "Family holiday"], ["Thanksgiving", nthWeekday(year, 10, 4, 4), "🦃 Give thanks"], ["Christmas Eve", new Date(year, 11, 24), "🎄 Family time"], ["Christmas Day", new Date(year, 11, 25), "🎁 Merry Christmas"], ["New Year’s Eve", new Date(year, 11, 31), "✨ Countdown!"],
  ];
  return entries.map(([title, date, notes]) => ({ id: `holiday-${year}-${title}`, title, notes, time: "All day", person: "Family", color: "bg-amber-300", startsAt: new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString(), allDay: true, category: "Holiday", generatedHoliday: true }));
}

export default function Home() {
  const [events, setEvents] = useState(starterEvents);
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, title: "Order birthday present", due: "Today", done: false },
    { id: 2, title: "Call the dentist", due: "Fri", done: false },
    { id: 3, title: "Sign school form", due: "", done: false },
  ]);
  const [newItem, setNewItem] = useState("");
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventDate, setEventDate] = useState(() => localDateInputValue(new Date()));
  const [eventTime, setEventTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventMemberIds, setEventMemberIds] = useState<string[]>([]);
  const [eventLocation, setEventLocation] = useState("");
  const [eventCategory, setEventCategory] = useState("General");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"home" | "calendar" | "tasks" | "chores" | "lists" | "settings">("home");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [celebratingBirthdayDate, setCelebratingBirthdayDate] = useState<string | null>(null);
  const openedBirthdayDate = useRef<string | null>(null);
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [dark, setDark] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [sunTimes, setSunTimes] = useState<{ sunrise: number; sunset: number } | null>(null);
  const [seasonalScreenSaver, setSeasonalScreenSaver] = useState(false);
  const [screenSaver, setScreenSaver] = useState(false);
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("Your Family Home");
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteReady, setInviteReady] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [completingTodoId, setCompletingTodoId] = useState<string | number | null>(null);
  const [celebratingTaskId, setCelebratingTaskId] = useState<string | number | null>(null);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoDueDate, setTodoDueDate] = useState("");
  const [todoAssigneeMemberId, setTodoAssigneeMemberId] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<ChoreEntry[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);
  const [googleConnections, setGoogleConnections] = useState<GoogleConnection[]>([]);
  const [appleFeeds, setAppleFeeds] = useState<AppleFeed[]>([]);
  const [celebratingChoreId, setCelebratingChoreId] = useState<string | number | null>(null);
  const [moodCheckins, setMoodCheckins] = useState<MoodCheckin[]>([]);
  const [moodMemberId, setMoodMemberId] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodKey>("good");
  const [savingMood, setSavingMood] = useState(false);
  const [moodMessage, setMoodMessage] = useState("");

  useEffect(() => {
    if (screenSaver || !window.matchMedia("(min-width: 768px)").matches) return;
    let seasonalTimeout: number | undefined;
    let photoTimeout: number | undefined;
    const startTimers = () => {
      window.clearTimeout(seasonalTimeout);
      window.clearTimeout(photoTimeout);
      if (new Date().getMonth() === 9) seasonalTimeout = window.setTimeout(() => setSeasonalScreenSaver(true), 5 * 60_000);
      photoTimeout = window.setTimeout(() => setScreenSaver(true), 15 * 60_000);
    };
    const resetIdleTimer = () => {
      setSeasonalScreenSaver(false);
      startTimers();
    };
    startTimers();
    window.addEventListener("pointerdown", resetIdleTimer, { passive: true });
    window.addEventListener("keydown", resetIdleTimer);
    window.addEventListener("scroll", resetIdleTimer, { passive: true });
    return () => {
      window.clearTimeout(seasonalTimeout);
      window.clearTimeout(photoTimeout);
      window.removeEventListener("pointerdown", resetIdleTimer);
      window.removeEventListener("keydown", resetIdleTimer);
      window.removeEventListener("scroll", resetIdleTimer);
    };
  }, [screenSaver]);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    setInviteToken(token);
    setInviteReady(true);
  }, []);

  useEffect(() => {
    if (!supabase || !householdId) return;
    async function checkAndRefreshGoogleCalendar() {
      const { data } = await supabase!.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) return;
      const response = await fetch(`/api/google-calendar/sync?householdId=${encodeURIComponent(householdId!)}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const status = await response.json();
      if (!response.ok) return;
      setGoogleConnected(Boolean(status.connected));
      if (status.connected && (!status.lastSyncedAt || Date.now() - new Date(status.lastSyncedAt).getTime() > 10 * 60_000)) await syncGoogleCalendar(false);
    }
    void checkAndRefreshGoogleCalendar();
  }, [householdId]);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("calendar");
    if (result === "google-connected") {
      setCalendarMessage("Google Calendar connected and synced.");
      const params = new URLSearchParams(window.location.search);
      params.delete("calendar");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
    if (result === "google-error") setCalendarMessage("Google Calendar could not be connected. Check your setup and try again.");
  }, []);

  useEffect(() => {
    if (!/(connected and synced|calendar synced|already up to date)/i.test(calendarMessage)) return;
    const timeout = window.setTimeout(() => setCalendarMessage(""), 10 * 60_000);
    return () => window.clearTimeout(timeout);
  }, [calendarMessage]);

  useEffect(() => {
    document.title = householdName;
  }, [householdName]);

  useEffect(() => {
    if (!supabase || !user || !inviteReady) return;
    async function loadMembership() {
      if (inviteToken) {
        const { data: invitedHouseholdId, error } = await supabase!.rpc("accept_household_invite", { p_token: inviteToken });
        if (error) setInviteMessage(error.message);
        if (invitedHouseholdId) {
          setInviteMessage("You’re in! Welcome to the family home.");
          const params = new URLSearchParams(window.location.search);
          params.delete("invite");
          window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`);
          setInviteToken(null);
        }
      }
      const { data } = await supabase!.from("members").select("household_id").eq("user_id", user!.id).limit(1);
      const id = data?.[0]?.household_id ?? null;
      setHouseholdId(id);
      if (id) {
        const { data: household } = await supabase!.from("households").select("name, theme_mode").eq("id", id).single();
        if (household) {
          setHouseholdName(household.name);
          if (household.theme_mode === "light" || household.theme_mode === "dark" || household.theme_mode === "auto") setThemeMode(household.theme_mode);
        }
      }
      setDataReady(true);
    }
    void loadMembership();
  }, [user, inviteReady, inviteToken]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      supabase.from("events").select("id, title, notes, starts_at, ends_at, all_day, color, location, category, member_ids, external_id, series_external_id, source").eq("household_id", householdId).order("starts_at"),
      supabase.from("todos").select("id, title, due_at, status, completed_at, assignee_member_id").eq("household_id", householdId).neq("status", "archived").order("due_at"),
      supabase.from("members").select("id, user_id, display_name, role, color").eq("household_id", householdId).order("created_at"),
      supabase.from("chores").select("id, title, emoji, assignee_member_id, sort_order, routine, is_daily, is_fixed, scheduled_for, active").eq("household_id", householdId).order("sort_order").order("created_at"),
      supabase.from("chore_completions").select("id, chore_id, completed_at").order("completed_at", { ascending: false }),
      supabase.from("lists").select("id, title, icon").eq("household_id", householdId).order("created_at"),
      supabase.from("list_items").select("id, list_id, title, completed").order("created_at"),
      supabase.from("google_calendar_connections").select("id, display_name, enabled").eq("household_id", householdId).order("created_at"),
      supabase.from("calendar_feeds").select("id, display_name, enabled").eq("household_id", householdId).eq("provider", "apple").order("created_at"),
      supabase.from("mood_checkins").select("id, member_id, mood, checked_in_at").eq("household_id", householdId).eq("checkin_date", localDateInputValue(new Date())).order("checked_in_at", { ascending: false }),
      supabase.from("calendar_event_member_assignments").select("source, external_id, member_ids").eq("household_id", householdId),
    ]).then(async ([eventResult, todoResult, memberResult, choreResult, completionResult, listResult, listItemResult, connectionResult, appleFeedResult, moodResult, eventAssignmentResult]) => {
      const assignmentByEvent = new Map((eventAssignmentResult.data ?? []).map((assignment) => [`${assignment.source}:${assignment.external_id}`, assignment.member_ids]));
      if (eventResult.data) setEvents(displayEventsOnce(eventResult.data.map((event) => ({
        id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, endsAt: event.ends_at, notes: event.notes, location: event.location, category: event.category, allDay: event.all_day, memberIds: assignmentByEvent.get(`${event.source}:${event.external_id}`) ?? event.member_ids, externalId: event.external_id, seriesExternalId: event.series_external_id, source: event.source,
        time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      }))));
      if (todoResult.data) {
        const archiveBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const expiredCompleted = todoResult.data.filter((todo) => todo.status === "completed" && todo.completed_at && new Date(todo.completed_at).getTime() < archiveBefore);
        if (expiredCompleted.length) void supabase!.from("todos").update({ status: "archived" }).in("id", expiredCompleted.map((todo) => todo.id));
        const visibleTodos = todoResult.data.filter((todo) => !expiredCompleted.some((expired) => expired.id === todo.id));
        setTodos(visibleTodos.map((todo) => ({ id: todo.id, title: todo.title, due: todo.due_at ? new Date(todo.due_at).toLocaleDateString([], { weekday: "short" }) : "", dueAt: todo.due_at, done: todo.status === "completed", assigneeMemberId: todo.assignee_member_id })));
      }
      if (memberResult.data) {
        const loadedMembers = memberResult.data.map((member) => ({ id: member.id, userId: member.user_id, name: member.display_name, role: member.role, color: member.color }));
        const currentMember = loadedMembers.find((member) => member.userId === user?.id);
        if (currentMember && currentMember.name.includes("@")) {
          currentMember.name = "Kristen";
          void supabase!.from("members").update({ display_name: "Kristen" }).eq("id", currentMember.id);
        }
        if (!loadedMembers.some((member) => member.name.toLowerCase() === "matt")) {
          const { data } = await supabase!.from("members").insert({ household_id: householdId, display_name: "Matt", role: "adult", color: "#93c5fd" }).select("id, user_id, display_name, role, color").single();
          if (data) loadedMembers.push({ id: data.id, userId: data.user_id, name: data.display_name, role: data.role, color: data.color });
        }
        setMembers(loadedMembers.map(({ id, userId, name, role, color }) => ({ id, userId, name, role, color })));
        setMoodMemberId((current) => current || String(loadedMembers.find((member) => member.userId === user?.id)?.id ?? loadedMembers[0]?.id ?? ""));
      }
      if (choreResult.data) {
        const choreById = new Map(choreResult.data.map((chore) => [chore.id, chore]));
        const completionByChore = new Map<string, string>();
        for (const completion of completionResult.data ?? []) {
          const chore = choreById.get(completion.chore_id);
          const isDaily = chore?.is_daily ?? chore?.routine !== "To-do";
          if (isDaily && new Date(completion.completed_at) < todayStart) continue;
          if (!completionByChore.has(completion.chore_id)) completionByChore.set(completion.chore_id, completion.id);
        }
        setChores(choreResult.data.map((chore) => {
          const isDaily = chore.is_daily ?? chore.routine !== "To-do";
          return { id: chore.id, title: chore.title, emoji: chore.emoji, assigneeMemberId: chore.assignee_member_id, sortOrder: chore.sort_order ?? 0, routine: chore.routine ?? "To-do", isDaily, isFixed: chore.is_fixed ?? false, scheduledFor: chore.scheduled_for, completionId: completionByChore.get(chore.id) ?? (!isDaily && !chore.active ? `legacy-completed-${chore.id}` : undefined) };
        }));
      }
      if (listResult.data) {
        const itemsByList = new Map<string, SharedListItem[]>();
        (listItemResult.data ?? []).forEach((item) => itemsByList.set(item.list_id, [...(itemsByList.get(item.list_id) ?? []), { id: item.id, title: item.title, done: item.completed }]));
        setSharedLists(listResult.data.map((list) => ({ id: list.id, title: list.title, icon: list.icon, items: itemsByList.get(list.id) ?? [] })));
      }
      if (connectionResult.data) setGoogleConnections(connectionResult.data.map((connection) => ({ id: connection.id, name: connection.display_name, enabled: connection.enabled })));
      if (appleFeedResult.data) setAppleFeeds(appleFeedResult.data.map((feed) => ({ id: feed.id, name: feed.display_name, enabled: feed.enabled })));
      if (moodResult.data) {
        const loadedMoods = moodResult.data.filter((checkin) => isMoodKey(checkin.mood)).map((checkin) => ({ id: checkin.id, memberId: checkin.member_id, mood: checkin.mood, checkedInAt: checkin.checked_in_at }));
        setMoodCheckins(loadedMoods);
        const initialMemberId = String(memberResult.data?.find((member) => member.user_id === user?.id)?.id ?? memberResult.data?.[0]?.id ?? "");
        const initialMood = loadedMoods.find((checkin) => String(checkin.memberId) === initialMemberId)?.mood;
        if (initialMood) setSelectedMood(initialMood);
      }
    });
  }, [householdId, todayKey, user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setTodayKey((current) => {
      const next = new Date().toDateString();
      return current === next ? current : next;
    }), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadWeather(latitude: number, longitude: number) {
      try {
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&temperature_unit=fahrenheit&timezone=auto&timeformat=unixtime`);
        if (!weatherResponse.ok) throw new Error("Weather request failed");
        const data = await weatherResponse.json();
        setWeather({ temperature: Math.round(data.current.temperature_2m), high: Math.round(data.daily.temperature_2m_max[0]), low: Math.round(data.daily.temperature_2m_min[0]), summary: weatherSummary(data.current.weather_code), location: "Local forecast", code: data.current.weather_code, isDay: Boolean(data.current.is_day) });
        if (data.daily.sunrise?.[0] && data.daily.sunset?.[0]) setSunTimes({ sunrise: data.daily.sunrise[0] * 1000, sunset: data.daily.sunset[0] * 1000 });

        // A city name is nice to have, but its lookup must never hide usable weather.
        try {
          const placeResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (!placeResponse.ok) return;
          const place = await placeResponse.json();
          const address = place.address ?? {};
          const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.city_district ?? address.county;
          if (city) setWeather((current) => current ? { ...current, location: city } : current);
        } catch { /* Keep the useful "Local forecast" fallback. */ }
      } catch { setWeather(null); }
    }
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (position) => loadWeather(position.coords.latitude, position.coords.longitude),
      () => setWeather(null),
      { maximumAge: 900000, timeout: 8000 },
    );
  }, []);

  useEffect(() => {
    function applyTheme() {
      if (themeMode === "light") { setDark(false); return; }
      if (themeMode === "dark") { setDark(true); return; }
      if (sunTimes) {
        const now = Date.now();
        setDark(now < sunTimes.sunrise || now >= sunTimes.sunset);
      } else setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    applyTheme();
    const interval = window.setInterval(applyTheme, 60_000);
    return () => window.clearInterval(interval);
  }, [themeMode, sunTimes]);
  const openTodos = useMemo(() => todos.filter((todo) => !todo.done), [todos]);
  const calendarEvents = useMemo(() => [...events, ...[calendarAnchor.getFullYear() - 1, calendarAnchor.getFullYear(), calendarAnchor.getFullYear() + 1].flatMap(familyHolidaysForYear)], [events, calendarAnchor]);

  useEffect(() => {
    if (view !== "Day") {
      openedBirthdayDate.current = null;
      setCelebratingBirthdayDate(null);
      return;
    }
    const dateKey = calendarAnchor.toDateString();
    const hasBirthday = calendarEvents.some((event) => eventOccursOn(event, calendarAnchor) && isBirthdayEvent(event));
    if (!hasBirthday || openedBirthdayDate.current === dateKey) return;
    openedBirthdayDate.current = dateKey;
    setCelebratingBirthdayDate(dateKey);
    const timer = window.setTimeout(() => setCelebratingBirthdayDate((date) => date === dateKey ? null : date), 3000);
    return () => window.clearTimeout(timer);
  }, [view, calendarAnchor, calendarEvents]);

  function openEventFormAt(day: Date, time = "09:00") {
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const [hours, minutes] = time.split(":").map(Number);
    const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes + 60);
    setNewItem("");
    setEventDate(date);
    setEventTime(time);
    setEventEndTime(`${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`);
    setEventAllDay(false);
    setEventLocation("");
    setEventCategory("General");
    setEventMemberIds([]);
    setShowEventForm(true);
  }

  function addEvent(event: FormEvent) {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    const startsAt = new Date(`${eventDate}T${eventTime}:00`);
    const selectedEnd = new Date(`${eventDate}T${eventEndTime}:00`);
    const endsAt = eventAllDay ? null : selectedEnd > startsAt ? selectedEnd : new Date(startsAt.getTime() + 60 * 60_000);
    if (supabase && user && householdId) {
      supabase.from("events").insert({ household_id: householdId, created_by: user.id, title, starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null, all_day: eventAllDay, color: "#34d399", location: eventLocation.trim() || null, category: eventCategory, member_ids: eventMemberIds }).select("id").single().then(({ data, error }) => {
        if (!error && data) setEvents((items) => [...items, { id: data.id, title, time: eventAllDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), person: "Family", color: "bg-emerald-400", startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, location: eventLocation.trim() || null, category: eventCategory, allDay: eventAllDay, memberIds: eventMemberIds }]);
      });
    } else {
      setEvents((items) => [...items, { id: Date.now().toString(), title, time: eventAllDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), person: "Family", color: "bg-emerald-400", startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, location: eventLocation.trim() || null, category: eventCategory, allDay: eventAllDay, memberIds: eventMemberIds }]);
    }
    setNewItem("");
    setEventLocation("");
    setEventCategory("General");
    setEventMemberIds([]);
    setCalendarAnchor(startsAt);
    setShowEventForm(false);
  }

  function addTodo() {
    setEditingTodo(null);
    setTodoTitle("");
    setTodoDueDate("");
    setTodoAssigneeMemberId("");
    setShowTodoForm(true);
  }

  function editTodo(todo: Todo) {
    setEditingTodo(todo);
    setTodoTitle(todo.title);
    setTodoDueDate(todo.dueAt ? todo.dueAt.slice(0, 10) : "");
    setTodoAssigneeMemberId(String(todo.assigneeMemberId ?? ""));
    setShowTodoForm(true);
  }

  async function saveTodo(event: FormEvent) {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;
    const assigneeMemberId = todoAssigneeMemberId || null;
    const dueAt = todoDueDate ? `${todoDueDate}T12:00:00.000Z` : null;
    if (editingTodo && supabase && householdId) {
      const { error } = await supabase.from("todos").update({ title, assignee_member_id: assigneeMemberId, due_at: dueAt }).eq("id", editingTodo.id).eq("household_id", householdId);
      if (error) { window.alert(`Could not update this task: ${error.message}`); return; }
      setTodos((items) => items.map((todo) => todo.id === editingTodo.id ? { ...todo, title, due: dueAt ? new Date(dueAt).toLocaleDateString([], { weekday: "short" }) : "", dueAt, assigneeMemberId } : todo));
    } else if (editingTodo) {
      setTodos((items) => items.map((todo) => todo.id === editingTodo.id ? { ...todo, title, due: dueAt ? new Date(dueAt).toLocaleDateString([], { weekday: "short" }) : "", dueAt, assigneeMemberId } : todo));
    } else if (supabase && user && householdId) {
      const { data, error } = await supabase.from("todos").insert({ household_id: householdId, created_by: user.id, title, due_at: dueAt, assignee_member_id: assigneeMemberId }).select("id, assignee_member_id, due_at").single();
      if (error) { window.alert(`Could not add this task: ${error.message}`); return; }
      if (data) setTodos((items) => [...items, { id: data.id, title, due: data.due_at ? new Date(data.due_at).toLocaleDateString([], { weekday: "short" }) : "", dueAt: data.due_at, done: false, assigneeMemberId: data.assignee_member_id }]);
    } else {
      setTodos((items) => [...items, { id: Date.now().toString(), title, due: dueAt ? new Date(dueAt).toLocaleDateString([], { weekday: "short" }) : "", dueAt, done: false, assigneeMemberId }]);
    }
    setEditingTodo(null);
    setShowTodoForm(false);
  }

  async function connectGoogleCalendar() {
    if (!supabase || !householdId) { setCalendarMessage("Sign in and create your household before connecting a calendar."); return; }
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) { setCalendarMessage("Your session has expired. Please sign in again."); return; }
    setCalendarMessage("Opening Google…");
    const response = await fetch("/api/google-calendar/connect", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId }) });
    const result = await response.json();
    if (!response.ok || !result.url) { setCalendarMessage(result.error ?? "Could not start Google Calendar connection."); return; }
    window.location.assign(result.url);
  }

  async function refreshCalendarEvents() {
    if (!supabase || !householdId) return;
    const [{ data }, { data: assignments }] = await Promise.all([
      supabase.from("events").select("id, title, notes, starts_at, ends_at, all_day, color, location, category, member_ids, external_id, series_external_id, source").eq("household_id", householdId).order("starts_at"),
      supabase.from("calendar_event_member_assignments").select("source, external_id, member_ids").eq("household_id", householdId),
    ]);
    const assignmentByEvent = new Map((assignments ?? []).map((assignment) => [`${assignment.source}:${assignment.external_id}`, assignment.member_ids]));
    if (data) setEvents(displayEventsOnce(data.map((event) => ({
      id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, endsAt: event.ends_at, notes: event.notes, location: event.location, category: event.category, allDay: event.all_day, memberIds: assignmentByEvent.get(`${event.source}:${event.external_id}`) ?? event.member_ids, externalId: event.external_id, seriesExternalId: event.series_external_id, source: event.source,
      time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }))));
  }

  async function syncGoogleCalendar(force = true) {
    if (!supabase || !householdId || syncingGoogle) return;
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) { setCalendarMessage("Your session has expired. Please sign in again."); return; }
    setSyncingGoogle(true);
    const response = await fetch("/api/google-calendar/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId, force }) });
    const result = await response.json();
    setSyncingGoogle(false);
    if (!response.ok) {
      if (result.error === "Google Calendar credentials were not found.") {
        setGoogleConnected(false);
        setCalendarMessage("Google Calendar needs to be reconnected. Tap Connect Google to finish setup.");
      } else setCalendarMessage(result.error ?? "Could not sync Google Calendar.");
      return;
    }
    if (result.needsConnection) { setGoogleConnected(false); setCalendarMessage("Connect Google Calendar first."); return; }
    setGoogleConnected(true);
    await refreshCalendarEvents();
    setCalendarMessage(result.skipped ? "Google Calendar is already up to date." : `Google Calendar synced${result.imported ? ` · ${result.imported} events checked` : ""}.`);
  }

  async function toggleGoogleCalendar(connection: GoogleConnection) {
    if (connection.enabled) {
      if (!window.confirm(`Remove “${connection.name}” and all of its imported events from this family calendar? This will not change anything in Google.`)) return;
      if (!supabase || !householdId) return;
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) { window.alert("Your session has expired. Please sign in again."); return; }
      setGoogleConnections((items) => items.filter((item) => item.id !== connection.id));
      const response = await fetch("/api/google-calendar/remove", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId, connectionId: connection.id }) });
      const result = await response.json();
      if (!response.ok) { setGoogleConnections((items) => [...items, connection]); window.alert(result.error ?? "Could not remove Google Calendar."); return; }
      await refreshCalendarEvents();
      setCalendarMessage(`${connection.name} and its imported events were removed.`);
      return;
    }
    const enabled = !connection.enabled;
    setGoogleConnections((items) => items.map((item) => item.id === connection.id ? { ...item, enabled } : item));
    if (supabase) {
      const { error } = await supabase.from("google_calendar_connections").update({ enabled }).eq("id", connection.id);
      if (error) { setGoogleConnections((items) => items.map((item) => item.id === connection.id ? connection : item)); window.alert(error.message); }
    }
  }

  async function syncAppleCalendar(feedId?: string) {
    if (!supabase || !householdId) return;
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) { setCalendarMessage("Your session has expired. Please sign in again."); return; }
    const response = await fetch("/api/calendar-feeds/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId, feedId }) });
    const result = await response.json();
    if (!response.ok) { window.alert(result.error ?? "Could not sync Apple Calendar."); return; }
    await refreshCalendarEvents();
    setCalendarMessage(`Apple Calendar synced${result.imported ? ` · ${result.imported} events checked` : ""}.`);
  }

  async function syncAllCalendars() {
    const actions: Promise<void>[] = [];
    if (googleConnected) actions.push(syncGoogleCalendar(true));
    if (appleFeeds.some((feed) => feed.enabled)) actions.push(syncAppleCalendar());
    if (actions.length) await Promise.all(actions);
  }

  async function addAppleCalendar(name: string, url: string) {
    if (!supabase || !householdId || !user) return;
    const { data, error } = await supabase.from("calendar_feeds").insert({ household_id: householdId, created_by: user.id, display_name: name, feed_url: url, provider: "apple" }).select("id, display_name, enabled").single();
    if (error) { window.alert(error.message); return; }
    if (data) {
      setAppleFeeds((feeds) => [...feeds, { id: data.id, name: data.display_name, enabled: data.enabled }]);
      await syncAppleCalendar(data.id);
    }
  }

  async function toggleAppleCalendar(feed: AppleFeed) {
    const enabled = !feed.enabled;
    setAppleFeeds((feeds) => feeds.map((item) => item.id === feed.id ? { ...item, enabled } : item));
    if (supabase) {
      const { error } = await supabase.from("calendar_feeds").update({ enabled }).eq("id", feed.id);
      if (error) { setAppleFeeds((feeds) => feeds.map((item) => item.id === feed.id ? feed : item)); window.alert(error.message); }
    }
  }

  function toggleTodo(id: string | number) {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;
    const done = !target.done;
    const checkbox = Array.from(document.querySelectorAll<HTMLButtonElement>("button[aria-label^='Complete ']"))
      .find((button) => button.getAttribute("aria-label") === `Complete ${target.title}`);
    const finish = () => {
      setTodos((items) => items.map((todo) => todo.id === id ? { ...todo, done } : todo));
      if (supabase && householdId) supabase.from("todos").update({ status: done ? "completed" : "open", completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("household_id", householdId).then(() => undefined);
      checkbox?.classList.remove("task-checking");
      setCompletingTodoId(null);
      setCelebratingTaskId(null);
    };
    if (done) {
      if (completingTodoId === id) return;
      setCompletingTodoId(id);
      setCelebratingTaskId(id);
      checkbox?.classList.add("task-checking");
      window.setTimeout(finish, 3000);
      return;
    }
    finish();
  }

  async function deleteTodo(id: string | number) {
    const target = todos.find((todo) => todo.id === id);
    if (!target || !window.confirm(`Permanently delete “${target.title}”?`)) return;
    setTodos((items) => items.filter((todo) => todo.id !== id));
    if (supabase && householdId) {
      const { error } = await supabase.from("todos").delete().eq("id", id).eq("household_id", householdId);
      if (error) {
        setTodos((items) => [...items, target]);
        window.alert(`Could not delete this task: ${error.message}`);
      }
    }
  }

  useEffect(() => {
    const handleTaskDeletion: EventListener = (event) => {
      void deleteTodo((event as unknown as CustomEvent<string | number>).detail);
    };
    window.addEventListener("family-delete-todo", handleTaskDeletion);
    return () => window.removeEventListener("family-delete-todo", handleTaskDeletion);
  }, [todos, householdId]);

  useEffect(() => {
    const handleChoreEdit: EventListener = (event) => {
      const choreId = (event as unknown as CustomEvent<string | number>).detail;
      const chore = chores.find((item) => item.id === choreId);
      if (chore) void editChore(chore);
    };
    window.addEventListener("family-edit-chore", handleChoreEdit);
    return () => window.removeEventListener("family-edit-chore", handleChoreEdit);
  }, [chores, householdId]);

  async function addMember(name: string, role: Member["role"]) {
    const trimmedName = name.trim();
    if (!trimmedName) return { error: "Enter a name." };
    if (!householdId) return { error: "Open your family home before adding someone." };
    const color = memberColorOptions[members.length % memberColorOptions.length];
    if (supabase) {
      const { data, error } = await supabase.from("members").insert({ household_id: householdId, display_name: trimmedName, role, color }).select("id, user_id, display_name, role, color").single();
      if (error) return { error: error.message };
      if (data) setMembers((items) => [...items, { id: data.id, userId: data.user_id, name: data.display_name, role: data.role, color: data.color }]);
    } else setMembers((items) => [...items, { id: Date.now().toString(), name: trimmedName, role, color }]);
    return {};
  }

  async function addChild() {
    const name = window.prompt("Child's name?");
    if (!name?.trim()) return;
    const result = await addMember(name, "child");
    if (result.error) window.alert(result.error);
  }

  async function addChore(memberId: string | number, routine: string) {
    const title = window.prompt("What is the chore?");
    if (!title?.trim() || !householdId) return;
    const emoji = choreIcon(title);
    const isDaily = false;
    const scheduledFor = routine === "To-do" ? null : new Date().toLocaleDateString("en-CA");
    const sortOrder = Math.max(0, ...chores.filter((chore) => String(chore.assigneeMemberId) === String(memberId) && chore.routine === routine).map((chore) => chore.sortOrder)) + 1;
    if (supabase) {
      const { data, error } = await supabase.from("chores").insert({ household_id: householdId, assignee_member_id: memberId, title: title.trim(), emoji, sort_order: sortOrder, routine, is_daily: isDaily, scheduled_for: scheduledFor }).select("id, title, emoji, assignee_member_id, sort_order, routine, is_daily, scheduled_for").single();
      if (error) { window.alert(error.message); return; }
      if (data) setChores((items) => [...items, { id: data.id, title: data.title, emoji: data.emoji, assigneeMemberId: data.assignee_member_id, sortOrder: data.sort_order, routine: data.routine, isDaily: data.is_daily, isFixed: false, scheduledFor: data.scheduled_for }]);
    } else setChores((items) => [...items, { id: Date.now().toString(), title: title.trim(), emoji, assigneeMemberId: memberId, sortOrder, routine, isDaily, isFixed: false, scheduledFor }]);
  }

  async function editChore(chore: ChoreEntry) {
    if (chore.isFixed) return;
    const title = window.prompt("Update this chore", chore.title)?.trim();
    if (!title || title === chore.title) return;
    const emoji = choreIcon(title);
    setChores((items) => items.map((item) => item.id === chore.id ? { ...item, title, emoji } : item));
    if (supabase) {
      const { error } = await supabase.from("chores").update({ title, emoji }).eq("id", chore.id).eq("household_id", householdId);
      if (error) { window.alert(`Could not update this chore: ${error.message}`); }
    }
  }

  async function reorderChores(memberId: string | number, routine: string, movedId: string | number, targetId: string | number) {
    if (movedId === targetId) return;
    const memberChores = chores.filter((chore) => String(chore.assigneeMemberId) === String(memberId) && chore.routine === routine && !chore.completionId).sort((first, second) => first.sortOrder - second.sortOrder);
    const fromIndex = memberChores.findIndex((chore) => chore.id === movedId);
    const targetIndex = memberChores.findIndex((chore) => chore.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return;
    const reordered = [...memberChores];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const newOrders = new Map(reordered.map((chore, index) => [chore.id, index + 1]));
    setChores((items) => items.map((chore) => newOrders.has(chore.id) ? { ...chore, sortOrder: newOrders.get(chore.id)! } : chore));
    const client = supabase;
    if (client) {
      const results = await Promise.all(reordered.map((chore, index) => client.from("chores").update({ sort_order: index + 1 }).eq("id", chore.id)));
      const error = results.find((result) => result.error)?.error;
      if (error) { window.alert(`Could not save chore order: ${error.message}`); }
    }
  }

  async function toggleChore(chore: ChoreEntry) {
    if (chore.completionId) {
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: undefined } : item));
      if (supabase) {
        if (String(chore.completionId).startsWith("legacy-completed-")) await supabase.from("chores").update({ active: true }).eq("id", chore.id);
        else await supabase.from("chore_completions").delete().eq("id", chore.completionId);
      }
      return;
    }
    const today = new Date().toLocaleDateString("en-CA");
    const completesRoutine = chores
      .filter((item) => String(item.assigneeMemberId) === String(chore.assigneeMemberId) && item.routine === chore.routine && isVisibleRoutineChore(item, today))
      .every((item) => item.id === chore.id || Boolean(item.completionId));
    const choreCard = document.querySelector<HTMLElement>(`[data-chore-id="${String(chore.id)}"]`);
    choreCard?.setAttribute("data-completing", "true");
    const finishCheckboxAnimation = () => new Promise<void>((resolve) => window.setTimeout(() => {
      choreCard?.removeAttribute("data-completing");
      resolve();
    }, 700));
    if (!chore.isDaily) {
      const client = supabase;
      if (client) {
        const { data, error } = await client.from("chore_completions").insert({ chore_id: chore.id, member_id: chore.assigneeMemberId }).select("id").single();
        if (error) { choreCard?.removeAttribute("data-completing"); window.alert(error.message); return; }
        await finishCheckboxAnimation();
        setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: data?.id } : item));
      } else {
        await finishCheckboxAnimation();
        setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: Date.now().toString() } : item));
      }
      if (completesRoutine) setCelebratingChoreId(chore.id);
      if (completesRoutine) window.setTimeout(() => setCelebratingChoreId((id) => id === chore.id ? null : id), 3000);
      return;
    }
    if (supabase) {
      const { data, error } = await supabase.from("chore_completions").insert({ chore_id: chore.id, member_id: chore.assigneeMemberId }).select("id").single();
      if (error) { choreCard?.removeAttribute("data-completing"); window.alert(error.message); return; }
      await finishCheckboxAnimation();
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: data?.id } : item));
    } else {
      await finishCheckboxAnimation();
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: Date.now().toString() } : item));
    }
    if (completesRoutine) {
      setCelebratingChoreId(chore.id);
      window.setTimeout(() => setCelebratingChoreId((id) => id === chore.id ? null : id), 3000);
    }
  }

  async function deleteChore(chore: ChoreEntry) {
    if (!window.confirm(`Delete “${chore.title}”?`)) return;
    setChores((items) => items.filter((item) => item.id !== chore.id));
    if (supabase) {
      const { error } = await supabase.from("chores").delete().eq("id", chore.id);
      if (error) { setChores((items) => [...items, chore]); window.alert(`Could not delete this chore: ${error.message}`); }
    }
  }

  async function addSharedList() {
    const title = window.prompt("Name this list");
    if (!title?.trim() || !householdId || !user) return;
    const icon = listIcon(title);
    if (supabase) {
      const { data, error } = await supabase.from("lists").insert({ household_id: householdId, created_by: user.id, title: title.trim(), icon }).select("id, title, icon").single();
      if (error) { window.alert(error.message); return; }
      if (data) setSharedLists((items) => [...items, { ...data, items: [] }]);
    } else setSharedLists((items) => [...items, { id: Date.now().toString(), title: title.trim(), icon, items: [] }]);
  }

  async function addListItem(listId: string | number) {
    const title = window.prompt("Add an item");
    if (!title?.trim()) return;
    if (supabase) {
      const { data, error } = await supabase.from("list_items").insert({ list_id: listId, title: title.trim() }).select("id, title, completed").single();
      if (error) { window.alert(error.message); return; }
      if (data) setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: [...list.items, { id: data.id, title: data.title, done: data.completed }] } : list));
    } else setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: [...list.items, { id: Date.now().toString(), title: title.trim(), done: false }] } : list));
  }

  async function toggleListItem(listId: string | number, itemId: string | number) {
    const item = sharedLists.find((list) => list.id === listId)?.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const done = !item.done;
    setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.map((entry) => entry.id === itemId ? { ...entry, done } : entry) } : list));
    if (supabase) await supabase.from("list_items").update({ completed: done }).eq("id", itemId);
  }

  async function deleteListItem(listId: string | number, itemId: string | number) {
    const item = sharedLists.find((list) => list.id === listId)?.items.find((entry) => entry.id === itemId);
    if (!item || !window.confirm(`Delete “${item.title}”?`)) return;
    setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.filter((entry) => entry.id !== itemId) } : list));
    if (supabase) {
      const { error } = await supabase.from("list_items").delete().eq("id", itemId);
      if (error) {
        setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: [...list.items, item] } : list));
        window.alert(`Could not delete this item: ${error.message}`);
      }
    }
  }

  async function deleteSharedList(list: SharedList) {
    if (!window.confirm(`Delete “${list.title}” and all of its items?`)) return;
    setSharedLists((items) => items.filter((item) => item.id !== list.id));
    if (supabase) {
      const { error } = await supabase.from("lists").delete().eq("id", list.id);
      if (error) { setSharedLists((items) => [...items, list]); window.alert(`Could not delete this list: ${error.message}`); }
    }
  }

  async function saveEvent(event: Event) {
    const previous = events.find((item) => item.id === event.id);
    setEvents((items) => items.map((item) => item.id === event.id ? event : item));
    if (supabase && householdId) {
      if (event.externalId && (event.source === "google" || event.source === "apple") && user) {
        const { error: assignmentError } = await supabase.from("calendar_event_member_assignments").upsert({ household_id: householdId, created_by: user.id, source: event.source, external_id: event.externalId, member_ids: event.memberIds ?? [] }, { onConflict: "household_id,source,external_id" });
        if (assignmentError) window.alert(`The event was saved, but its sync-proof assignment could not be stored. Run the calendar assignment migration, then save it again. Details: ${assignmentError.message}`);
      }
      const { error } = await supabase.from("events").update({ title: event.title, starts_at: event.startsAt, ends_at: event.endsAt ?? null, all_day: event.allDay ?? false, location: event.location ?? null, category: event.category ?? "General", category_override: true, member_ids: event.memberIds ?? [], member_ids_override: Boolean(event.seriesExternalId) }).eq("id", event.id).eq("household_id", householdId);
      if (error) {
        if (previous) setEvents((items) => items.map((item) => item.id === previous.id ? previous : item));
        window.alert(`Could not save this event: ${error.message}`);
        return;
      }
    }
    setEditingEvent(null);
  }

  async function applySeriesMembers(event: Event, memberIds: string[]) {
    if (!supabase || !householdId || !user || !event.seriesExternalId || (event.source !== "google" && event.source !== "apple")) return;
    setEvents((items) => items.map((item) => item.source === event.source && item.seriesExternalId === event.seriesExternalId ? { ...item, memberIds } : item));
    setEditingEvent(null);
    const { data: seriesEvents, error: seriesEventsError } = await supabase.from("events").select("external_id").eq("household_id", householdId).eq("source", event.source).eq("series_external_id", event.seriesExternalId).not("external_id", "is", null);
    if (seriesEventsError) { window.alert(`Could not update the recurring event: ${seriesEventsError.message}`); await refreshCalendarEvents(); return; }
    const externalIds = (seriesEvents ?? []).map((seriesEvent) => seriesEvent.external_id).filter((externalId): externalId is string => Boolean(externalId));
    if (externalIds.length) {
      const { error: clearEventAssignmentsError } = await supabase.from("calendar_event_member_assignments").delete().eq("household_id", householdId).eq("source", event.source).in("external_id", externalIds);
      if (clearEventAssignmentsError) { window.alert(`Could not update the recurring event: ${clearEventAssignmentsError.message}`); await refreshCalendarEvents(); return; }
    }
    const { error: assignmentError } = await supabase.from("calendar_series_member_assignments").upsert({ household_id: householdId, created_by: user.id, source: event.source, series_external_id: event.seriesExternalId, member_ids: memberIds }, { onConflict: "household_id,source,series_external_id" });
    if (assignmentError) { window.alert(`Could not update the recurring event: ${assignmentError.message}`); await refreshCalendarEvents(); return; }
    const { error: eventError } = await supabase.from("events").update({ member_ids: memberIds, member_ids_override: false }).eq("household_id", householdId).eq("source", event.source).eq("series_external_id", event.seriesExternalId);
    if (eventError) { window.alert(`The recurring assignment was saved, but some current events could not be updated: ${eventError.message}`); }
    await refreshCalendarEvents();
  }

  async function deleteEvent(event: Event) {
    const imported = event.source === "google" || event.source === "apple";
    if (!window.confirm(imported ? `Remove “${event.title}” from this app? It will return on a later calendar sync while it still exists in ${event.source === "google" ? "Google" : "iCloud"}.` : `Delete “${event.title}”? This can’t be undone.`)) return;
    setEvents((items) => items.filter((item) => item.id !== event.id));
    setEditingEvent(null);
    if (supabase && householdId) {
      const { error } = await supabase.from("events").delete().eq("id", event.id).eq("household_id", householdId);
      if (error) {
        setEvents((items) => [...items, event].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()));
        window.alert(`Could not delete this event: ${error.message}`);
      }
    }
  }

  async function saveMoodCheckin() {
    if (!moodMemberId || savingMood) return false;
    const member = members.find((item) => String(item.id) === moodMemberId);
    if (!member) return false;
    const checkedInAt = new Date().toISOString();
    const optimistic: MoodCheckin = { id: `local-${moodMemberId}`, memberId: member.id, mood: selectedMood, checkedInAt };
    const previous = moodCheckins;
    setMoodCheckins((items) => [optimistic, ...items.filter((item) => String(item.memberId) !== moodMemberId)]);
    setMoodMessage("");
    setSavingMood(true);

    if (supabase && householdId && user) {
      const { data, error } = await supabase.from("mood_checkins").upsert({ household_id: householdId, member_id: member.id, checkin_date: localDateInputValue(new Date()), mood: selectedMood, checked_in_at: checkedInAt, created_by: user.id }, { onConflict: "household_id,member_id,checkin_date" }).select("id, member_id, mood, checked_in_at").single();
      if (error) {
        setMoodCheckins(previous);
        const message = error.code === "42P01"
          ? "Run the mood check-ins migration in Supabase first."
          : error.code === "42501"
            ? "Supabase blocked this check-in. Re-run the latest mood check-ins migration to refresh its policy."
            : `Couldn’t save ${member.name}’s check-in: ${error.message}`;
        setMoodMessage(message);
        setSavingMood(false);
        return false;
      }
      if (data && isMoodKey(data.mood)) setMoodCheckins((items) => [ { id: data.id, memberId: data.member_id, mood: data.mood, checkedInAt: data.checked_in_at }, ...items.filter((item) => String(item.memberId) !== moodMemberId) ]);
    }

    setMoodMessage(`${member.name} checked in as ${moodOption(selectedMood).label}.`);
    setSavingMood(false);
    return true;
  }

  function updateThemeMode(mode: ThemeMode) {
    setThemeMode(mode);
    if (mode === "light") setDark(false);
    if (mode === "dark") setDark(true);
    if (supabase && householdId) void supabase.from("households").update({ theme_mode: mode }).eq("id", householdId);
  }

  async function updateMemberColor(memberId: string | number, color: string) {
    if (!isHexColor(color)) return;
    const previousColor = members.find((member) => String(member.id) === String(memberId))?.color;
    setMembers((items) => items.map((member) => String(member.id) === String(memberId) ? { ...member, color } : member));
    if (!supabase || !householdId) return;
    const { error } = await supabase.from("members").update({ color }).eq("id", memberId).eq("household_id", householdId);
    if (error) {
      setMembers((items) => items.map((member) => String(member.id) === String(memberId) ? { ...member, color: previousColor } : member));
      window.alert(`Could not save this color: ${error.message}`);
    }
  }

  async function createHousehold() {
    if (!supabase || !user) return;
    const name = window.prompt("What should we call your household?", "The Vulpetti Family");
    if (!name?.trim()) return;
    const { error } = await supabase.from("households").insert({ name: name.trim(), created_by: user.id });
    if (error) { window.alert(error.message); return; }
    const { data: membership, error: membershipError } = await supabase
      .from("members")
      .select("household_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (membershipError || !membership) {
      window.alert("Your household was created, but could not be loaded. Refresh the page once.");
      return;
    }
    setHouseholdId(membership.household_id);
    setHouseholdName(name.trim());
  }

  async function inviteAdult(email: string, displayName: string) {
    if (!supabase || !user || !householdId) return { error: "Open your family home before inviting someone." };
    const { data, error } = await supabase.from("household_invites").insert({ household_id: householdId, created_by: user.id, email: email.trim().toLowerCase(), display_name: displayName.trim() || null }).select("token").single();
    if (error || !data) return { error: error?.message ?? "Could not create the invitation." };
    const link = `${window.location.origin}${window.location.pathname}?invite=${data.token}`;
    try { await navigator.clipboard.writeText(link); } catch { /* The visible copy field is a fallback. */ }
    return { link };
  }

  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] text-slate-500">Connecting your family home…</main>;
  if (supabase && !user) return <AuthScreen onAuthenticated={setUser} invitePending={Boolean(inviteToken)} />;
  if (supabase && user && dataReady && !householdId) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] p-6 text-slate-900"><section className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><span className="text-5xl">🏠</span>{inviteMessage ? <><h1 className="mt-5 text-2xl font-bold">We couldn&apos;t join this home</h1><p className="mt-2 text-slate-500">{inviteMessage}</p><button onClick={() => void supabase!.auth.signOut()} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Sign in with the invited email</button></> : <><h1 className="mt-5 text-2xl font-bold">Create your family home</h1><p className="mt-2 text-slate-500">This private space will hold your shared calendar, chores, and adult to-dos.</p><button onClick={createHousehold} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Create household</button></>}</section></main>;

  if (screenSaver) return <Screensaver onExit={() => setScreenSaver(false)} />;
  if (seasonalScreenSaver) return <SeasonalScreensaver onExit={() => setSeasonalScreenSaver(false)} />;

  return (
    <main className={`${dark ? "dark " : ""}h-dvh overflow-x-hidden overflow-y-auto overscroll-y-auto`}>
      <div className="min-h-full bg-[#f8f7ff] text-slate-900 transition-colors dark:bg-[#151522] dark:text-slate-100 lg:pl-28">
        <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#1c1c2b]/95 md:flex md:justify-around md:p-2 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-28 lg:border-r lg:border-t-0 lg:px-3 lg:py-6">
          <nav className="grid min-w-0 grid-cols-6 gap-1 md:flex md:flex-1 md:justify-around lg:mt-8 lg:flex-col lg:justify-start">{([ ["home", "home", "Home"], ["calendar", "calendar", "Calendar"], ["tasks", "tasks", "Tasks"], ["chores", "chores", "Chores"], ["lists", "lists", "Lists"], ["settings", "settings", "Settings"] ] as const).map(([tab, icon, label]) => <button key={tab} onClick={() => setActiveTab(tab)} title={label} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-bold transition-colors md:min-h-0 md:flex-1 md:rounded-2xl md:px-3 lg:w-full lg:flex-none lg:px-1 ${activeTab === tab ? "bg-violet-600 text-white shadow-md" : "text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10"}`}><AppIcon name={icon} className="size-5"/><span className="hidden max-w-full truncate lg:block">{label}</span></button>)}</nav>
        </aside>
        <header className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-5 md:px-9">
          <div className="flex items-center gap-3"><div className="hidden size-11 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300/50 md:grid lg:hidden"><AppIcon name="home" className="size-5"/></div><div><h1 className="text-xl font-bold tracking-tight">{householdName}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => setScreenSaver(true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">Photos</button><button onClick={() => updateThemeMode(dark ? "light" : "dark")} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:ring-white/10"><AppIcon name={dark ? "sun" : "moon"} className="size-4"/>{dark ? "Light" : "Dark"}</button></div>
        </header>
        {(activeTab === "home" || activeTab === "calendar") ? <div className="mx-auto w-full min-w-0 max-w-[1800px] space-y-5 px-5 pb-24 md:px-9 lg:pb-8">{activeTab === "home" && <>
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
            <article className="relative w-full max-md:max-w-[22rem] md:max-w-none overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#7dd3fc] via-[#60a5fa] to-[#818cf8] p-5 text-white shadow-lg shadow-sky-200/50 max-md:min-h-40 max-md:p-5 md:max-lg:min-h-40 md:max-lg:p-5 md:p-6"><span className={`absolute -right-5 -top-9 size-28 rounded-full transition-colors duration-500 max-md:-top-6 max-md:size-20 ${weatherOrbClass(weather)}`}/><div className="relative flex h-full min-w-0 items-center justify-between gap-3 max-md:gap-2 md:gap-6 md:max-lg:gap-4"><div className="min-w-0 flex-1"><p title={`${timeGreeting()} · ${weather?.location ?? "LOCAL FORECAST"}`} className="break-words text-xs font-bold leading-tight tracking-wide md:max-lg:truncate md:max-lg:text-sm md:text-sm">{timeGreeting()} · {weather?.location ?? "LOCAL FORECAST"}</p><p className="mt-2 text-4xl font-black tracking-tighter max-md:text-3xl md:max-lg:text-5xl md:text-5xl">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-semibold leading-snug text-white/90 md:max-lg:text-base md:text-base">{weather ? `${weather.summary} · ↑ ${weather.high}° ↓ ${weather.low}°` : "Allow location for today’s weather"}</p></div><span className="block size-24 shrink-0 overflow-hidden md:size-40 md:max-lg:size-28">{weather ? <WeatherAnimation weather={weather} /> : <span className="block text-6xl leading-none drop-shadow-sm md:text-8xl">☀️</span>}</span></div></article>
            <article className="min-w-0 overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-rose-500">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={addTodo} className="grid size-8 place-items-center rounded-xl bg-rose-100 text-lg font-bold text-rose-600 hover:bg-rose-200">+</button></div><div className="mt-3 min-w-0 space-y-1">{openTodos.slice(0, 5).map((todo) => { const assignee = members.find((member) => member.id === todo.assigneeMemberId); return <label key={todo.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} className="size-4 accent-rose-500"/><span className="min-w-0 flex-1 truncate font-medium">{todo.title}</span>{assignee && <span className="max-w-24 shrink-0 truncate rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${assignee.color ?? "#fda4af"}33`, color: assignee.color ?? "#be123c" }}>{assignee.name}</span>}</label>; })}{openTodos.length === 0 && <p className="text-sm text-slate-400">You&apos;re all caught up.</p>}</div><button onClick={() => setActiveTab("tasks")} className="mt-2 text-xs font-bold text-violet-600">View all tasks →</button></article>
            <div className="min-w-0 md:hidden"><PhoneHomeCalendar events={calendarEvents} members={members} onOpenDay={(day) => { setCalendarAnchor(day); setView("Day"); setActiveTab("calendar"); }} onOpenEvent={setSelectedEvent} /></div>
            <FamilyMoodCard members={members} checkins={moodCheckins} selectedMemberId={moodMemberId} selectedMood={selectedMood} saving={savingMood} message={moodMessage} onMemberChange={(memberId) => { setMoodMemberId(memberId); setSelectedMood(moodCheckins.find((checkin) => String(checkin.memberId) === memberId)?.mood ?? "good"); setMoodMessage(""); }} onMoodChange={setSelectedMood} onSave={saveMoodCheckin} />
          </section>
          <section className="hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:block md:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">CALENDAR</p><h2 className="text-xl font-bold">This month</h2></div><button onClick={() => setActiveTab("calendar")} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Open calendar</button></div><div className="mt-4"><MonthGrid anchor={calendarAnchor} events={calendarEvents} members={members} onOpenDay={(day) => { setCalendarAnchor(day); setView("Day"); setActiveTab("calendar"); }} /></div></section></>}
          {activeTab === "calendar" && <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{calendarAnchor.toLocaleDateString([], { month: "long", year: "numeric" })}</h2><div className="flex flex-wrap items-center gap-2"><button onClick={() => googleConnected || appleFeeds.some((feed) => feed.enabled) ? syncAllCalendars() : connectGoogleCalendar()} disabled={syncingGoogle} className="rounded-xl border border-violet-200 px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200">{syncingGoogle ? "Syncing…" : googleConnected || appleFeeds.some((feed) => feed.enabled) ? "Sync all" : "Connect Google"}</button><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div></div>
            {calendarMessage && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-100">{calendarMessage}</p>}
            <div className="mb-4 flex items-center justify-between"><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, -1))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10"><AppIcon name="chevronLeft" className="size-4"/>Previous</button><button onClick={() => setCalendarAnchor(new Date())} className="rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10">Today</button><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, 1))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10">Next<AppIcon name="chevronRight" className="size-4"/></button></div>
            <FamilyColorKey members={members} />
            {view === "Day" ? <DayCalendar date={calendarAnchor} events={calendarEvents} members={members} onEdit={setSelectedEvent} /> : view === "Week" ? <WeekCalendar anchor={calendarAnchor} events={calendarEvents} members={members} onEdit={setSelectedEvent} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} onCreate={openEventFormAt} /> : <MonthGrid anchor={calendarAnchor} events={calendarEvents} members={members} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} onAdd={openEventFormAt} />}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
              {showEventForm ? <form onSubmit={addEvent} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10"><div className="flex items-center justify-between"><p className="font-bold text-violet-800 dark:text-violet-100">Add a family event</p><button type="button" onClick={() => setShowEventForm(false)} className="text-lg font-bold text-violet-500">×</button></div><input required autoFocus value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="What&apos;s happening?" className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-violet-500"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Date<input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Starts<input disabled={eventAllDay} required type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Ends<input disabled={eventAllDay} required type="time" value={eventEndTime} onChange={(event) => setEventEndTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label></div><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Category<select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Location<input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="e.g. Backyard or 123 Main St" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label></div><fieldset className="mt-3"><legend className="text-xs font-bold text-violet-800 dark:text-violet-200">Who is this for?</legend><div className="mt-1 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = eventMemberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-200"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => setEventMemberIds((ids) => selected ? ids.filter((item) => item !== id) : [...ids, id])}/>{member.name}</label>; })}</div></fieldset><div className="mt-4 flex items-center justify-between"><label className="flex gap-2 text-sm font-bold text-violet-800 dark:text-violet-200"><input type="checkbox" checked={eventAllDay} onChange={(event) => setEventAllDay(event.target.checked)} className="size-4 accent-violet-600" />All day</label><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Save event</button></div></form> : <div className="flex justify-center"><button onClick={() => setShowEventForm(true)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">+ Add event</button></div>}
            </div>
          </section>}
        </div> : activeTab === "tasks" ? <TasksPage todos={todos} members={members} onAdd={addTodo} onToggle={toggleTodo} onEdit={editTodo} /> : activeTab === "chores" ? <ChoresPage members={members} chores={chores} celebratingChoreId={celebratingChoreId} onAddChild={addChild} onAddChore={addChore} onToggle={toggleChore} onDeleteChore={deleteChore} onReorder={reorderChores} /> : activeTab === "settings" ? <SettingsPage members={members} onMemberColorChange={updateMemberColor} onAddMember={addMember} themeMode={themeMode} onThemeModeChange={updateThemeMode} googleConnections={googleConnections} appleFeeds={appleFeeds} onConnect={connectGoogleCalendar} onToggleConnection={toggleGoogleCalendar} onAddApple={addAppleCalendar} onToggleApple={toggleAppleCalendar} onInviteAdult={inviteAdult} /> : <ListsPage lists={sharedLists} onAddList={addSharedList} onAddItem={addListItem} onToggleItem={toggleListItem} onDeleteItem={deleteListItem} onDeleteList={deleteSharedList} />}
      </div>
      {selectedEvent && <EventDetails event={selectedEvent} members={members} onClose={() => setSelectedEvent(null)} onEdit={() => { setEditingEvent(selectedEvent); setSelectedEvent(null); }} />}
      {editingEvent && <EventEditor key={editingEvent.id} event={editingEvent} members={members} onClose={() => setEditingEvent(null)} onSave={saveEvent} onApplySeries={applySeriesMembers} onDelete={deleteEvent} />}
      {showTodoForm && <TaskEditor title={todoTitle} dueDate={todoDueDate} assigneeMemberId={todoAssigneeMemberId} members={members} editing={Boolean(editingTodo)} onTitleChange={setTodoTitle} onDueDateChange={setTodoDueDate} onAssigneeChange={setTodoAssigneeMemberId} onClose={() => { setEditingTodo(null); setShowTodoForm(false); }} onSave={saveTodo} />}
      {celebratingTaskId !== null && <ChoreCelebration animationSrc="/animations/general/completions/Celebrations%20Begin.json" />}
      {celebratingBirthdayDate !== null && <ChoreCelebration animationSrc="/animations/holidays/birthday/birthday.json" />}
    </main>
  );
}

function MoodAnimation({ mood, className = "size-full" }: { mood: MoodKey; className?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const option = moodOption(mood);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduceMotion ? <span className="grid size-full place-items-center text-3xl" aria-label={option.label}>{option.emoji}</span> : <Lottie src={option.animation} autoplay loop className={className} aria-label={option.label} />;
}

function FamilyMoodCard({
  members,
  checkins,
  selectedMemberId,
  selectedMood,
  saving,
  message,
  onMemberChange,
  onMoodChange,
  onSave,
}: {
  members: Member[];
  checkins: MoodCheckin[];
  selectedMemberId: string;
  selectedMood: MoodKey;
  saving: boolean;
  message: string;
  onMemberChange: (memberId: string) => void;
  onMoodChange: (mood: MoodKey) => void;
  onSave: () => Promise<boolean>;
}) {
  const [showMoodModal, setShowMoodModal] = useState(false);
  const selectedMember = members.find((member) => String(member.id) === selectedMemberId);
  const selectedMoodOption = moodOption(selectedMood);

  async function handleSave() {
    if (await onSave()) setShowMoodModal(false);
  }

  return <article className="min-w-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100 p-4 text-slate-900 shadow-sm ring-1 ring-violet-100 dark:from-violet-500/20 dark:via-fuchsia-500/10 dark:to-sky-500/10 dark:text-slate-100 dark:ring-white/10">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-black tracking-wide text-violet-700 dark:text-violet-200">FAMILY CHECK-IN</p><h2 className="mt-1 text-lg font-black">How&apos;s everyone feeling?</h2><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">A little pulse for today.</p></div>
      <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700 dark:bg-white/10 dark:text-violet-100">Today</span>
    </div>
    {members.length === 0 ? <p className="mt-5 rounded-2xl bg-white/60 p-4 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Add family members to start checking in.</p> : <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {members.map((member) => {
          const checkin = checkins.find((item) => String(item.memberId) === String(member.id));
          const mood = checkin ? moodOption(checkin.mood) : null;
          const memberColor = memberCalendarColor(member, members.indexOf(member));
          return <div key={member.id} style={mood ? { backgroundColor: memberColor } : undefined} className={`flex min-w-0 items-center gap-2 rounded-2xl p-2 ${mood ? "shadow-sm" : "bg-white/65 dark:bg-white/10"}`}>
            <div className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl ${mood ? "" : "border border-dashed border-violet-300/80 text-xl text-violet-400 dark:border-violet-300/30"}`}>
              {mood ? <MoodAnimation mood={mood.key} /> : <span aria-hidden="true">?</span>}
            </div>
            <div className="min-w-0"><p className="truncate text-xs font-black">{member.name}</p><p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-300">{mood?.label ?? "Not checked in"}</p></div>
          </div>;
        })}
      </div>
      <button type="button" onClick={() => setShowMoodModal(true)} aria-haspopup="dialog" className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-white/75 px-4 py-3 text-left shadow-sm ring-1 ring-violet-200 transition hover:bg-white dark:bg-white/10 dark:ring-white/10">
        <span className="min-w-0"><span className="block text-sm font-black text-violet-900 dark:text-violet-100">How are you feeling?</span><span className="mt-0.5 block truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{selectedMember?.name ?? "Choose a person"} · {selectedMoodOption.emoji} {selectedMoodOption.label}</span></span>
        <span className="shrink-0 text-xs font-black text-violet-700 dark:text-violet-200">Check in →</span>
      </button>
      {showMoodModal && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="mood-dialog-title" className="w-full max-w-md rounded-[2rem] bg-white p-5 text-slate-900 shadow-2xl dark:bg-[#242435] dark:text-slate-100">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-wide text-violet-600 dark:text-violet-200">FAMILY CHECK-IN</p><h2 id="mood-dialog-title" className="mt-1 text-2xl font-black">How are you feeling?</h2><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">Choose who you are and check in for today.</p></div><button type="button" onClick={() => setShowMoodModal(false)} aria-label="Close mood check-in" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button></div>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">Who are you checking in for?
              <select value={selectedMemberId} onChange={(event) => onMemberChange(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-base font-bold text-slate-800 outline-violet-500 dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <div><p id="mood-options-label" className="text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">How are you feeling?</p><div role="group" aria-labelledby="mood-options-label" className="mt-2 grid grid-cols-5 gap-2">
              {moodOptions.map((mood) => <button key={mood.key} type="button" aria-pressed={selectedMood === mood.key} onClick={() => onMoodChange(mood.key)} className={`grid min-w-0 place-items-center gap-1 rounded-2xl px-1 py-3 text-center transition ${selectedMood === mood.key ? `${mood.color} ring-2` : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"}`}><span className="text-2xl leading-none">{mood.emoji}</span><span className="truncate text-[11px] font-black">{mood.label}</span></button>)}
            </div></div>
            {message && <p role="status" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">{message}</p>}
            <div className="flex items-center justify-end gap-2"><button type="button" onClick={() => setShowMoodModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button type="button" onClick={() => void handleSave()} disabled={!selectedMember || saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">{saving ? "Saving…" : "Save check-in"}</button></div>
          </div>
        </section>
      </div>}
    </>}
  </article>;
}

function Chore({ emoji, title, person, done = false }: { emoji: string; title: string; person: string; done?: boolean }) {
  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-lg dark:bg-amber-400/10">{emoji}</span><div className="flex-1"><p className={`text-sm font-bold ${done ? "line-through text-slate-400" : ""}`}>{title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{person}</p></div><span className={done ? "text-emerald-500" : "text-slate-300"}>{done ? "✓" : "○"}</span></div>;
}

function weatherLabel(code: number) {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Showers";
}

function weatherSummary(code: number) {
  if (code <= 1) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Showers";
}

function weatherOrbClass(weather: Weather | null) {
  if (!weather || weather.code <= 1) return weather?.isDay === false ? "bg-indigo-200/45" : "bg-yellow-200/70";
  if (weather.code <= 3) return "bg-slate-200/60";
  if (weather.code === 45 || weather.code === 48) return "bg-slate-300/60";
  if (weather.code >= 71 && weather.code <= 86) return "bg-white/75";
  if (weather.code >= 95) return "bg-violet-200/60";
  return "bg-sky-200/65";
}

function weatherAnimation(code: number, isDay: boolean) {
  if (code <= 1) return isDay ? sunnyAnimation : clearNightAnimation;
  if (code <= 2) return isDay ? partlyCloudyDayAnimation : partlyCloudyNightAnimation;
  if (code === 3) return cloudyAnimation;
  if (code === 45 || code === 48) return fogAnimation;
  if (code >= 71 && code <= 77 || code === 85 || code === 86) return snowAnimation;
  if (code >= 95) return thunderstormsAnimation;
  return rainAnimation;
}

function WeatherAnimation({ weather }: { weather: Weather }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const fallback = weather.code >= 95 ? "⛈️" : weather.code >= 71 && weather.code <= 77 ? "❄️" : weather.code >= 45 && weather.code <= 67 ? "🌧️" : weather.code === 3 ? "☁️" : weather.isDay ? "☀️" : "🌙";
  return reduceMotion ? <span className="block text-3xl leading-none drop-shadow-sm md:text-5xl" aria-label={weather.summary}>{fallback}</span> : <Lottie src={weatherAnimation(weather.code, weather.isDay)} autoplay loop className="size-full drop-shadow-sm" aria-label={weather.summary} />;
}

function sameDate(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

// Google represents all-day dates as midnight UTC. Compare those with the
// visible local calendar date using UTC fields so they never slide a day when
// the dashboard is used outside UTC.
function eventOccursOn(event: Event, day: Date) {
  const startsAt = new Date(event.startsAt);
  if (event.allDay) return startsAt.getUTCFullYear() === day.getFullYear() && startsAt.getUTCMonth() === day.getMonth() && startsAt.getUTCDate() === day.getDate();
  return sameDate(startsAt, day);
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(date.getDate() - date.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function shiftCalendar(date: Date, view: "Day" | "Week" | "Month", direction: number) {
  const result = new Date(date);
  if (view === "Month") result.setMonth(result.getMonth() + direction);
  else result.setDate(result.getDate() + direction * (view === "Week" ? 7 : 1));
  return result;
}

function memberCalendarColor(member: Member, index: number) {
  const name = member.name.toLowerCase();
  if (member.color && member.color !== defaultMemberColor) return member.color;
  if (name === "michael") return "#86efac";
  if (name === "lucas") return "#fb923c";
  return ["#a5b4fc", "#f9a8d4", "#fde68a", "#67e8f9", "#c4b5fd"][index % 5];
}

function eventBlockBackground(event: Event, members: Member[]) {
  if (event.generatedHoliday) return "linear-gradient(135deg,#fde68a,#fda4af,#c4b5fd)";
  const colors = eventMembers(event, members).map((member) => memberCalendarColor(member, members.indexOf(member)));
  if (!colors.length) return "#e2e8f0";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(", ")})`;
}

// Older imports may predate categories. Recognize common birthday wording in
// the UI too, so those cards stay festive immediately rather than waiting for
// a future sync to update their saved category.
function isBirthdayEvent(event: Event) {
  return event.category === "Birthday" || /\b(birthday|bday|birth day)\b/i.test(event.title);
}

function holidayEmoji(title: string) {
  if (/Halloween/.test(title)) return "🎃";
  if (/Christmas/.test(title)) return "🎄";
  if (/Thanksgiving/.test(title)) return "🦃";
  if (/Independence/.test(title)) return "🎆";
  if (/Easter/.test(title)) return "🐣";
  if (/Valentine/.test(title)) return "💗";
  if (/New Year/.test(title)) return "🎉";
  return "✨";
}

function eventCategoryIcon(event: Event) {
  if (event.generatedHoliday || event.category === "Holiday") return holidayEmoji(event.title);
  if (isBirthdayEvent(event)) return "🎂";
  if (event.category === "Sports") return "⚽";
  if (event.category === "School Test/Project Due") return "📝";
  if (event.category === "Vacation") return "✈️";
  return "";
}

function eventMembers(event: Event, members: Member[]) {
  return (event.memberIds ?? []).map((id) => members.find((member) => String(member.id) === id)).filter((member): member is Member => Boolean(member));
}

function FamilyColorKey({ members }: { members: Member[] }) {
  if (!members.length) return null;
  return <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span className="text-[10px] uppercase tracking-wide text-slate-400">Family colors</span>{members.map((member, index) => <span key={member.id} className="flex items-center gap-1.5"><i className="size-3 rounded-full" style={{ background: memberCalendarColor(member, index) }}/>{member.name}</span>)}<span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-slate-200"/>Family</span></div>;
}

function EventChip({ event, members, compact = false }: { event: Event; members: Member[]; compact?: boolean }) {
  const icon = eventCategoryIcon(event);
  return <div style={{ background: eventBlockBackground(event, members) }} className={`rounded-sm px-3 ${compact ? "py-1" : "py-1.5"} text-left text-xs font-semibold text-slate-900`}><span className="flex items-center gap-1 truncate">{icon && <NotoEmoji emoji={icon} className="size-3.5" />}{event.title}</span>{event.location && !compact && <span className="block truncate font-medium opacity-75">⌖ {event.location}</span>}</div>;
}

function EventDetails({ event, members, onClose, onEdit }: { event: Event; members: Member[]; onClose: () => void; onEdit: () => void }) {
  const assignedMembers = eventMembers(event, members);
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const date = event.allDay ? start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const time = event.allDay ? "All day" : `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${end ? ` – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`;
  return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"><section className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">{event.category ?? "General"}</span><h2 className="mt-3 text-2xl font-black leading-tight">{event.generatedHoliday ? `${holidayEmoji(event.title)} ` : ""}{event.title}</h2></div><button type="button" onClick={onClose} aria-label="Close event details" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"><AppIcon name="close" className="size-5"/></button></div><div className="mt-6 space-y-4 text-sm"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><p className="font-bold">{date}</p><p className="mt-1 text-slate-500 dark:text-slate-300">{time}</p></div>{event.location && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Location</p><p className="mt-1 font-semibold">{event.location}</p></div>}{event.notes && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Details</p><p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-200">{event.notes}</p></div>}{assignedMembers.length > 0 && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">For</p><div className="mt-2 flex flex-wrap gap-2">{assignedMembers.map((member) => <span key={member.id} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-800" style={{ backgroundColor: `${memberCalendarColor(member, members.indexOf(member))}55` }}>{member.name}</span>)}</div></div>}</div><div className="mt-7 flex justify-end gap-3">{!event.generatedHoliday && <button type="button" onClick={onEdit} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"><AppIcon name="edit" className="size-4"/>Edit event</button>}<button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Done</button></div></section></div>;
}

const timelineStartHour = 7;
const timelineEndHour = 22;
const timelineHourHeight = 64;
// Include the final hour's slot so its label and events are never clipped.
const timelineHeight = (timelineEndHour - timelineStartHour + 1) * timelineHourHeight;

function timedEventPosition(event: Event) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60_000);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = Math.max(startMinutes + 30, end.getHours() * 60 + end.getMinutes());
  return { top: Math.max(0, ((startMinutes - timelineStartHour * 60) / 60) * timelineHourHeight), height: Math.max(34, ((endMinutes - startMinutes) / 60) * timelineHourHeight) };
}

function TimelineEvent({ event, members, onClick, compact = false }: { event: Event; members: Member[]; onClick?: () => void; compact?: boolean }) {
  const position = timedEventPosition(event);
  const assignedMembers = eventMembers(event, members);
  const icon = eventCategoryIcon(event);
  return <button onClick={(clickEvent) => { clickEvent.stopPropagation(); onClick?.(); }} style={{ top: position.top, height: position.height, background: eventBlockBackground(event, members) }} className={`absolute inset-x-1 z-10 overflow-hidden rounded-md p-2 text-left text-slate-900 shadow-sm hover:brightness-95 ${compact ? "text-[10px]" : "pb-7 text-xs"}`}><span className="absolute bottom-1.5 right-1.5 flex -space-x-1.5">{assignedMembers.slice(0, 4).map((member, index) => <i key={member.id} style={{ background: memberCalendarColor(member, members.indexOf(member)), zIndex: assignedMembers.length - index }} className="grid size-4 place-items-center rounded-full border border-white/80 text-[8px] not-italic font-black text-slate-800 shadow-sm">{member.name.slice(0, 1).toUpperCase()}</i>)}</span><p className={`flex items-center gap-1 ${compact ? "truncate" : "truncate text-[17px] leading-tight"} font-black`}>{icon && <NotoEmoji emoji={icon} className={compact ? "size-3" : "size-4"} />}{event.title}</p>{!compact && event.notes && <p className="mt-0.5 truncate text-[14px] font-semibold leading-tight opacity-80">{event.notes}</p>}{!compact && event.location && <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-tight opacity-60">⌖ {event.location}</p>}</button>;
}

function TimelineColumn({ date, events, members, onEdit, onCreate, compact = false }: { date: Date; events: Event[]; members: Member[]; onEdit?: (event: Event) => void; onCreate?: (day: Date, time: string) => void; compact?: boolean }) {
  const dayEvents = events.filter((event) => eventOccursOn(event, date));
  const timedEvents = dayEvents.filter((event) => !event.allDay);
  function createAtClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!onCreate) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const minutes = timelineStartHour * 60 + ((event.clientY - bounds.top) / timelineHourHeight) * 60;
    const roundedMinutes = Math.max(timelineStartHour * 60, Math.min((timelineEndHour - 1) * 60 + 30, Math.round(minutes / 30) * 30));
    onCreate(date, `${String(Math.floor(roundedMinutes / 60)).padStart(2, "0")}:${String(roundedMinutes % 60).padStart(2, "0")}`);
  }
  return <div onClick={createAtClick} style={{ height: timelineHeight }} className={`relative border-l border-slate-100 dark:border-white/10 ${onCreate ? "cursor-copy" : ""}`}>{Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, index) => <div key={index} style={{ top: index * timelineHourHeight }} className="pointer-events-none absolute inset-x-0 border-t border-slate-100/80 dark:border-white/10"/>)}{timedEvents.map((event) => <TimelineEvent key={event.id} event={event} members={members} compact={compact} onClick={() => onEdit?.(event)} />)}</div>;
}

function DayCalendar({ date, events, members, onEdit }: { date: Date; events: Event[]; members: Member[]; onEdit: (event: Event) => void }) {
  const dayEvents = events.filter((event) => eventOccursOn(event, date)).sort((first, second) => {
    if (first.allDay !== second.allDay) return first.allDay ? -1 : 1;
    return new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
  });
  const dateLabel = date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const timeRange = (event: Event) => {
    if (event.allDay) return "All day";
    const start = new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const end = event.endsAt ? new Date(event.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
    return end ? `${start} – ${end}` : start;
  };
  return <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-white/10 dark:bg-[#151522]"><header className="flex items-baseline gap-3 border-b border-slate-100 px-5 py-4 dark:border-white/10"><p className="text-sm font-bold text-slate-400">{date.toLocaleDateString([], { weekday: "short" })}</p><p className="text-3xl font-black leading-none">{date.getDate()}</p><p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{dateLabel}</p></header><div className="space-y-3 p-4 sm:p-5">{dayEvents.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center dark:border-white/15"><p className="text-lg font-bold">Nothing planned</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Enjoy the open space in your day.</p></div> : dayEvents.map((event) => { const assignedMembers = eventMembers(event, members); const icon = eventCategoryIcon(event); return <button key={event.id} type="button" onClick={() => onEdit(event)} style={{ background: eventBlockBackground(event, members) }} className="group flex w-full overflow-hidden rounded-2xl border border-white/60 text-left shadow-sm transition hover:-translate-y-0.5 hover:brightness-95 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"> <span className="min-w-0 flex-1 p-4 sm:p-5"><span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-base font-black text-slate-900">{icon && <span className="mr-1.5">{icon}</span>}{event.title}</span><span className="text-sm font-bold text-slate-700">{timeRange(event)}</span></span>{event.notes && <span className="mt-2 block whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">{event.notes}</span>}{event.location && <span className="mt-2 block text-sm font-semibold text-slate-600">⌖ {event.location}</span>}{assignedMembers.length > 0 && <span className="mt-3 flex flex-wrap gap-2">{assignedMembers.map((member) => <span key={member.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/45 px-2.5 py-1 text-xs font-black text-slate-800"><i className="grid size-4 place-items-center rounded-full text-[9px] not-italic text-white" style={{ backgroundColor: memberCalendarColor(member, members.indexOf(member)) }}>{member.name.slice(0, 1).toUpperCase()}</i>{member.name}</span>)}</span>}</span><span className="grid w-12 shrink-0 place-items-center text-slate-600 transition group-hover:text-slate-900">›</span></button>; })}</div></section>;
}

function EventEditor({ event, members, onClose, onSave, onApplySeries, onDelete }: { event: Event; members: Member[]; onClose: () => void; onSave: (event: Event) => void; onApplySeries: (event: Event, memberIds: string[]) => void; onDelete: (event: Event) => void }) {
  const source = new Date(event.startsAt);
  const endSource = event.endsAt ? new Date(event.endsAt) : new Date(source.getTime() + 60 * 60_000);
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.allDay ? `${source.getUTCFullYear()}-${String(source.getUTCMonth() + 1).padStart(2, "0")}-${String(source.getUTCDate()).padStart(2, "0")}` : localDateInputValue(source));
  const [time, setTime] = useState(source.toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState(endSource.toTimeString().slice(0, 5));
  const [location, setLocation] = useState(event.location ?? "");
  const [category, setCategory] = useState(event.category ?? "General");
  const [allDay, setAllDay] = useState(event.allDay ?? event.time === "All day");
  const [memberIds, setMemberIds] = useState(event.memberIds ?? []);
  function submit(formEvent: FormEvent) { formEvent.preventDefault(); const startsAt = allDay ? new Date(`${date}T00:00:00.000Z`) : new Date(`${date}T${time}:00`); const selectedEnd = new Date(`${date}T${endTime}:00`); const endsAt = allDay ? null : (selectedEnd > startsAt ? selectedEnd : new Date(startsAt.getTime() + 60 * 60_000)); onSave({ ...event, title: title.trim(), startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, time: allDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), location: location.trim() || null, category, allDay, memberIds }); }
  const canApplyToSeries = Boolean(event.seriesExternalId && (event.source === "google" || event.source === "apple"));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5"><form onSubmit={submit} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">EDIT EVENT</p><h2 className="text-2xl font-bold">Make a change</h2></div><button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button></div><label className="mt-5 block text-sm font-bold">Event title<input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><label className="col-span-2 text-sm font-bold sm:col-span-1">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="text-sm font-bold">Starts<input disabled={allDay} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label><label className="text-sm font-bold">Ends<input disabled={allDay} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label></div><label className="mt-4 block text-sm font-bold">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="mt-4 block text-sm font-bold">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><fieldset className="mt-4"><legend className="text-sm font-bold">Who is this for?</legend><div className="mt-2 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = memberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => setMemberIds((ids) => selected ? ids.filter((item) => item !== id) : [...ids, id])}/>{member.name}</label>; })}</div></fieldset>{canApplyToSeries && <div className="mt-4 rounded-xl bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-800">Apply the selected people to every occurrence of this recurring event, including future syncs.</p><button type="button" onClick={() => onApplySeries(event, memberIds)} className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">Apply people to entire series</button></div>}<label className="mt-4 flex gap-2 text-sm font-bold"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label><div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => onDelete(event)} className="rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50">Delete event</button><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-500">Cancel</button><button className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white">Save event</button></div></div></form></div>;
}

function WeekCalendar({ anchor, events, members, onEdit, onOpenDay, onCreate }: { anchor: Date; events: Event[]; members: Member[]; onEdit: (event: Event) => void; onOpenDay: (date: Date) => void; onCreate?: (day: Date, time: string) => void }) {
  const first = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div className="overflow-x-auto"><div className="min-w-[920px] overflow-hidden rounded-2xl border border-slate-100 dark:border-white/10"><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-white/10"><div/>{days.map((day) => { const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`flex items-baseline justify-center gap-1 border-l border-slate-100 px-2 py-3 dark:border-white/10 ${isToday ? "bg-violet-600 text-white" : "hover:bg-violet-50 dark:hover:bg-white/5"}`}><span className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-white/75" : "text-slate-400"}`}>{day.toLocaleDateString([], { weekday: "short" })}</span><span className="text-xl font-black leading-none">{day.getDate()}</span></button>; })}</div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-white/10"><span className="px-2 py-2 text-[10px] font-bold uppercase text-slate-400">All day</span>{days.map((day) => <div key={day.toISOString()} className="min-h-10 space-y-1 border-l border-slate-100 p-1 dark:border-white/10">{events.filter((event) => event.allDay && eventOccursOn(event, day)).slice(0, 2).map((event) => <button key={event.id} onClick={() => onEdit(event)} className="w-full"><EventChip event={event} members={members} compact /></button>)}</div>)}</div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"><div style={{ height: timelineHeight }} className="relative bg-slate-50/60 dark:bg-white/[.02]">{Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, index) => <span key={index} style={{ top: index * timelineHourHeight - 7 }} className="absolute right-2 text-xs font-bold text-slate-400">{new Date(2000, 0, 1, timelineStartHour + index).toLocaleTimeString([], { hour: "numeric" })}</span>)}</div>{days.map((day) => <TimelineColumn key={day.toISOString()} date={day} events={events} members={members} onEdit={onEdit} onCreate={onCreate} />)}</div></div></div>;
}

function MonthGrid({ anchor, events, members, onOpenDay, onAdd }: { anchor: Date; events: Event[]; members: Member[]; onOpenDay: (date: Date) => void; onAdd?: (date: Date) => void }) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const first = startOfWeek(firstOfMonth);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div><div className="mb-1 grid grid-cols-7 gap-1">{weekdays.map((day) => <p key={day} className="p-1 text-center text-xs font-bold text-slate-400">{day}</p>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => eventOccursOn(event, day)); const currentMonth = day.getMonth() === anchor.getMonth(); const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onAdd ? onAdd(day) : onOpenDay(day)} aria-label={isToday ? `Today, ${day.toLocaleDateString()}` : day.toLocaleDateString()} className={`relative flex aspect-square min-h-0 flex-col items-stretch overflow-hidden rounded-xl p-2 text-left ${currentMonth ? "bg-slate-50 dark:bg-white/5" : "bg-slate-50/40 text-slate-300 dark:bg-white/[.02]"} ${isToday ? "ring-2 ring-violet-500 ring-offset-1 dark:ring-violet-400 dark:ring-offset-[#151522]" : ""}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-black leading-none ${isToday ? "bg-violet-600 text-white shadow-sm" : "items-start justify-start text-left font-bold"}`}>{day.getDate()}</span><span className="block min-h-0 space-y-1 overflow-hidden text-left">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} members={members} compact />)}{dayEvents.length > 2 && <span className="block px-1 text-xs font-bold text-violet-600">+{dayEvents.length - 2} more</span>}</span></button>; })}</div></div>;
}

function PhoneHomeCalendar({ events, members, onOpenDay, onOpenEvent }: { events: Event[]; members: Member[]; onOpenDay: (date: Date) => void; onOpenEvent: (event: Event) => void }) {
  const [mode, setMode] = useState<"Day" | "Week">("Day");
  const today = useMemo(() => new Date(), []);
  const days = mode === "Day" ? [today] : Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(today); day.setDate(day.getDate() + index); return day; });
  const timeLabel = (event: Event) => event.allDay ? "All day" : new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <section className="min-w-0 max-w-full overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:hidden">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">CALENDAR</p><h2 className="text-xl font-bold">{mode === "Day" ? "Today" : "This week"}</h2></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week"] as const).map((option) => <button key={option} onClick={() => setMode(option)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${mode === option ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{option}</button>)}</div></div>
    <div className="mt-4 min-w-0 space-y-3">{days.map((day) => { const dayEvents = events.filter((event) => eventOccursOn(event, day)).sort((first, second) => Number(Boolean(second.allDay)) - Number(Boolean(first.allDay)) || new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()); return <article key={day.toDateString()} className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-white/10 dark:bg-white/[.03]"><button onClick={() => onOpenDay(day)} className="flex w-full min-w-0 items-center justify-between px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-white/5"><span><span className="block text-sm font-black">{day.toLocaleDateString([], { weekday: "long" })}</span><span className="text-xs font-semibold text-slate-500 dark:text-slate-300">{day.toLocaleDateString([], { month: "short", day: "numeric" })}</span></span><span className="text-sm font-black text-violet-600 dark:text-violet-300">Open ›</span></button><div className="min-w-0 space-y-2 border-t border-slate-100 p-3 dark:border-white/10">{dayEvents.length ? dayEvents.slice(0, mode === "Day" ? 4 : 2).map((event) => { const icon = eventCategoryIcon(event); const detail = event.location ?? event.notes; return <button key={event.id} onClick={() => onOpenEvent(event)} style={{ background: eventBlockBackground(event, members) }} className="min-w-0 max-w-full overflow-hidden rounded-xl px-3 py-3 text-left text-slate-900 shadow-sm"><span className="block break-words line-clamp-2 text-sm font-black leading-tight"><span className="mr-2 text-xs font-black text-slate-700 dark:text-slate-700">{timeLabel(event)}</span>{icon && <span className="mr-1.5">{icon}</span>}{event.title}</span>{detail && <span className="mt-1 block truncate text-xs font-semibold leading-tight opacity-70">{event.location && <span className="mr-1">⌖</span>}{detail}</span>}</button>; }) : <p className="px-1 py-1 text-sm font-medium text-slate-500 dark:text-slate-300">Nothing planned.</p>}{dayEvents.length > (mode === "Day" ? 4 : 2) && <button onClick={() => onOpenDay(day)} className="px-1 text-xs font-black text-violet-600 dark:text-violet-300">+{dayEvents.length - (mode === "Day" ? 4 : 2)} more events</button>}</div></article>; })}</div>
  </section>;
}

function AuthScreen({ onAuthenticated, invitePending = false }: { onAuthenticated: (user: User | null) => void; invitePending?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const result = isNew
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setMessage(result.error.message); return; }
    if (result.data.session?.user) {
      onAuthenticated(result.data.session.user);
      setMessage("Welcome home!");
      return;
    }
    setMessage("Check your email to confirm your account, then come back here and sign in.");
  }

  async function resendConfirmation() {
    if (!supabase || !email) { setMessage("Enter your email address first."); return; }
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}` } });
    setMessage(error ? error.message : "A new confirmation email is on its way.");
  }

  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#ddd6fe,transparent_35%),#f8f7ff] p-5 text-slate-900"><form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-violet-200/50"><div className="grid size-12 place-items-center rounded-2xl bg-violet-600 text-xl text-white">✦</div><h1 className="mt-6 text-3xl font-bold">{invitePending ? "You’re invited home" : "Welcome home"}</h1><p className="mt-2 text-slate-500">{invitePending ? "Create your own account with the invited email to join the shared family calendar." : "Sign in to your private family command center."}</p><label className="mt-6 block text-sm font-bold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-violet-500" placeholder="you@example.com" /></label><label className="mt-4 block text-sm font-bold">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-violet-500" placeholder="At least 6 characters" /></label>{message && <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-700">{message}</p>}<button className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700">{isNew ? "Create account" : "Sign in"}</button><button type="button" onClick={resendConfirmation} className="mt-3 w-full text-sm font-semibold text-slate-500 hover:text-violet-600">Resend confirmation email</button><button type="button" onClick={() => { setIsNew((value) => !value); setMessage(""); }} className="mt-4 w-full text-sm font-bold text-violet-600">{isNew ? "Already have an account? Sign in" : "New here? Create an account"}</button></form></main>;
}

function Screensaver({ onExit }: { onExit: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return <main className="min-h-screen cursor-pointer bg-[radial-gradient(circle_at_30%_20%,#fbcfe8,transparent_24%),radial-gradient(circle_at_70%_70%,#bfdbfe,transparent_28%),linear-gradient(120deg,#312e81,#0f766e)] p-5 text-white md:p-8" onPointerDown={onExit}><div className="flex h-[calc(100vh-2.5rem)] flex-col justify-between rounded-[2rem] border border-white/25 bg-black/10 p-7 backdrop-blur-sm md:h-[calc(100vh-4rem)] md:p-8"><div className="flex items-center justify-between text-sm font-medium text-white/80 md:text-lg"><span>{timeGreeting().replace("GOOD ", "Good ")}, family</span><span>Tap anywhere to return</span></div><div><p className="text-7xl font-semibold tracking-tight sm:text-8xl md:text-9xl">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><p className="mt-3 text-xl text-white/80 md:text-2xl">{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p></div><div className="flex flex-wrap items-center gap-3 text-sm md:text-lg"><span className="rounded-full bg-white/20 px-4 py-2">✦ Family time</span><span className="rounded-full bg-white/20 px-4 py-2">Photo memories coming soon</span></div></div></main>;
}

function SeasonalScreensaver({ onExit }: { onExit: () => void }) {
  const [video] = useState(() => halloweenScreensaverVideos[Math.floor(Math.random() * halloweenScreensaverVideos.length)] ?? halloweenScreensaverVideos[0]);
  return <main className="relative min-h-screen cursor-pointer overflow-hidden bg-[#120617] text-white" onPointerDown={onExit} aria-label="Halloween screensaver. Tap anywhere to return.">
    <video autoPlay loop muted playsInline className="absolute inset-0 size-full object-cover" src={video} />
    <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-6 py-6 text-center text-sm font-semibold tracking-wide text-white/90 md:px-10 md:py-8 md:text-base">Halloween mode · Tap anywhere to return</div>
  </main>;
}

function TasksPage({ todos, members, onAdd, onToggle, onEdit }: { todos: Todo[]; members: Member[]; onAdd: () => void; onToggle: (id: string | number) => void; onEdit: (todo: Todo) => void }) {
  const urgency = (todo: Todo) => {
    if (!todo.dueAt) return 4;
    const due = new Date(todo.dueAt);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAway = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    return daysAway < 0 ? 0 : daysAway === 0 ? 1 : daysAway === 1 ? 2 : 3;
  };
  const dueCopy = (todo: Todo) => {
    const level = urgency(todo);
    if (level === 0) return "Overdue";
    if (level === 1) return "Due today";
    if (level === 2) return "Due tomorrow";
    return todo.dueAt ? `Due ${new Date(todo.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : "No deadline";
  };
  const open = todos.filter((todo) => !todo.done).sort((first, second) => urgency(first) - urgency(second) || (first.dueAt ? new Date(first.dueAt).getTime() : Number.MAX_SAFE_INTEGER) - (second.dueAt ? new Date(second.dueAt).getTime() : Number.MAX_SAFE_INTEGER) || first.title.localeCompare(second.title));
  const completed = todos.filter((todo) => todo.done);
  const assignee = (todo: Todo) => members.find((member) => member.id === todo.assigneeMemberId);
  const deleteTodo = (id: string | number) => window.dispatchEvent(new CustomEvent("family-delete-todo", { detail: id }));

  return (
    <section className="mx-auto max-w-[1600px] px-5 pb-8 md:px-9">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-rose-500">FAMILY TASKS</p>
            <h2 className="text-3xl font-bold">Today&apos;s to-dos</h2>
          </div>
          <button onClick={onAdd} className="rounded-xl bg-rose-500 px-4 py-3 font-bold text-white">+ Add task</button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {open.map((todo) => {
            const person = assignee(todo);
            const level = urgency(todo);
            const cardColor = level === 0 ? "border-rose-400 bg-rose-100 shadow-rose-200/60 dark:bg-rose-500/20" : level === 1 ? "border-orange-400 bg-orange-50 shadow-orange-200/60 dark:bg-orange-500/20" : level === 2 ? "border-amber-300 bg-amber-50 dark:bg-amber-400/15" : "border-transparent bg-rose-50 dark:bg-rose-400/10";
            const dueColor = level === 0 ? "bg-rose-600 text-white" : level === 1 ? "bg-orange-500 text-white" : level === 2 ? "bg-amber-300 text-amber-950" : "bg-white/80 text-slate-500 dark:bg-white/10 dark:text-slate-300";
            return (
              <article key={todo.id} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${cardColor}`}>
                <button onClick={() => onEdit(todo)} className="min-w-0 flex-1 text-left">
                  <b className="block text-base">{todo.title}</b>
                  <small className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${dueColor}`}>{dueCopy(todo)}</small>
                  {person && <span className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${person.color ?? "#fda4af"}33`, color: person.color ?? "#be123c" }}>For {person.name}</span>}
                </button>
                <button onClick={() => onToggle(todo.id)} aria-label={`Complete ${todo.title}`} className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-rose-400 bg-white text-xl font-black text-transparent transition hover:bg-rose-100">✓</button>
                <button onClick={() => onEdit(todo)} aria-label={`Edit ${todo.title}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-rose-500 hover:bg-rose-100"><AppIcon name="edit" className="size-5"/></button>
              </article>
            );
          })}
          {open.length === 0 && <p className="text-slate-400">You&apos;re all caught up.</p>}
        </div>

        {completed.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-5 dark:border-white/10">
            <h3 className="font-bold text-emerald-600">Completed recently</h3>
            <p className="mt-1 text-sm text-slate-500">Completed tasks stay here for 7 days, then move out of sight.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {completed.map((todo) => (
                <article key={todo.id} className="flex min-h-16 items-center gap-3 rounded-2xl bg-emerald-50 p-3 text-emerald-800 shadow-sm dark:bg-emerald-400/10 dark:text-emerald-200">
                  <button onClick={() => onToggle(todo.id)} aria-label={`Restore ${todo.title}`} className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-emerald-500 bg-emerald-500 text-xl font-black text-white">✓</button>
                  <button onClick={() => onEdit(todo)} className="min-w-0 flex-1 text-left text-sm font-bold line-through">{todo.title}</button>
                  <button onClick={() => onToggle(todo.id)} className="shrink-0 rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200 hover:bg-white dark:bg-white/10 dark:text-emerald-100 dark:ring-white/15">Restore</button>
                  <button onClick={() => deleteTodo(todo.id)} title={`Delete ${todo.title}`} aria-label={`Permanently delete ${todo.title}`} className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"><AppIcon name="trash" className="size-4"/></button>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TaskEditor({ title, dueDate, assigneeMemberId, members, editing, onTitleChange, onDueDateChange, onAssigneeChange, onClose, onSave }: { title: string; dueDate: string; assigneeMemberId: string; members: Member[]; editing: boolean; onTitleChange: (value: string) => void; onDueDateChange: (value: string) => void; onAssigneeChange: (value: string) => void; onClose: () => void; onSave: (event: FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><form onSubmit={onSave} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-rose-500">FAMILY TASK</p><h2 className="text-2xl font-bold">{editing ? "Edit task" : "Add a to-do"}</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button></div><label className="mt-5 block text-sm font-bold">What needs to get done?<input required autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="e.g. Pick up groceries" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-rose-500" /></label><label className="mt-5 block text-sm font-bold">Deadline <span className="font-normal text-slate-400">(optional)</span><input type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-rose-500" /></label><fieldset className="mt-5"><legend className="text-sm font-bold">Assign to <span className="font-normal text-slate-400">(optional)</span></legend><div className="mt-2 flex flex-wrap gap-2"><label className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${!assigneeMemberId ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200"}`}><input className="sr-only" type="radio" name="task-assignee" checked={!assigneeMemberId} onChange={() => onAssigneeChange("")} />Anyone</label>{members.map((member) => <label key={member.id} className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${assigneeMemberId === String(member.id) ? "text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"}`} style={assigneeMemberId === String(member.id) ? { backgroundColor: member.color ?? "#f43f5e" } : undefined}><input className="sr-only" type="radio" name="task-assignee" checked={assigneeMemberId === String(member.id)} onChange={() => onAssigneeChange(String(member.id))} />{member.name}</label>)}</div></fieldset><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600">{editing ? "Save task" : "Add task"}</button></div></form></div>;
}

function ChoreCelebration({ animationSrc }: { animationSrc?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animation] = useState(() => animationSrc ?? pickCelebrationAnimation());
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-hidden bg-violet-950/35 p-6 backdrop-blur-sm" role="status" aria-label="Routine complete"><div className="w-full max-w-xl">{reduceMotion ? <div className="grid aspect-square place-items-center text-8xl">✨</div> : <Lottie src={animation} autoplay loop={false} className="h-[min(70vh,38rem)] w-full drop-shadow-2xl" />}</div></div>;
}

function ChoresPage({ members, chores, celebratingChoreId, onAddChild, onAddChore, onToggle, onDeleteChore, onReorder }: { members: Member[]; chores: ChoreEntry[]; celebratingChoreId: string | number | null; onAddChild: () => void; onAddChore: (memberId: string | number, routine: string) => void; onToggle: (chore: ChoreEntry) => void; onDeleteChore: (chore: ChoreEntry) => void; onReorder: (memberId: string | number, routine: string, movedId: string | number, targetId: string | number) => void }) {
  const [draggedChoreId, setDraggedChoreId] = useState<string | number | null>(null);
  const children = members.filter((member) => member.role === "child");
  chores = [...chores].sort((first, second) => Number(Boolean(first.completionId)) - Number(Boolean(second.completionId)) || first.sortOrder - second.sortOrder);
  function startTouchDrag(event: PointerEvent<HTMLSpanElement>, chore: ChoreEntry) {
    if (event.pointerType === "mouse" || chore.completionId) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggedChoreId(chore.id);
  }
  function finishTouchDrag(event: PointerEvent<HTMLSpanElement>, childId: string | number, routine: string) {
    if (event.pointerType === "mouse" || draggedChoreId === null) return;
    event.preventDefault();
    event.stopPropagation();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-chore-id]");
    if (target?.dataset.childId === String(childId) && target.dataset.routine === routine && target.dataset.choreId) onReorder(childId, routine, draggedChoreId, target.dataset.choreId);
    setDraggedChoreId(null);
  }
  return <><WeekdayChoresBoard members={members} chores={chores} celebratingChoreId={celebratingChoreId} onAddChild={onAddChild} onAddChore={onAddChore} onToggle={onToggle} onDeleteChore={onDeleteChore} onReorder={onReorder} /><TemporaryRoutineChores members={members} chores={chores} onAddChore={onAddChore} onDeleteChore={onDeleteChore} /></>;
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-sky-600">KIDS&apos; CHORES</p><h2 className="text-2xl font-bold">Daily routines</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Drag an unfinished chore by its grip to rearrange it inside a routine.</p></div><button onClick={onAddChild} className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">+ Add child</button></div>{children.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{children.map((child) => { const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <div key={child.id} className={`rounded-3xl p-5 ${theme}`}><h3 className="text-2xl font-black">{child.name}</h3><div className="mt-5 space-y-5">{choreRoutines.map((routine) => { const routineChores = chores.filter((chore) => chore.assigneeMemberId === child.id && chore.routine === routine.id); return <section key={routine.id} className="rounded-2xl bg-white/45 p-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black text-slate-700"><span className="mr-1.5">{routine.icon}</span>{routine.label}</h4><button onClick={() => onAddChore(child.id, routine.id)} aria-label={`Add ${routine.label} chore for ${child.name}`} className="grid size-8 place-items-center rounded-xl bg-white text-lg font-bold text-slate-600 shadow-sm">+</button></div><div className="mt-3 grid gap-3">{routineChores.map((chore) => <div key={chore.id} data-chore-id={String(chore.id)} data-child-id={String(child.id)} data-routine={routine.id} draggable={!chore.completionId} onDragStart={() => setDraggedChoreId(chore.id)} onDragEnd={() => setDraggedChoreId(null)} onDragOver={(event) => { if (!chore.completionId) event.preventDefault(); }} onDrop={() => { if (draggedChoreId !== null && !chore.completionId) onReorder(child.id, routine.id, draggedChoreId, chore.id); setDraggedChoreId(null); }} className={`relative min-w-0 transition ${draggedChoreId === chore.id ? "opacity-45" : ""}`}><button onClick={() => onToggle(chore)} className={`flex min-h-20 w-full items-center gap-2 rounded-2xl bg-white/90 p-3 text-left shadow-sm transition-transform active:scale-[.98] ${chore.completionId ? "opacity-65" : "hover:-translate-y-0.5"}`}><span title={chore.completionId ? undefined : "Drag to reorder"} onPointerDown={(event) => startTouchDrag(event, chore)} onPointerUp={(event) => finishTouchDrag(event, child.id, routine.id)} onPointerCancel={() => setDraggedChoreId(null)} onClick={(event) => event.stopPropagation()} className={`shrink-0 select-none touch-none text-base leading-none text-slate-400 ${chore.completionId ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}>⠿</span><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-3xl shadow-sm">{!chore.emoji || chore.emoji === "✨" ? choreIcon(chore.title) : chore.emoji}</span><span className={`min-w-0 flex-1 text-base font-black leading-tight ${chore.completionId ? "text-slate-400 line-through" : "text-slate-800"}`}>{chore.title}</span><span className={`grid size-9 shrink-0 place-items-center rounded-lg border-2 text-xl font-black ${chore.completionId ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span></button>{celebratingChoreId === chore.id && <ChoreCelebration/>}<button onClick={() => onDeleteChore(chore)} title={`Delete ${chore.title}`} className="absolute right-1 top-1 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-rose-600"><AppIcon name="trash" className="size-3.5"/></button></div>)}{routineChores.length === 0 && <p className="rounded-xl bg-white/50 px-3 py-4 text-center text-xs font-semibold text-slate-600">Add a chore for this routine.</p>}</div></section>; })}</div></div>; })}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Add Michael and Lucas (or anyone else) to create their chore boards.</div>}</div></section>;
}

function TemporaryRoutineChores({ members, chores, onAddChore, onDeleteChore }: { members: Member[]; chores: ChoreEntry[]; onAddChore: (memberId: string | number, routine: string) => void; onDeleteChore: (chore: ChoreEntry) => void }) {
  const isWeekday = new Date().getDay() > 0 && new Date().getDay() < 6;
  const today = new Date().toLocaleDateString("en-CA");
  const children = members.filter((member) => member.role === "child");
  const temporary = chores.filter((chore) => !chore.isFixed && chore.scheduledFor === today && (chore.routine === "Before school" || chore.routine === "After school"));
  if (!isWeekday || !children.length) return null;
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-violet-50 p-5 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:ring-violet-400/20"><div><p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">For today only</p><h2 className="mt-1 text-xl font-black">One-time routine chores</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Add a different task for this morning or afternoon. It will disappear from the routine tomorrow.</p></div><div className="mt-4 grid gap-3 md:grid-cols-2">{children.map((child) => { const childChores = temporary.filter((chore) => chore.assigneeMemberId === child.id); return <article key={child.id} className="rounded-2xl bg-white/80 p-4 dark:bg-[#242435]/80"><div className="flex items-center justify-between gap-3"><h3 className="font-black">{child.name}</h3><div className="flex gap-2"><button onClick={() => onAddChore(child.id, "Before school")} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm ring-1 ring-violet-100 hover:bg-violet-50 dark:bg-white/10 dark:text-violet-200 dark:ring-white/10">+ Morning</button><button onClick={() => onAddChore(child.id, "After school")} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-violet-700 shadow-sm ring-1 ring-violet-100 hover:bg-violet-50 dark:bg-white/10 dark:text-violet-200 dark:ring-white/10">+ After school</button></div></div><div className="mt-3 space-y-2">{childChores.length ? childChores.map((chore) => <div key={chore.id} className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 dark:bg-white/5"><span className="text-lg">{chore.emoji}</span><span className="min-w-0 flex-1 text-sm font-bold">{chore.title}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-600 dark:bg-white/10 dark:text-violet-200">{chore.routine === "Before school" ? "Morning" : "After school"}</span><button onClick={() => window.dispatchEvent(new CustomEvent("family-edit-chore", { detail: chore.id }))} title={`Edit ${chore.title}`} aria-label={`Edit ${chore.title}`} className="grid size-8 place-items-center rounded-lg text-violet-600 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-white/10"><AppIcon name="edit" className="size-4"/></button><button onClick={() => onDeleteChore(chore)} title={`Delete ${chore.title}`} aria-label={`Delete ${chore.title}`} className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-white/10"><AppIcon name="trash" className="size-4"/></button></div>) : <p className="rounded-xl border border-dashed border-violet-200 px-3 py-3 text-center text-xs font-semibold text-slate-500 dark:border-violet-300/25 dark:text-slate-300">Nothing extra today.</p>}</div></article>; })}</div></div></section>;
}

function WeekdayChoresBoard({ members, chores, celebratingChoreId, onAddChild, onAddChore, onToggle, onDeleteChore, onReorder }: { members: Member[]; chores: ChoreEntry[]; celebratingChoreId: string | number | null; onAddChild: () => void; onAddChore: (memberId: string | number, routine: string) => void; onToggle: (chore: ChoreEntry) => void; onDeleteChore: (chore: ChoreEntry) => void; onReorder: (memberId: string | number, routine: string, movedId: string | number, targetId: string | number) => void }) {
  const [draggedChoreId, setDraggedChoreId] = useState<string | number | null>(null);
  const isWeekday = new Date().getDay() > 0 && new Date().getDay() < 6;
  const children = members.filter((member) => member.role === "child");
  const routines = choreRoutines.filter((routine) => isWeekday || routine.id === "To-do");
  const today = new Date().toLocaleDateString("en-CA");
  const sortedChores = chores.filter((chore) => isVisibleRoutineChore(chore, today)).sort((first, second) => Number(Boolean(first.completionId)) - Number(Boolean(second.completionId)) || first.sortOrder - second.sortOrder);

  useEffect(() => {
    const choreById = new Map(chores.map((chore) => [String(chore.id), chore]));
    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLElement>("[data-chore-id]").forEach((card) => {
        const chore = choreById.get(card.dataset.choreId ?? "");
        if (!chore) return;
        const emoji = !chore.emoji || chore.emoji === "✨" ? choreIcon(chore.title) : chore.emoji;
        const source = notoIconPath(emoji);
        const pictureSlot = card.querySelector<HTMLElement>("button > span:nth-of-type(2)");
        if (!source || !pictureSlot) return;
        const image = document.createElement("img");
        image.src = source;
        image.alt = "";
        image.className = "size-9 object-contain";
        image.dataset.notoChorePicture = "true";
        image.onerror = () => { pictureSlot.textContent = emoji; };
        pictureSlot.replaceChildren(image);
        pictureSlot.setAttribute("aria-hidden", "true");
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chores, isWeekday]);

  function finishTouchDrag(event: PointerEvent<HTMLSpanElement>, childId: string | number, routine: string) {
    if (event.pointerType === "mouse" || draggedChoreId === null) return;
    event.preventDefault();
    event.stopPropagation();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-chore-id]");
    if (target?.dataset.childId === String(childId) && target.dataset.routine === routine && target.dataset.choreId) onReorder(childId, routine, draggedChoreId, target.dataset.choreId);
    setDraggedChoreId(null);
  }
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-sky-600">KIDS&apos; CHORES</p><h2 className="text-2xl font-bold">Weekday routines</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Fixed routines reset Monday through Friday. Anytime to-dos are flexible.</p></div><button onClick={onAddChild} className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">+ Add child</button></div>{children.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{children.map((child) => { const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <div key={child.id} className={`rounded-3xl p-5 ${theme}`}><h3 className="text-2xl font-black">{child.name}</h3><div className="mt-5 space-y-5">{routines.map((routine) => { const routineChores = sortedChores.filter((chore) => chore.assigneeMemberId === child.id && chore.routine === routine.id); return <section key={routine.id} className="rounded-2xl bg-white/45 p-3"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-black text-slate-700"><span className="mr-1.5">{routine.icon}</span>{routine.label}</h4>{routine.id === "To-do" && <button onClick={() => onAddChore(child.id, routine.id)} aria-label={`Add ${routine.label} chore for ${child.name}`} className="grid size-8 place-items-center rounded-xl bg-white text-lg font-bold text-slate-600 shadow-sm">+</button>}</div><div className="mt-3 grid gap-3">{routineChores.map((chore) => <div key={chore.id} data-chore-id={String(chore.id)} data-child-id={String(child.id)} data-routine={routine.id} draggable={!chore.completionId && !chore.isFixed} onDragStart={() => !chore.isFixed && setDraggedChoreId(chore.id)} onDragEnd={() => setDraggedChoreId(null)} onDragOver={(event) => { if (!chore.completionId && !chore.isFixed) event.preventDefault(); }} onDrop={() => { if (draggedChoreId !== null && !chore.completionId && !chore.isFixed) onReorder(child.id, routine.id, draggedChoreId, chore.id); setDraggedChoreId(null); }} className={`relative min-w-0 transition ${draggedChoreId === chore.id ? "opacity-45" : ""}`}><button onClick={() => onToggle(chore)} className={`flex min-h-20 w-full items-center gap-2 rounded-2xl bg-white/90 p-3 text-left shadow-sm transition-transform active:scale-[.98] ${chore.completionId ? "opacity-65" : "hover:-translate-y-0.5"}`}><span onPointerDown={(event) => { if (event.pointerType !== "mouse" && !chore.isFixed) { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedChoreId(chore.id); } }} onPointerUp={(event) => finishTouchDrag(event, child.id, routine.id)} onPointerCancel={() => setDraggedChoreId(null)} onClick={(event) => event.stopPropagation()} className={`shrink-0 select-none touch-none text-base leading-none ${chore.isFixed ? "text-transparent" : "cursor-grab text-slate-400 active:cursor-grabbing"}`}>⠿</span><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-3xl shadow-sm">{!chore.emoji || chore.emoji === "✨" ? choreIcon(chore.title) : chore.emoji}</span><span className={`min-w-0 flex-1 text-base font-black leading-tight ${chore.completionId ? "text-slate-400 line-through" : "text-slate-800"}`}>{chore.title}</span><span className={`grid size-9 shrink-0 place-items-center rounded-lg border-2 text-xl font-black ${chore.completionId ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span></button>{celebratingChoreId === chore.id && <ChoreCelebration/>}{!chore.isFixed && <button onClick={() => onDeleteChore(chore)} title={`Delete ${chore.title}`} className="absolute right-1 top-1 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-rose-600"><AppIcon name="trash" className="size-3.5"/></button>}</div>)}{routineChores.length === 0 && <p className="rounded-xl bg-white/50 px-3 py-4 text-center text-xs font-semibold text-slate-600">{routine.id === "To-do" ? "Add an anytime to-do." : isWeekday ? "Routine is ready for the weekday." : "Back on Monday."}</p>}</div></section>; })}</div></div>; })}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Add Michael and Lucas (or anyone else) to create their chore boards.</div>}</div></section>;
}

function SettingsPage({ members, onMemberColorChange, onAddMember, themeMode, onThemeModeChange, googleConnections, appleFeeds, onConnect, onToggleConnection, onAddApple, onToggleApple, onInviteAdult }: { members: Member[]; onMemberColorChange: (memberId: string | number, color: string) => Promise<void>; onAddMember: (name: string, role: Member["role"]) => Promise<{ error?: string }>; themeMode: ThemeMode; onThemeModeChange: (mode: ThemeMode) => void; googleConnections: GoogleConnection[]; appleFeeds: AppleFeed[]; onConnect: () => void; onToggleConnection: (connection: GoogleConnection) => void; onAddApple: (name: string, url: string) => void; onToggleApple: (feed: AppleFeed) => void; onInviteAdult: (email: string, displayName: string) => Promise<{ link?: string; error?: string }> }) {
  const [appleName, setAppleName] = useState("Home");
  const [appleUrl, setAppleUrl] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("Matt");
  const [inviteStatus, setInviteStatus] = useState("");
  const [pinMode, setPinMode] = useState<"loading" | "setup" | "locked" | "unlocked">("loading");
  const [settingsPin, setSettingsPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<Member["role"]>("child");
  const [personMessage, setPersonMessage] = useState("");
  useEffect(() => {
    if (!supabase) { setPinMode("unlocked"); return; }
    supabase.rpc("household_settings_pin_configured").then(({ data, error }) => {
      if (error) { setPinMessage(error.message); setPinMode("locked"); return; }
      setPinMode(data ? "locked" : "setup");
    });
  }, []);
  async function submitPin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setPinMode("unlocked"); return; }
    if (pinMode === "setup") {
      if (settingsPin !== pinConfirmation) { setPinMessage("Those PINs do not match."); return; }
      const { error } = await supabase.rpc("set_household_settings_pin", { p_pin: settingsPin });
      if (error) { setPinMessage(error.message); return; }
      setSettingsPin(""); setPinConfirmation(""); setPinMode("unlocked"); return;
    }
    const { data, error } = await supabase.rpc("verify_household_settings_pin", { p_pin: settingsPin });
    if (error) { setPinMessage(error.message); return; }
    if (!data) { setPinMessage("That PIN is not right. Try again."); setSettingsPin(""); return; }
    setSettingsPin(""); setPinMode("unlocked");
  }
  function addApple(event: FormEvent) { event.preventDefault(); if (!appleUrl.trim()) return; onAddApple(appleName.trim() || "Apple Calendar", appleUrl.trim()); setAppleUrl(""); }
  async function inviteAdult(event: FormEvent) { event.preventDefault(); setInviteStatus("Creating a private invite…"); const result = await onInviteAdult(inviteEmail, inviteName); if (result.error) { setInviteStatus(result.error); return; } setInviteStatus("Invite link copied. Send it only to this email address."); setInviteEmail(""); if (result.link) window.prompt("Copy this private invitation link and send it to them:", result.link); }
  async function submitNewPerson(event: FormEvent) {
    event.preventDefault();
    const result = await onAddMember(newPersonName, newPersonRole);
    if (result.error) { setPersonMessage(result.error); return; }
    setNewPersonName("");
    setNewPersonRole("child");
    setPersonMessage("");
    setShowAddPerson(false);
  }
  if (pinMode !== "unlocked") return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-md rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS LOCK</p><h2 className="mt-1 text-3xl font-bold">{pinMode === "setup" ? "Create a settings PIN" : "Enter settings PIN"}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{pinMode === "setup" ? "Choose a 4–8 digit PIN so little hands cannot change calendar connections or family settings." : "Enter the family PIN to open Settings."}</p>{pinMode === "loading" ? <p className="mt-6 text-sm font-semibold text-slate-400">Checking lock…</p> : <form onSubmit={submitPin} className="mt-6 space-y-3"><input required inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} autoFocus type="password" value={settingsPin} onChange={(event) => setSettingsPin(event.target.value.replace(/\D/g, ""))} placeholder="4–8 digit PIN" className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-center text-lg tracking-[.35em] text-slate-800"/>{pinMode === "setup" && <input required inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} type="password" value={pinConfirmation} onChange={(event) => setPinConfirmation(event.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-center text-lg tracking-[.35em] text-slate-800"/>}<button className="w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700">{pinMode === "setup" ? "Save PIN" : "Unlock settings"}</button>{pinMessage && <p className="text-sm font-semibold text-rose-600">{pinMessage}</p>}</form>}</div></section>;
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-2xl space-y-5"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS</p><h2 className="text-3xl font-bold">Calendar connections</h2><article className="mt-6 rounded-2xl bg-sky-50 p-5 dark:bg-sky-400/10"><p className="font-bold">Appearance</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Auto follows local sunrise and sunset using the weather location.</p><div className="mt-4 flex flex-wrap gap-2">{([ ["auto", "◐ Auto"], ["light", "☀ Light"], ["dark", "☾ Dark"] ] as const).map(([mode, label]) => <button key={mode} onClick={() => onThemeModeChange(mode)} className={`rounded-xl px-4 py-2 text-sm font-bold ${themeMode === mode ? "bg-sky-600 text-white shadow-sm" : "bg-white text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100 dark:bg-white/10 dark:text-sky-100 dark:ring-white/10"}`}>{label}</button>)}</div></article><article className="mt-5 rounded-2xl bg-violet-50 p-5 dark:bg-violet-400/10"><p className="font-bold">Person colors</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Choose a color for each person. It appears on their calendar events and assigned tasks.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{members.map((member, index) => { const currentColor = isHexColor(member.color ?? "") && member.color !== defaultMemberColor ? member.color! : memberCalendarColor(member, index); return <div key={member.id} className="rounded-2xl bg-white/80 p-3 ring-1 ring-violet-100 dark:bg-white/10 dark:ring-white/10"><div className="flex items-center gap-3"><span className="size-8 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: currentColor }} /><div className="min-w-0"><p className="truncate font-bold">{member.name}</p><p className="text-xs text-slate-500 dark:text-slate-300">{member.role === "adult" ? "Adult" : "Child"}</p></div></div><div className="mt-3 flex flex-wrap items-center gap-2">{memberColorOptions.map((color) => <button key={color} type="button" aria-label={`Set ${member.name}'s color`} onClick={() => void onMemberColorChange(member.id, color)} className={`size-7 rounded-full border-2 ${currentColor.toLowerCase() === color ? "border-slate-900 ring-2 ring-white" : "border-white/80 dark:border-white/20"}`} style={{ backgroundColor: color }} />)}<label className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-violet-300 text-xs font-black text-violet-600 dark:border-violet-200 dark:text-violet-200" title={`Choose ${member.name}'s custom color`}><span aria-hidden="true">+</span><input type="color" aria-label={`Choose ${member.name}'s custom color`} value={currentColor} onChange={(event) => void onMemberColorChange(member.id, event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" /></label></div></div>; })}</div>{members.length === 0 && <p className="mt-4 text-sm text-slate-500">No people have been added yet.</p>}</article><article className="mt-5 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-400/10"><p className="font-bold">Invite an adult</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">They&apos;ll get their own login and see this same family home.</p><form onSubmit={inviteAdult} className="mt-4 grid gap-3 sm:grid-cols-2"><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Adult&apos;s email address" className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800"/><input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name, e.g. Matt" className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Create private invite</button></form>{inviteStatus && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{inviteStatus}</p>}</article><article className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold">Google Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose which Google calendars appear in your family calendar.</p></div><button onClick={onConnect} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">{googleConnections.length ? "+ Add Google account" : "Connect Google"}</button></div>{googleConnections.length > 0 && <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">{googleConnections.map((connection) => <label key={connection.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold shadow-sm dark:bg-white/5"><input type="checkbox" checked={connection.enabled} onChange={() => onToggleConnection(connection)} className="size-4 accent-violet-600"/><span className="flex-1">{connection.name}</span><span className={connection.enabled ? "text-emerald-600" : "text-slate-400"}>{connection.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article><article className="mt-5 rounded-2xl bg-rose-50 p-5 dark:bg-rose-400/10"><div><p className="font-bold">Apple / iCloud Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paste a public iCloud calendar link for read-only import.</p></div><form onSubmit={addApple} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><input value={appleName} onChange={(event) => setAppleName(event.target.value)} placeholder="Calendar name" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><input required value={appleUrl} onChange={(event) => setAppleUrl(event.target.value)} placeholder="Paste public iCloud link" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white">Add</button></form>{appleFeeds.length > 0 && <div className="mt-5 space-y-2 border-t border-rose-200 pt-4">{appleFeeds.map((feed) => <label key={feed.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm"><input type="checkbox" checked={feed.enabled} onChange={() => onToggleApple(feed)} className="size-4 accent-rose-500"/><span className="flex-1">{feed.name}</span><span className={feed.enabled ? "text-emerald-600" : "text-slate-400"}>{feed.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article></div></div></section>;
}

function ListsPage({ lists, onAddList, onAddItem, onToggleItem, onDeleteItem, onDeleteList }: { lists: SharedList[]; onAddList: () => void; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  const [pin, setPin] = useState(""); const [privateLists, setPrivateLists] = useState<SharedList[] | null>(null); const [message, setMessage] = useState("");
  async function unlock() { if (!supabase) return; const { data, error } = await supabase.rpc("get_private_lists", { p_pin: pin }); if (error) { setMessage(error.message); return; } setPrivateLists(data ?? []); setMessage(""); }
  async function addPrivate() { const title = window.prompt("Name this private list"); if (!title?.trim() || !supabase) return; const { error } = await supabase.rpc("add_private_list", { p_pin: pin, p_title: title.trim() }); if (error) { setMessage(error.message); return; } await unlock(); }
  async function addPrivateItem(listId: string | number) { const title = window.prompt("Add an item"); if (!title?.trim() || !supabase) return; const { error } = await supabase.rpc("add_private_list_item", { p_pin: pin, p_list_id: listId, p_title: title.trim() }); if (error) { setMessage(error.message); return; } await unlock(); }
  async function deletePrivate(list: SharedList) { if (!window.confirm(`Delete “${list.title}” and all of its items?`) || !supabase) return; const { error } = await supabase.rpc("delete_private_list", { p_pin: pin, p_list_id: list.id }); if (error) { setMessage(error.message); return; } await unlock(); }
  async function updatePrivateItem(item: SharedListItem, remove = false) { if (!supabase) return; const { error } = await supabase.rpc("update_private_list_item", { p_pin: pin, p_item_id: item.id, p_completed: remove ? item.done : !item.done, p_delete: remove }); if (error) { setMessage(error.message); return; } await unlock(); }
  return <section className="mx-auto max-w-[1800px] space-y-8 px-5 pb-24 md:px-9 lg:pb-8"><div><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">SHARED LISTS</p><h2 className="text-3xl font-bold">Keep the house moving</h2></div><button onClick={onAddList} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">+ New list</button></div>{lists.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{lists.map((list, index) => <ListCard key={list.id} list={list} colorIndex={index} onAddItem={onAddItem} onToggleItem={onToggleItem} onDeleteItem={onDeleteItem} onDeleteList={onDeleteList} />)}</div> : <p className="text-slate-500">No family lists yet.</p>}</div><div className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6 dark:border-violet-400/25 dark:bg-violet-500/10"><p className="text-sm font-bold text-violet-600">PRIVATE LISTS</p><h2 className="mt-1 text-2xl font-bold">🔒 Surprises stay private</h2>{privateLists === null ? <form onSubmit={(e) => { e.preventDefault(); void unlock(); }} className="mt-4 flex max-w-sm gap-2"><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" type="password" placeholder="Enter family PIN" className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-800"/><button className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">Unlock</button></form> : <><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{privateLists.map((list, index) => <PrivateListCard key={list.id} list={list} colorIndex={index} onAddItem={addPrivateItem} onDelete={deletePrivate} onToggleItem={(item) => void updatePrivateItem(item)} onDeleteItem={(item) => { if (window.confirm(`Delete “${item.title}”?`)) void updatePrivateItem(item, true); }} />)}</div><div className="mt-4 flex gap-3"><button onClick={() => void addPrivate()} className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">+ New private list</button><button onClick={() => { setPrivateLists(null); setPin(""); }} className="rounded-xl px-4 py-2 font-bold text-violet-700">Lock</button></div></>}{message && <p className="mt-3 text-sm font-bold text-rose-600">{message}</p>}</div></section>;
}

function PrivateListCard({ list, colorIndex, onAddItem, onDelete, onToggleItem, onDeleteItem }: { list: SharedList; colorIndex: number; onAddItem: (id: string | number) => void; onDelete: (list: SharedList) => void; onToggleItem: (item: SharedListItem) => void; onDeleteItem: (item: SharedListItem) => void }) {
  const colors = ["bg-rose-100 dark:bg-rose-500/45", "bg-sky-100 dark:bg-sky-500/45", "bg-amber-100 dark:bg-amber-400/45", "bg-emerald-100 dark:bg-emerald-500/45", "bg-violet-100 dark:bg-violet-500/45", "bg-orange-100 dark:bg-orange-500/45"];
  return <article className={`rounded-[2rem] p-6 text-slate-800 shadow-sm ring-1 ring-white/70 dark:text-white dark:ring-white/10 ${colors[colorIndex % colors.length]}`}><div className="flex items-start justify-between"><div><p className="text-3xl">🎁</p><h3 className="mt-3 text-xl font-bold">{list.title}</h3></div><div className="flex gap-2"><button onClick={() => onAddItem(list.id)} className="grid size-9 place-items-center rounded-xl bg-white/80 text-lg font-bold text-violet-700">+</button><button onClick={() => onDelete(list)} title={`Delete ${list.title}`} className="grid size-9 place-items-center rounded-xl bg-white/80 text-rose-600"><AppIcon name="trash" className="size-4"/></button></div></div><div className="mt-5 space-y-2">{list.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700"><button type="button" onClick={() => onToggleItem(item)} aria-label={`Complete ${item.title}`} className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 text-transparent"}`}>✓</button><span className={item.done ? "min-w-0 flex-1 line-through opacity-60" : "min-w-0 flex-1"}>{item.title}</span><button type="button" onClick={() => onDeleteItem(item)} title={`Delete ${item.title}`} aria-label={`Delete ${item.title}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-100"><AppIcon name="trash" className="size-4"/></button></div>)}{list.items.length === 0 && <p className="text-sm text-slate-600">Tap + to add an item.</p>}</div></article>;
}

function ListCard({ list, colorIndex, onAddItem, onToggleItem, onDeleteItem, onDeleteList }: { list: SharedList; colorIndex: number; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  const colors = ["bg-rose-100 dark:bg-rose-500/45", "bg-sky-100 dark:bg-sky-500/45", "bg-amber-100 dark:bg-amber-400/45", "bg-emerald-100 dark:bg-emerald-500/45", "bg-violet-100 dark:bg-violet-500/45", "bg-orange-100 dark:bg-orange-500/45"];
  return (
    <article className={`rounded-[2rem] p-6 shadow-sm ring-1 ring-white/70 dark:ring-white/10 ${colors[colorIndex % colors.length]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="flex size-9 items-center justify-center"><NotoEmoji emoji={listVisualIcon(list.icon)} className="size-9" alt="" /></p>
          <h2 className="mt-3 text-xl font-bold">{list.title}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAddItem(list.id)} className="grid size-9 place-items-center rounded-xl bg-white/80 text-lg font-bold text-violet-700 hover:bg-white">+</button>
          <button onClick={() => onDeleteList(list)} title={`Delete ${list.title}`} aria-label={`Delete ${list.title}`} className="grid size-9 place-items-center rounded-xl bg-white/80 text-rose-600 hover:bg-rose-50">
            <AppIcon name="trash" className="size-4" />
          </button>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {list.items.map((item) => (
          <div key={item.id} className="flex w-full items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700">
            <button type="button" onClick={() => onToggleItem(list.id, item.id)} aria-label={`Complete ${item.title}`} className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 text-transparent"}`}>✓</button>
            <span className={`min-w-0 flex-1 ${item.done ? "line-through text-slate-400" : ""}`}>{item.title}</span>
            <button type="button" onClick={() => onDeleteItem(list.id, item.id)} title={`Delete ${item.title}`} aria-label={`Delete ${item.title}`} className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-100"><AppIcon name="trash" className="size-4"/></button>
          </div>
        ))}
        {list.items.length === 0 && <p className="text-sm text-slate-500">Tap + to add an item.</p>}
      </div>
    </article>
  );
}
