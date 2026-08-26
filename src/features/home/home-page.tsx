"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  type AppleFeed,
  type AuroraActivity,
  type ChoreEntry,
  type ChoreCreationOptions,
  type ChoreRewardMode,
  type Event,
  type GoogleConnection,
  type Member,
  type MoodCheckin,
  type MoodKey,
  type CometCloseApproach,
  cometCloseApproachForPayload,
  auroraActivityForLocation,
  type SharedList,
  type SharedListItem,
  type ThemeMode,
  type Todo,
  type Weather,
  type WeatherAlert,
  type WeatherForecast,
  type WeatherInsights,
  choreIcon,
  displayEventsOnce,
  familyHolidaysForYear,
  isMoodKey,
  listIcon,
  localDateInputValue,
  moodOption,
  starterEvents,
  weatherSummary,
} from "@/features/home/model";
import { useAppNotifications } from "@/components/home/shared-ui";
import { eventOccursOn as calendarEventOccursOn, isBirthdayEvent } from "@/components/home/calendar";
import { AuthScreen, Screensaver, SeasonalScreensaver, TasksPage } from "@/components/home/task-components";
import ChristmasWishlistPage from "@/features/christmas-wishlist/christmas-wishlist-page";
import { parseVoiceCommand } from "@/features/home/voice-command";
import { SettingsPage } from "@/features/settings/settings-page";
import { ListsPage, listPreferenceKey, type ListKind } from "@/features/lists/lists-page";
import { ChoresPage } from "@/features/chores/chores-page";
import type { VoiceChoreDraft, VoiceListDraft, WeekendChoreDraft } from "@/features/voice/voice-command-editors";
import { CalendarPage } from "@/features/calendar/calendar-page";
import { HomeDashboard } from "@/features/home/home-dashboard";
import { HomeHeader, HomeNavigation, navigationTabs, type HomeTab } from "@/features/home/home-shell";
import { HomeOverlays } from "@/features/home/home-overlays";
import { createSettingsActions } from "@/features/settings/settings-actions";
import { requestPushNotification } from "@/lib/notification-client";

type VoiceWishlistDraft = { id: string; title: string; memberId: string | null };
const WEATHER_POLLEN_CACHE_TTL_MS = 3 * 60 * 60 * 1000;
const CALENDAR_EVENT_PAGE_SIZE = 500;
const CALENDAR_EVENT_COLUMNS = "id, title, notes, starts_at, ends_at, all_day, color, location, category, member_ids, external_id, series_external_id, source";

type CalendarEventRow = {
  id: string;
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  color: string | null;
  location: string | null;
  category: string | null;
  member_ids: string[] | null;
  external_id: string | null;
  series_external_id: string | null;
  source: "app" | "google" | "apple";
};

async function loadCalendarEventRows(householdId: string) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };
  const rows: CalendarEventRow[] = [];
  for (let from = 0; ; from += CALENDAR_EVENT_PAGE_SIZE) {
    const { data, error } = await supabase.from("events").select(CALENDAR_EVENT_COLUMNS).eq("household_id", householdId).order("starts_at").order("id").range(from, from + CALENDAR_EVENT_PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = (data ?? []) as CalendarEventRow[];
    rows.push(...page);
    if (page.length < CALENDAR_EVENT_PAGE_SIZE) return { data: rows, error: null };
  }
}

function nullableWeatherNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseWeatherAlerts(payload: unknown): WeatherAlert[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { features?: unknown }).features)) return [];
  return (payload as { features: unknown[] }).features.flatMap((feature) => {
    if (!feature || typeof feature !== "object") return [];
    const properties = (feature as { properties?: unknown }).properties;
    if (!properties || typeof properties !== "object") return [];
    const data = properties as Record<string, unknown>;
    const id = (feature as { id?: unknown }).id;
    return [{
      id: typeof id === "string" ? id : crypto.randomUUID(),
      event: typeof data.event === "string" ? data.event : "Weather alert",
      headline: typeof data.headline === "string" ? data.headline : "Active weather alert",
      severity: typeof data.severity === "string" ? data.severity : "Unknown",
      urgency: typeof data.urgency === "string" ? data.urgency : "Unknown",
      certainty: typeof data.certainty === "string" ? data.certainty : "Unknown",
      description: typeof data.description === "string" ? data.description : "",
      instruction: typeof data.instruction === "string" ? data.instruction : "",
      onset: typeof data.onset === "string" ? data.onset : null,
      expires: typeof data.expires === "string" ? data.expires : null,
      url: typeof data.web === "string" ? data.web : null,
    } satisfies WeatherAlert];
  });
}

function weatherPollenCacheKey(latitude: number, longitude: number) {
  return `family-weather-pollen:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
}

function readCachedWeatherPollen(latitude: number, longitude: number): WeatherInsights["pollen"] {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(weatherPollenCacheKey(latitude, longitude));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { savedAt?: unknown; pollen?: WeatherInsights["pollen"] };
    if (typeof cached.savedAt !== "number" || Date.now() - cached.savedAt >= WEATHER_POLLEN_CACHE_TTL_MS || !cached.pollen?.configured) {
      window.localStorage.removeItem(weatherPollenCacheKey(latitude, longitude));
      return null;
    }
    return cached.pollen;
  } catch {
    return null;
  }
}

function writeCachedWeatherPollen(latitude: number, longitude: number, pollen: WeatherInsights["pollen"]) {
  if (typeof window === "undefined" || !pollen?.configured) return;
  try {
    window.localStorage.setItem(weatherPollenCacheKey(latitude, longitude), JSON.stringify({ savedAt: Date.now(), pollen }));
  } catch { /* A full or restricted local cache should never block weather. */ }
}

type ChoreRealtimeRow = Record<string, unknown>;
type ChoreRealtimePayload = { eventType: string; new: ChoreRealtimeRow; old: ChoreRealtimeRow };
type MoodRealtimeRow = Record<string, unknown>;
type MoodRealtimePayload = { eventType: string; new: MoodRealtimeRow; old: MoodRealtimeRow };

function moodCheckinFromRealtimeRow(row: MoodRealtimeRow): MoodCheckin | null {
  const id = row.id;
  const memberId = row.member_id;
  if ((typeof id !== "string" && typeof id !== "number") || (typeof memberId !== "string" && typeof memberId !== "number") || !isMoodKey(row.mood) || typeof row.checked_in_at !== "string") return null;
  return { id, memberId, mood: row.mood, checkedInAt: row.checked_in_at };
}

function choreFromRealtimeRow(row: ChoreRealtimeRow, previous?: ChoreEntry): ChoreEntry | null {
  const id = row.id ?? previous?.id;
  if (typeof id !== "string" && typeof id !== "number") return null;
  const routine = typeof row.routine === "string" ? row.routine : previous?.routine ?? "To-do";
  const isDaily = typeof row.is_daily === "boolean" ? row.is_daily : previous?.isDaily ?? routine !== "To-do";
  const assigneeMemberId = row.assignee_member_id === null
    ? null
    : typeof row.assignee_member_id === "string" || typeof row.assignee_member_id === "number"
      ? row.assignee_member_id
      : previous?.assigneeMemberId ?? null;
  const scheduledFor = row.scheduled_for === null
    ? null
    : typeof row.scheduled_for === "string"
      ? row.scheduled_for
      : previous?.scheduledFor ?? null;
  return {
    id,
    title: typeof row.title === "string" ? row.title : previous?.title ?? "Untitled chore",
    emoji: typeof row.emoji === "string" ? row.emoji : previous?.emoji ?? "✨",
    assigneeMemberId,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : previous?.sortOrder ?? 0,
    routine,
    isDaily,
    isFixed: typeof row.is_fixed === "boolean" ? row.is_fixed : previous?.isFixed ?? false,
    scheduledFor,
    rewardCents: typeof row.reward_cents === "number" ? row.reward_cents : previous?.rewardCents ?? 50,
    rewardStars: typeof row.reward_stars === "number" ? row.reward_stars : previous?.rewardStars ?? 1,
    completionId: previous?.completionId,
    completedRewardCents: previous?.completedRewardCents,
    completedRewardStars: previous?.completedRewardStars,
  };
}

function sortChores(items: ChoreEntry[]) {
  return [...items].sort((first, second) => first.sortOrder - second.sortOrder || String(first.id).localeCompare(String(second.id)));
}

export default function Home() {
  const { notify, confirm, prompt } = useAppNotifications();
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
  const [activeTab, setActiveTab] = useState<HomeTab>("home");
  const mainRef = useRef<HTMLElement | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [weatherInsights, setWeatherInsights] = useState<WeatherInsights | null>(null);
  const [showWeatherForecast, setShowWeatherForecast] = useState(false);
  const [auroraActivity, setAuroraActivity] = useState<AuroraActivity | null>(null);
  const [cometCloseApproach, setCometCloseApproach] = useState<CometCloseApproach | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [celebratingBirthdayDate, setCelebratingBirthdayDate] = useState<string | null>(null);
  const openedBirthdayDate = useRef<string | null>(null);
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [selectedCalendarMemberIds, setSelectedCalendarMemberIds] = useState<string[]>([]);
  const [showFamilyEvents, setShowFamilyEvents] = useState(false);
  const [dark, setDark] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");
  const [showChoresTab, setShowChoresTab] = useState(true);
  const [showWishlistTab, setShowWishlistTab] = useState(true);
  const [sunTimes, setSunTimes] = useState<{ sunrise: number; sunset: number } | null>(null);
  const [seasonalScreenSaver, setSeasonalScreenSaver] = useState(false);
  const [screenSaver, setScreenSaver] = useState(false);
  const [todayKey, setTodayKey] = useState(() => new Date().toDateString());
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("Your Family Home");
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [householdDataLoading, setHouseholdDataLoading] = useState(false);
  const [householdDataLoaded, setHouseholdDataLoaded] = useState(false);
  const [householdDataError, setHouseholdDataError] = useState("");
  const [householdDataRetryKey, setHouseholdDataRetryKey] = useState(0);
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
  const syncingGoogleRef = useRef(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<ChoreEntry[]>([]);
  const [choreRewardMode, setChoreRewardMode] = useState<ChoreRewardMode>("money");
  const [choreRewardTargetCents, setChoreRewardTargetCents] = useState(200);
  const [choreRewardTargetStars, setChoreRewardTargetStars] = useState(20);
  const [choreEarnedCentsByMember, setChoreEarnedCentsByMember] = useState<Record<string, number>>({});
  const [chorePaidOutCentsByMember, setChorePaidOutCentsByMember] = useState<Record<string, number>>({});
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);
  const [googleConnections, setGoogleConnections] = useState<GoogleConnection[]>([]);
  const [appleFeeds, setAppleFeeds] = useState<AppleFeed[]>([]);
  const [celebratingChoreId, setCelebratingChoreId] = useState<string | number | null>(null);
  const [moodCheckins, setMoodCheckins] = useState<MoodCheckin[]>([]);
  const [moodMemberId, setMoodMemberId] = useState("");
  const [selectedMood, setSelectedMood] = useState<MoodKey>("good");
  const [savingMood, setSavingMood] = useState(false);
  const [moodMessage, setMoodMessage] = useState("");
  const [voiceCommand, setVoiceCommand] = useState("");
  const [voiceMessage, setVoiceMessage] = useState("");
  const [voiceWishlistDraft, setVoiceWishlistDraft] = useState<VoiceWishlistDraft | null>(null);
  const [voiceChoreDraft, setVoiceChoreDraft] = useState<VoiceChoreDraft | null>(null);
  const [weekendChoreDraft, setWeekendChoreDraft] = useState<WeekendChoreDraft | null>(null);
  const [voiceListDraft, setVoiceListDraft] = useState<VoiceListDraft | null>(null);
  const [expandedListKeys, setExpandedListKeys] = useState<Record<string, boolean>>({});
  const sharedListIdsRef = useRef(new Set<string>());
  const completingChoreIdsRef = useRef(new Set<string>());
  const choresRef = useRef<ChoreEntry[]>([]);

  useEffect(() => {
    choresRef.current = chores;
  }, [chores]);

  useEffect(() => {
    sharedListIdsRef.current = new Set(sharedLists.map((list) => String(list.id)));
  }, [sharedLists]);

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
      // Browser-only auth initialization.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthReady(true);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    }).catch(() => {
      // A temporary auth/network failure should not leave the app on its
      // indefinite startup screen.
      setUser(null);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    // Browser-only URL initialization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInviteToken(token);
    setInviteReady(true);
  }, []);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("calendar");
    if (result === "google-connected") {
      // Consume the one-time OAuth result from the browser URL.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        const { data: household } = await supabase!.from("households").select("name, theme_mode, show_chores_tab, show_wishlist_tab, chore_reward_mode, chore_reward_target_cents, chore_reward_target_stars").eq("id", id).single();
        if (household) {
          setHouseholdName(household.name);
          if (household.theme_mode === "light" || household.theme_mode === "dark" || household.theme_mode === "auto") setThemeMode(household.theme_mode);
          if (typeof household.show_chores_tab === "boolean") setShowChoresTab(household.show_chores_tab);
          if (typeof household.show_wishlist_tab === "boolean") setShowWishlistTab(household.show_wishlist_tab);
          if (household.chore_reward_mode === "money" || household.chore_reward_mode === "stars") setChoreRewardMode(household.chore_reward_mode);
          if (typeof household.chore_reward_target_cents === "number") setChoreRewardTargetCents(household.chore_reward_target_cents);
          if (typeof household.chore_reward_target_stars === "number") setChoreRewardTargetStars(household.chore_reward_target_stars);
        }
      }
      setDataReady(true);
    }
    void loadMembership();
  }, [user, inviteReady, inviteToken]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    let cancelled = false;
    // The query lifecycle begins when the household or retry key changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHouseholdDataLoading(true);
    setHouseholdDataError("");
    const today = localDateInputValue(new Date());
    Promise.all([
      loadCalendarEventRows(householdId),
      supabase.from("todos").select("id, title, due_at, status, completed_at, assignee_member_id").eq("household_id", householdId).neq("status", "archived").order("due_at"),
      supabase.from("members").select("id, user_id, display_name, role, color").eq("household_id", householdId).order("created_at"),
      supabase.from("chores").select("id, title, emoji, assignee_member_id, sort_order, routine, is_daily, is_fixed, scheduled_for, active, reward_cents, reward_stars").eq("household_id", householdId).order("sort_order").order("created_at"),
      supabase.from("chore_completions").select("id, chore_id, member_id, completed_at, completed_on, reward_cents, reward_stars").order("completed_at", { ascending: false }),
      supabase.from("chore_payouts").select("id, child_member_id, amount_cents, paid_at").eq("household_id", householdId).order("paid_at", { ascending: false }),
      supabase.from("lists").select("id, title, icon").eq("household_id", householdId).order("created_at"),
      supabase.from("list_items").select("id, list_id, title, completed").order("created_at"),
      supabase.from("google_calendar_connections").select("id, display_name, enabled").eq("household_id", householdId).order("created_at"),
      supabase.from("calendar_feeds").select("id, display_name, enabled").eq("household_id", householdId).eq("provider", "apple").order("created_at"),
      supabase.from("mood_checkins").select("id, member_id, mood, checked_in_at").eq("household_id", householdId).eq("checkin_date", localDateInputValue(new Date())).order("checked_in_at", { ascending: false }),
      supabase.from("calendar_event_member_assignments").select("source, external_id, member_ids").eq("household_id", householdId),
    ]).then(([eventResult, todoResult, memberResult, choreResult, completionResult, payoutResult, listResult, listItemResult, connectionResult, appleFeedResult, moodResult, eventAssignmentResult]) => {
      if (cancelled) return;
      const queryError = [eventResult.error, todoResult.error, memberResult.error, choreResult.error, completionResult.error, payoutResult.error, listResult.error, listItemResult.error, connectionResult.error, appleFeedResult.error, moodResult.error, eventAssignmentResult.error].find(Boolean);
      if (queryError) {
        setHouseholdDataLoading(false);
        setHouseholdDataError(`Could not load your family home: ${queryError.message}`);
        return;
      }
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
        setMembers(loadedMembers.map(({ id, userId, name, role, color }) => ({ id, userId, name, role, color })));
        setMoodMemberId((current) => current || String(loadedMembers.find((member) => member.userId === user?.id)?.id ?? loadedMembers[0]?.id ?? ""));
      }
      if (choreResult.data) {
        const choreById = new Map(choreResult.data.map((chore) => [chore.id, chore]));
        const completionByChore = new Map<string, { id: string; rewardCents: number; rewardStars: number }>();
        const earnedByMember: Record<string, number> = {};
        for (const completion of completionResult.data ?? []) {
          const chore = choreById.get(completion.chore_id);
          const childMemberId = chore?.assignee_member_id ?? completion.member_id;
          if (childMemberId) earnedByMember[String(childMemberId)] = (earnedByMember[String(childMemberId)] ?? 0) + (completion.reward_cents ?? 0);
          const isDaily = chore?.is_daily ?? chore?.routine !== "To-do";
          if (isDaily && completion.completed_on !== today) continue;
          if (!completionByChore.has(completion.chore_id)) completionByChore.set(completion.chore_id, { id: completion.id, rewardCents: completion.reward_cents ?? 0, rewardStars: completion.reward_stars ?? 0 });
        }
        setChoreEarnedCentsByMember(earnedByMember);
        setChores(choreResult.data.map((chore) => {
          const isDaily = chore.is_daily ?? chore.routine !== "To-do";
          const completion = completionByChore.get(chore.id);
          return { id: chore.id, title: chore.title, emoji: chore.emoji, assigneeMemberId: chore.assignee_member_id, sortOrder: chore.sort_order ?? 0, routine: chore.routine ?? "To-do", isDaily, isFixed: chore.is_fixed ?? false, scheduledFor: chore.scheduled_for, rewardCents: chore.reward_cents ?? 50, rewardStars: chore.reward_stars ?? 1, completionId: completion?.id ?? (!isDaily && !chore.active ? `legacy-completed-${chore.id}` : undefined), completedRewardCents: completion?.rewardCents, completedRewardStars: completion?.rewardStars };
        }));
      }
      if (payoutResult.data) {
        const paidOutByMember: Record<string, number> = {};
        for (const payout of payoutResult.data) paidOutByMember[String(payout.child_member_id)] = (paidOutByMember[String(payout.child_member_id)] ?? 0) + payout.amount_cents;
        setChorePaidOutCentsByMember(paidOutByMember);
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
      setHouseholdDataLoaded(true);
      setHouseholdDataLoading(false);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setHouseholdDataLoading(false);
      setHouseholdDataError(error instanceof Error ? `Could not load your family home: ${error.message}` : "Could not load your family home. Please try again.");
    });
    return () => { cancelled = true; };
  }, [householdId, householdDataRetryKey, todayKey, user?.id]);

  useEffect(() => {
    if (!supabase || !householdId) return;

    const applyListChange = (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as { id?: string; title?: string; icon?: string };
      if (!row.id) return;
      const id = row.id;
      const listId = String(id);

      if (payload.eventType === "DELETE") sharedListIdsRef.current.delete(listId);
      else sharedListIdsRef.current.add(listId);

      setSharedLists((current) => {
        if (payload.eventType === "DELETE") return current.filter((list) => String(list.id) !== listId);
        const incoming = { id, title: row.title ?? "Untitled list", icon: row.icon ?? "☰" };
        const existing = current.find((list) => String(list.id) === listId);
        if (existing) return current.map((list) => String(list.id) === listId ? { ...list, ...incoming } : list);
        return [...current, { ...incoming, items: [] }];
      });
    };

    const applyListItemChange = (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as { id?: string; list_id?: string; title?: string; completed?: boolean };
      if (!row.id) return;
      const id = row.id;
      const itemId = String(id);
      const listId = row.list_id ? String(row.list_id) : null;
      if (payload.eventType !== "DELETE" && (!listId || !sharedListIdsRef.current.has(listId))) return;

      setSharedLists((current) => current.map((list) => {
        if (payload.eventType === "DELETE") {
          return { ...list, items: list.items.filter((item) => String(item.id) !== itemId) };
        }
        if (String(list.id) !== listId) return list;
        const incoming = { id, title: row.title ?? "Untitled item", done: Boolean(row.completed) };
        const existing = list.items.some((item) => String(item.id) === itemId);
        return { ...list, items: existing ? list.items.map((item) => String(item.id) === itemId ? { ...item, ...incoming } : item) : [...list.items, incoming] };
      }));
    };

    const client = supabase;
    const channel = client
      .channel(`household-shared-lists:${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lists", filter: `household_id=eq.${householdId}` }, (payload) => applyListChange(payload))
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items" }, (payload) => applyListItemChange(payload))
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [householdId]);

  useEffect(() => {
    if (!supabase || !householdId || !householdDataLoaded) return;

    const applyMoodChange = (payload: MoodRealtimePayload) => {
      if (payload.eventType === "DELETE") {
        const deletedId = payload.old.id;
        if (typeof deletedId !== "string" && typeof deletedId !== "number") return;
        setMoodCheckins((current) => current.filter((checkin) => String(checkin.id) !== String(deletedId)));
        return;
      }

      const incoming = moodCheckinFromRealtimeRow(payload.new);
      if (!incoming) return;
      setMoodCheckins((current) => [incoming, ...current.filter((checkin) => String(checkin.id) !== String(incoming.id) && String(checkin.memberId) !== String(incoming.memberId))]);
    };

    const client = supabase;
    const channel = client
      .channel(`household-moods:${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "mood_checkins", filter: `household_id=eq.${householdId}` }, (payload) => applyMoodChange(payload))
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [householdDataLoaded, householdId]);

  useEffect(() => {
    if (!supabase || !householdId || !householdDataLoaded) return;

    const applyChoreChange = (payload: ChoreRealtimePayload) => {
      const row = payload.eventType === "DELETE" ? payload.old : payload.new;
      const incomingId = row.id;
      if (typeof incomingId !== "string" && typeof incomingId !== "number") return;
      const choreId = String(incomingId);
      if (payload.eventType === "DELETE") {
        choresRef.current = choresRef.current.filter((chore) => String(chore.id) !== choreId);
        setChores((current) => current.filter((chore) => String(chore.id) !== choreId));
        return;
      }

      const existing = choresRef.current.find((chore) => String(chore.id) === choreId);
      const incoming = choreFromRealtimeRow(row, existing);
      if (!incoming) return;
      const next = sortChores(existing
        ? choresRef.current.map((chore) => String(chore.id) === choreId ? incoming : chore)
        : [...choresRef.current, incoming]);
      choresRef.current = next;
      setChores(next);
    };

    const applyCompletionChange = (payload: ChoreRealtimePayload) => {
      const row = payload.eventType === "DELETE" ? payload.old : payload.new;
      const choreId = row.chore_id;
      if (typeof choreId !== "string" && typeof choreId !== "number") return;
      const chore = choresRef.current.find((item) => String(item.id) === String(choreId));
      if (!chore) return;

      const completionId = row.id;
      if (payload.eventType === "DELETE") {
        if (String(chore.completionId) === String(completionId)) {
          const next = choresRef.current.map((item) => String(item.id) === String(choreId) ? { ...item, completionId: undefined, completedRewardCents: undefined, completedRewardStars: undefined } : item);
          choresRef.current = next;
          setChores(next);
        }
        const deletedReward = typeof row.reward_cents === "number" ? row.reward_cents : 0;
        if (deletedReward > 0 && chore.assigneeMemberId !== null) {
          const childKey = String(chore.assigneeMemberId);
          setChoreEarnedCentsByMember((items) => ({ ...items, [childKey]: Math.max(0, (items[childKey] ?? 0) - deletedReward) }));
        }
        return;
      }
      if (typeof completionId !== "string" && typeof completionId !== "number") return;
      const completedOn = row.completed_on;
      if (chore.isDaily && typeof completedOn === "string" && completedOn !== localDateInputValue(new Date())) return;
      if (String(chore.completionId) === String(completionId)) return;

      const rewardCents = typeof row.reward_cents === "number" ? row.reward_cents : chore.rewardCents;
      const rewardStars = typeof row.reward_stars === "number" ? row.reward_stars : chore.rewardStars;
      const next = choresRef.current.map((item) => String(item.id) === String(choreId)
        ? { ...item, completionId, completedRewardCents: rewardCents, completedRewardStars: rewardStars }
        : item);
      choresRef.current = next;
      setChores(next);
      if (!completingChoreIdsRef.current.has(String(choreId)) && chore.assigneeMemberId !== null) {
        const childKey = String(chore.assigneeMemberId);
        setChoreEarnedCentsByMember((items) => ({ ...items, [childKey]: (items[childKey] ?? 0) + rewardCents }));
      }
    };

    const client = supabase;
    const channel = client
      .channel(`household-chores:${householdId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chores", filter: `household_id=eq.${householdId}` }, (payload) => applyChoreChange(payload))
      .on("postgres_changes", { event: "*", schema: "public", table: "chore_completions" }, (payload) => applyCompletionChange(payload))
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [householdDataLoaded, householdId]);

  useEffect(() => {
    if (!supabase || !user?.id) return;
    let cancelled = false;
    void supabase.from("user_list_preferences").select("list_key, expanded").eq("user_id", user.id).then(({ data }) => {
      if (cancelled) return;
      setExpandedListKeys(Object.fromEntries((data ?? []).map((preference) => [preference.list_key, preference.expanded === true])));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

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
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,sunrise,sunset&forecast_days=7&temperature_unit=fahrenheit&timezone=auto&timeformat=unixtime`);
        if (!weatherResponse.ok) throw new Error("Weather request failed");
        const data = await weatherResponse.json();
        setWeather({ temperature: Math.round(data.current.temperature_2m), high: Math.round(data.daily.temperature_2m_max[0]), low: Math.round(data.daily.temperature_2m_min[0]), summary: weatherSummary(data.current.weather_code), location: "Local forecast", code: data.current.weather_code, isDay: Boolean(data.current.is_day) });
        setWeatherForecast({
          hours: (data.hourly?.time ?? []).map((time: number, index: number) => ({ time, temperature: Math.round(data.hourly.temperature_2m[index]), code: data.hourly.weather_code[index], precipitationProbability: data.hourly.precipitation_probability[index] ?? 0 })),
          days: (data.daily?.time ?? []).map((date: number, index: number) => ({ date, high: Math.round(data.daily.temperature_2m_max[index]), low: Math.round(data.daily.temperature_2m_min[index]), summary: weatherSummary(data.daily.weather_code[index]), code: data.daily.weather_code[index], precipitationProbability: data.daily.precipitation_probability_max[index] ?? 0, sunrise: data.daily.sunrise[index] * 1000, sunset: data.daily.sunset[index] * 1000 })),
        });
        if (data.daily.sunrise?.[0] && data.daily.sunset?.[0]) setSunTimes({ sunrise: data.daily.sunrise[0] * 1000, sunset: data.daily.sunset[0] * 1000 });

        const airQualityUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
        airQualityUrl.searchParams.set("latitude", String(latitude));
        airQualityUrl.searchParams.set("longitude", String(longitude));
        airQualityUrl.searchParams.set("current", "us_aqi,pm2_5,ozone,uv_index");
        airQualityUrl.searchParams.set("timezone", "auto");
        const cachedPollen = readCachedWeatherPollen(latitude, longitude);
        const pollenRequest: Promise<WeatherInsights["pollen"]> = cachedPollen ? Promise.resolve(cachedPollen) : fetch(`/api/weather-pollen?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`).then(async (response) => {
          if (!response.ok) throw new Error("Pollen request failed");
          const result = await response.json() as WeatherInsights["pollen"];
          writeCachedWeatherPollen(latitude, longitude, result);
          return result;
        });
        const [airQualityResult, alertsResult, pollenResult] = await Promise.allSettled([
          fetch(airQualityUrl),
          fetch(`/api/weather-alerts?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`),
          pollenRequest,
        ]);
        let airQuality: WeatherInsights["airQuality"] = null;
        let uvIndex: number | null = null;
        let pollen: WeatherInsights["pollen"] = null;
        if (airQualityResult.status === "fulfilled" && airQualityResult.value.ok) {
          const airQualityData = await airQualityResult.value.json();
          const current = airQualityData.current ?? {};
          airQuality = { aqi: nullableWeatherNumber(current.us_aqi), pm2_5: nullableWeatherNumber(current.pm2_5), ozone: nullableWeatherNumber(current.ozone) };
          uvIndex = nullableWeatherNumber(current.uv_index);
        }
        let alerts: WeatherAlert[] = [];
        let alertsAvailable = false;
        if (alertsResult.status === "fulfilled" && alertsResult.value.ok) {
          const alertsData = await alertsResult.value.json() as { available?: boolean; features?: unknown };
          alerts = parseWeatherAlerts(alertsData);
          alertsAvailable = alertsData.available === true;
        }
        if (pollenResult.status === "fulfilled") pollen = pollenResult.value;
        setWeatherInsights({ airQuality, uvIndex, pollen, alerts, alertsAvailable });

        try {
          const auroraResponse = await fetch("https://services.swpc.noaa.gov/json/ovation_aurora_latest.json");
          if (!auroraResponse.ok) throw new Error("Aurora request failed");
          setAuroraActivity(auroraActivityForLocation(await auroraResponse.json(), latitude, longitude));
        } catch {
          setAuroraActivity(null);
        }

        try {
          const cometResponse = await fetch("https://ssd-api.jpl.nasa.gov/cad.api?comet=true&neo=false&date-max=%2B365&dist-max=0.1&h-max=18&sort=date&limit=1&fullname=true");
          if (!cometResponse.ok) throw new Error("Comet request failed");
          setCometCloseApproach(cometCloseApproachForPayload(await cometResponse.json()));
        } catch {
          setCometCloseApproach(null);
        }

        // A city name is nice to have, but its lookup must never hide usable weather.
        try {
          const placeResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          if (!placeResponse.ok) return;
          const place = await placeResponse.json();
          const address = place.address ?? {};
          const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.city_district ?? address.county;
          if (city) setWeather((current) => current ? { ...current, location: city } : current);
        } catch { /* Keep the useful "Local forecast" fallback. */ }
      } catch { setWeather(null); setWeatherForecast(null); setWeatherInsights(null); }
    }
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (position) => loadWeather(position.coords.latitude, position.coords.longitude),
      () => { setWeather(null); setWeatherForecast(null); setWeatherInsights(null); },
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
  const visibleCalendarEvents = useMemo(() => {
    if (!selectedCalendarMemberIds.length && !showFamilyEvents) return calendarEvents;
    return calendarEvents.filter((event) => {
      const assignedMemberIds = event.memberIds ?? [];
      const includesSelectedMember = assignedMemberIds.some((id) => selectedCalendarMemberIds.includes(String(id)));
      const isFamilyEvent = showFamilyEvents && assignedMemberIds.length === 0;
      return includesSelectedMember || isFamilyEvent;
    });
  }, [calendarEvents, selectedCalendarMemberIds, showFamilyEvents]);

  useEffect(() => {
    if (view !== "Day") {
      openedBirthdayDate.current = null;
      // Clear a celebration when leaving the day view.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCelebratingBirthdayDate(null);
      return;
    }
    const dateKey = calendarAnchor.toDateString();
    const hasBirthday = visibleCalendarEvents.some((event) => calendarEventOccursOn(event, calendarAnchor) && isBirthdayEvent(event));
    if (!hasBirthday || openedBirthdayDate.current === dateKey) return;
    openedBirthdayDate.current = dateKey;
    setCelebratingBirthdayDate(dateKey);
    const timer = window.setTimeout(() => setCelebratingBirthdayDate((date) => date === dateKey ? null : date), 3000);
    return () => window.clearTimeout(timer);
  }, [view, calendarAnchor, visibleCalendarEvents]);

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

  function oneHourLater(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    const end = new Date(2000, 0, 1, hours, minutes + 60);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  function applyVoiceCommand(command: string) {
    const parsed = parseVoiceCommand(command, members, sharedLists);
    if (!parsed) {
      setVoiceMessage("I couldn’t identify what to add. Try naming a section, like “add batteries to the wishlist.”");
      return;
    }

    setVoiceCommand("");
    if (parsed.section === "calendar") {
      const date = parsed.date ?? localDateInputValue(new Date());
      const time = parsed.time ?? "09:00";
      setActiveTab("calendar");
      setNewItem(parsed.title);
      setEventDate(date);
      setEventTime(time);
      setEventEndTime(oneHourLater(time));
      setEventAllDay(!parsed.time);
      setEventLocation("");
      setEventCategory("General");
      setEventMemberIds(parsed.member ? [String(parsed.member.id)] : []);
      setCalendarAnchor(new Date(`${date}T12:00:00`));
      setShowEventForm(true);
      setVoiceMessage(`Calendar form ready for ${parsed.title}. Review it before saving.`);
      return;
    }

    if (parsed.section === "tasks") {
      setActiveTab("tasks");
      setEditingTodo(null);
      setTodoTitle(parsed.title);
      setTodoDueDate(parsed.date ?? "");
      setTodoAssigneeMemberId(parsed.member ? String(parsed.member.id) : "");
      setShowTodoForm(true);
      setVoiceMessage(`To-do form ready for ${parsed.title}. Review it before saving.`);
      return;
    }

    if (parsed.section === "wishlist") {
      setVoiceWishlistDraft({ id: `${Date.now()}`, title: parsed.title, memberId: parsed.member ? String(parsed.member.id) : null });
      setActiveTab("wishlist");
      setVoiceMessage(`Wish-list form ready for ${parsed.title}. Review it before saving.`);
      return;
    }

    if (parsed.section === "lists") {
      if (!parsed.list) {
        setVoiceMessage("I couldn’t find that family list. Try using the list’s exact name.");
        return;
      }
      setVoiceListDraft({ title: parsed.title, listId: String(parsed.list.id) });
      setActiveTab("lists");
      setVoiceMessage(`List item ready for ${parsed.list.title}. Review it before saving.`);
      return;
    }

    if (!parsed.member) {
      setActiveTab("chores");
      setVoiceMessage("Which family member should this chore be assigned to? Try “add a chore for Maya to feed the dog.”");
      return;
    }
    setVoiceChoreDraft({ title: parsed.title, memberId: String(parsed.member.id), routine: parsed.routine ?? "To-do", scheduledFor: parsed.date ?? localDateInputValue(new Date()) });
    setActiveTab("chores");
    setVoiceMessage(`Chore form ready for ${parsed.member.name}. Review it before saving.`);
  }

  function toggleCalendarMemberFilter(memberId: string) {
    setSelectedCalendarMemberIds((ids) => ids.includes(memberId) ? ids.filter((id) => id !== memberId) : [...ids, memberId]);
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

  async function notifyTaskAssignment(targetMemberId: string, title: string, dueDate: string | null) {
    if (!householdId) return;
    const target = members.find((member) => String(member.id) === targetMemberId);
    const result = await requestPushNotification({ event: "task_assigned", householdId, targetMemberId, taskTitle: title, dueDate });
    const targetName = target?.name ?? "the assignee";
    if (result.error) {
      notify(`Task saved, but the notification could not be sent: ${result.error}`, "warning");
      return;
    }
    if (result.sent === 0) {
      notify(`Task saved, but ${targetName} has no active phone notification device.`, "warning");
      return;
    }
    if ((result.failed ?? 0) > 0) {
      notify(`Task saved. The notification reached ${targetName} with ${result.failed} device failure${result.failed === 1 ? "" : "s"}.`, "warning");
      return;
    }
    notify(`Task saved and notification sent to ${targetName}.`, "success");
  }

  async function notifyFamilyActivity(activity: "task_created" | "list_created" | "list_item_added", title: string, listTitle?: string, assigneeMemberId?: string | null) {
    if (!householdId) return;
    const result = await requestPushNotification({ event: "family_activity", householdId, activity, title, listTitle, assigneeMemberId });
    if (result.error) {
      notify(`Saved, but the family activity notification could not be sent: ${result.error}`, "warning");
      return;
    }
    if (result.sent === 0) notify("Saved, but no other adult has an active phone notification device.", "warning");
    else if ((result.failed ?? 0) > 0) notify(`Saved, but ${result.failed} family activity notification${result.failed === 1 ? "" : "s"} failed.`, "warning");
  }

  async function saveTodo(event: FormEvent) {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;
    const assigneeMemberId = todoAssigneeMemberId || null;
    const dueAt = todoDueDate ? `${todoDueDate}T12:00:00.000Z` : null;
    const currentMemberId = members.find((member) => user?.id && String(member.userId) === user.id)?.id;
    const changedToAnotherMember = Boolean(assigneeMemberId) && String(assigneeMemberId) !== String(currentMemberId ?? "") && (!editingTodo || String(editingTodo.assigneeMemberId ?? "") !== String(assigneeMemberId));
    if (editingTodo && supabase && householdId) {
      const { error } = await supabase.from("todos").update({ title, assignee_member_id: assigneeMemberId, due_at: dueAt }).eq("id", editingTodo.id).eq("household_id", householdId);
      if (error) { notify(`Could not update this task: ${error.message}`); return; }
      setTodos((items) => items.map((todo) => todo.id === editingTodo.id ? { ...todo, title, due: dueAt ? new Date(dueAt).toLocaleDateString([], { weekday: "short" }) : "", dueAt, assigneeMemberId } : todo));
      if (changedToAnotherMember) void notifyTaskAssignment(String(assigneeMemberId), title, todoDueDate || null);
    } else if (editingTodo) {
      setTodos((items) => items.map((todo) => todo.id === editingTodo.id ? { ...todo, title, due: dueAt ? new Date(dueAt).toLocaleDateString([], { weekday: "short" }) : "", dueAt, assigneeMemberId } : todo));
    } else if (supabase && user && householdId) {
      const { data, error } = await supabase.from("todos").insert({ household_id: householdId, created_by: user.id, title, due_at: dueAt, assignee_member_id: assigneeMemberId }).select("id, assignee_member_id, due_at").single();
      if (error) { notify(`Could not add this task: ${error.message}`); return; }
      if (data) setTodos((items) => [...items, { id: data.id, title, due: data.due_at ? new Date(data.due_at).toLocaleDateString([], { weekday: "short" }) : "", dueAt: data.due_at, done: false, assigneeMemberId: data.assignee_member_id }]);
      if (data && changedToAnotherMember) void notifyTaskAssignment(String(assigneeMemberId), title, todoDueDate || null);
      if (data) void notifyFamilyActivity("task_created", title, undefined, assigneeMemberId);
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

  const refreshCalendarEvents = useCallback(async () => {
    if (!supabase || !householdId) return;
    const [{ data }, { data: assignments }] = await Promise.all([
      loadCalendarEventRows(householdId),
      supabase.from("calendar_event_member_assignments").select("source, external_id, member_ids").eq("household_id", householdId),
    ]);
    const assignmentByEvent = new Map((assignments ?? []).map((assignment) => [`${assignment.source}:${assignment.external_id}`, assignment.member_ids]));
    if (data) setEvents(displayEventsOnce(data.map((event) => ({
      id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, endsAt: event.ends_at, notes: event.notes, location: event.location, category: event.category, allDay: event.all_day, memberIds: assignmentByEvent.get(`${event.source}:${event.external_id}`) ?? event.member_ids, externalId: event.external_id, seriesExternalId: event.series_external_id, source: event.source,
      time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }))));
  }, [householdId]);

  const syncGoogleCalendar = useCallback(async (force = true) => {
    if (!supabase || !householdId || syncingGoogleRef.current) return;
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) { setCalendarMessage("Your session has expired. Please sign in again."); return; }
    syncingGoogleRef.current = true;
    setSyncingGoogle(true);
    try {
      const response = await fetch("/api/google-calendar/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId, force }) });
      const result = await response.json();
      if (!response.ok) {
        if (result.tokenRevoked || result.error === "Google Calendar credentials were not found.") {
          setGoogleConnected(false);
          setCalendarMessage(result.tokenRevoked ? "Google Calendar token revoked. Tap Connect Google to reconnect." : "Google Calendar needs to be reconnected. Tap Connect Google to finish setup.");
        } else setCalendarMessage(result.error ?? "Could not sync Google Calendar.");
        return;
      }
      if (result.needsConnection) { setGoogleConnected(false); setCalendarMessage("Connect Google Calendar first."); return; }
      setGoogleConnected(true);
      await refreshCalendarEvents();
      setCalendarMessage(result.skipped ? "Google Calendar is already up to date." : `Google Calendar synced${result.imported ? ` · ${result.imported} events checked` : ""}.`);
    } catch {
      setCalendarMessage("Google Calendar could not be reached right now. Your family home is still available.");
    } finally {
      syncingGoogleRef.current = false;
      setSyncingGoogle(false);
    }
  }, [householdId, refreshCalendarEvents]);

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
    void checkAndRefreshGoogleCalendar().catch(() => {
      setCalendarMessage("Google Calendar could not be checked right now. Your family home is still available.");
    });
  }, [householdId, syncGoogleCalendar]);

  async function toggleGoogleCalendar(connection: GoogleConnection) {
    if (connection.enabled) {
      if (!await confirm(`Remove “${connection.name}” and all of its imported events from this family calendar? This will not change anything in Google.`, { title: "Remove calendar?", destructive: true })) return;
      if (!supabase || !householdId) return;
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) { notify("Your session has expired. Please sign in again."); return; }
      setGoogleConnections((items) => items.filter((item) => item.id !== connection.id));
      const response = await fetch("/api/google-calendar/remove", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId, connectionId: connection.id }) });
      const result = await response.json();
      if (!response.ok) { setGoogleConnections((items) => [...items, connection]); notify(result.error ?? "Could not remove Google Calendar."); return; }
      await refreshCalendarEvents();
      setCalendarMessage(`${connection.name} and its imported events were removed.`);
      return;
    }
    const enabled = !connection.enabled;
    setGoogleConnections((items) => items.map((item) => item.id === connection.id ? { ...item, enabled } : item));
    if (supabase) {
      const { error } = await supabase.from("google_calendar_connections").update({ enabled }).eq("id", connection.id);
      if (error) { setGoogleConnections((items) => items.map((item) => item.id === connection.id ? connection : item)); notify(error.message); }
    }
  }

  async function syncAppleCalendar(feedId?: string) {
    if (!supabase || !householdId) return;
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) { setCalendarMessage("Your session has expired. Please sign in again."); return; }
    const response = await fetch("/api/calendar-feeds/sync", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ householdId, feedId }) });
    const result = await response.json();
    if (!response.ok) { notify(result.error ?? "Could not sync Apple Calendar."); return; }
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
    if (error) { notify(error.message); return; }
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
      if (error) { setAppleFeeds((feeds) => feeds.map((item) => item.id === feed.id ? feed : item)); notify(error.message); }
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

  const deleteTodo = useCallback(async (id: string | number) => {
    const target = todos.find((todo) => todo.id === id);
    if (!target || !await confirm(`Permanently delete “${target.title}”?`, { title: "Delete task?", destructive: true })) return;
    setTodos((items) => items.filter((todo) => todo.id !== id));
    if (supabase && householdId) {
      const { error } = await supabase.from("todos").delete().eq("id", id).eq("household_id", householdId);
      if (error) {
        setTodos((items) => [...items, target]);
        notify(`Could not delete this task: ${error.message}`);
      }
    }
  }, [confirm, householdId, notify, todos]);

  useEffect(() => {
    const handleTaskDeletion: EventListener = (event) => {
      void deleteTodo((event as unknown as CustomEvent<string | number>).detail);
    };
    window.addEventListener("family-delete-todo", handleTaskDeletion);
    return () => window.removeEventListener("family-delete-todo", handleTaskDeletion);
  }, [deleteTodo]);

  async function addChore(memberId: string | number, routine: string, titleOverride?: string, scheduledForOverride?: string | null, rewardOverride?: number, options: ChoreCreationOptions = {}) {
    if (routine === "Weekend" && titleOverride === undefined) {
      setWeekendChoreDraft({ memberId: String(memberId), title: "", reward: choreRewardMode === "money" ? "5" : "1" });
      return;
    }
    const title = titleOverride ?? await prompt("What should this chore be called?", "", { title: "Add a chore", confirmLabel: "Add chore" });
    if (!title?.trim() || !householdId) return;
    const emoji = choreIcon(title);
    const isDaily = options.isDaily ?? false;
    const isFixed = options.isFixed ?? isDaily;
    const scheduledFor = isDaily || routine === "To-do" ? null : options.scheduledFor ?? scheduledForOverride ?? new Date().toLocaleDateString("en-CA");
    const sortOrder = Math.max(0, ...chores.filter((chore) => String(chore.assigneeMemberId) === String(memberId) && chore.routine === routine).map((chore) => chore.sortOrder)) + 1;
    const rewardCents = routine === "Weekend" && choreRewardMode === "money" ? rewardOverride ?? 0 : isDaily ? 5 : 50;
    const rewardStars = routine === "Weekend" && choreRewardMode === "stars" ? rewardOverride ?? 1 : 1;
    if (supabase) {
      const { data, error } = await supabase.from("chores").insert({ household_id: householdId, assignee_member_id: memberId, title: title.trim(), emoji, sort_order: sortOrder, routine, is_daily: isDaily, is_fixed: isFixed, scheduled_for: scheduledFor, reward_cents: rewardCents, reward_stars: rewardStars }).select("id, title, emoji, assignee_member_id, sort_order, routine, is_daily, is_fixed, scheduled_for, reward_cents, reward_stars").single();
      if (error) { notify(error.message); return; }
      if (data) setChores((items) => [...items, { id: data.id, title: data.title, emoji: data.emoji, assigneeMemberId: data.assignee_member_id, sortOrder: data.sort_order, routine: data.routine, isDaily: data.is_daily, isFixed: data.is_fixed ?? isFixed, scheduledFor: data.scheduled_for, rewardCents: data.reward_cents ?? rewardCents, rewardStars: data.reward_stars ?? rewardStars }]);
    } else setChores((items) => [...items, { id: Date.now().toString(), title: title.trim(), emoji, assigneeMemberId: memberId, sortOrder, routine, isDaily, isFixed, scheduledFor, rewardCents, rewardStars }]);
  }

  async function reorderChores(choreIds: Array<string | number>) {
    const previousChores = chores;
    const nextSortOrders = new Map(choreIds.map((choreId, index) => [String(choreId), index + 1]));
    setChores((items) => items.map((chore) => nextSortOrders.has(String(chore.id)) ? { ...chore, sortOrder: nextSortOrders.get(String(chore.id)) ?? chore.sortOrder } : chore));
    if (!supabase || !householdId) return;
    const results = await Promise.all(choreIds.map((choreId, index) => supabase!.from("chores").update({ sort_order: index + 1 }).eq("id", choreId).eq("household_id", householdId)));
    const error = results.find((result) => result.error)?.error;
    if (error) {
      setChores(previousChores);
      notify(`Could not save the chore order: ${error.message}`);
    }
  }


  async function toggleChore(chore: ChoreEntry) {
    const choreKey = String(chore.id);
    if (chore.completionId || completingChoreIdsRef.current.has(choreKey)) return;
    completingChoreIdsRef.current.add(choreKey);
    const choreCard = document.querySelector<HTMLElement>(`[data-chore-id="${String(chore.id)}"]`);
    choreCard?.setAttribute("data-completing", "true");
    const finishCheckboxAnimation = () => new Promise<void>((resolve) => window.setTimeout(() => {
      choreCard?.removeAttribute("data-completing");
      resolve();
    }, 700));
    let earnedRewardCents = chore.rewardCents;
    if (supabase) {
      const { data, error } = await supabase.from("chore_completions").insert({ chore_id: chore.id, member_id: chore.assigneeMemberId }).select("id, reward_cents, reward_stars").single();
      if (error) { choreCard?.removeAttribute("data-completing"); completingChoreIdsRef.current.delete(choreKey); notify(error.message); return; }
      earnedRewardCents = data?.reward_cents ?? chore.rewardCents;
      await finishCheckboxAnimation();
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: data?.id, completedRewardCents: data?.reward_cents ?? chore.rewardCents, completedRewardStars: data?.reward_stars ?? chore.rewardStars } : item));
    } else {
      await finishCheckboxAnimation();
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: Date.now().toString(), completedRewardCents: chore.rewardCents, completedRewardStars: chore.rewardStars } : item));
    }
    if (chore.assigneeMemberId !== null) {
      const childKey = String(chore.assigneeMemberId);
      setChoreEarnedCentsByMember((items) => ({ ...items, [childKey]: (items[childKey] ?? 0) + earnedRewardCents }));
    }
    completingChoreIdsRef.current.delete(choreKey);
    setCelebratingChoreId(chore.id);
    window.setTimeout(() => setCelebratingChoreId((id) => id === chore.id ? null : id), 2200);
  }

  async function addSharedList() {
    const title = await prompt("What should this shared list be called?", "", { title: "Add a shared list", confirmLabel: "Add list" });
    if (!title?.trim() || !householdId || !user) return;
    const icon = listIcon(title);
    if (supabase) {
      const { data, error } = await supabase.from("lists").insert({ household_id: householdId, created_by: user.id, title: title.trim(), icon }).select("id, title, icon").single();
      if (error) { notify(error.message); return; }
      if (data) setSharedLists((items) => items.some((item) => String(item.id) === String(data.id)) ? items : [...items, { ...data, items: [] }]);
      if (data) void notifyFamilyActivity("list_created", data.title);
    } else setSharedLists((items) => [...items, { id: Date.now().toString(), title: title.trim(), icon, items: [] }]);
  }

  async function addListItem(listId: string | number, titleOverride?: string) {
    const title = titleOverride ?? await prompt("What should this list item say?", "", { title: "Add a list item", confirmLabel: "Add item" });
    if (!title?.trim()) return;
    const list = sharedLists.find((item) => String(item.id) === String(listId));
    if (supabase) {
      const { data, error } = await supabase.from("list_items").insert({ list_id: listId, title: title.trim() }).select("id, title, completed").single();
      if (error) { notify(error.message); return; }
      if (data) setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.some((item) => String(item.id) === String(data.id)) ? list.items : [...list.items, { id: data.id, title: data.title, done: data.completed }] } : list));
      if (data) void notifyFamilyActivity("list_item_added", data.title, list?.title);
    } else setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: [...list.items, { id: Date.now().toString(), title: title.trim(), done: false }] } : list));
  }

  async function toggleListItem(listId: string | number, itemId: string | number) {
    const item = sharedLists.find((list) => list.id === listId)?.items.find((entry) => entry.id === itemId);
    if (!item) return;
    const done = !item.done;
    setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.map((entry) => entry.id === itemId ? { ...entry, done } : entry) } : list));
    if (supabase) {
      const { error } = await supabase.from("list_items").update({ completed: done }).eq("id", itemId);
      if (error) {
        setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.map((entry) => entry.id === itemId ? { ...entry, done: item.done } : entry) } : list));
        notify(`Could not update this list item: ${error.message}`);
      }
    }
  }

  async function deleteListItem(listId: string | number, itemId: string | number) {
    const item = sharedLists.find((list) => list.id === listId)?.items.find((entry) => entry.id === itemId);
    if (!item || !await confirm(`Delete “${item.title}”?`, { title: "Delete list item?", destructive: true })) return;
    setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: list.items.filter((entry) => entry.id !== itemId) } : list));
    if (supabase) {
      const { error } = await supabase.from("list_items").delete().eq("id", itemId);
      if (error) {
        setSharedLists((lists) => lists.map((list) => list.id === listId ? { ...list, items: [...list.items, item] } : list));
        notify(`Could not delete this item: ${error.message}`);
      }
    }
  }

  async function deleteSharedList(list: SharedList) {
    if (!await confirm(`Delete “${list.title}” and all of its items?`, { title: "Delete list?", destructive: true })) return;
    setSharedLists((items) => items.filter((item) => item.id !== list.id));
    if (supabase) {
      const { error } = await supabase.from("lists").delete().eq("id", list.id);
      if (error) { setSharedLists((items) => [...items, list]); notify(`Could not delete this list: ${error.message}`); }
    }
  }

  async function toggleListExpanded(kind: ListKind, listId: string | number) {
    const key = listPreferenceKey(kind, listId);
    const previous = expandedListKeys[key] ?? false;
    const expanded = !previous;
    setExpandedListKeys((current) => ({ ...current, [key]: expanded }));
    if (!supabase || !user) return;
    const { error } = await supabase.from("user_list_preferences").upsert(
      { user_id: user.id, list_key: key, expanded, updated_at: new Date().toISOString() },
      { onConflict: "user_id,list_key" },
    );
    if (error) {
      setExpandedListKeys((current) => ({ ...current, [key]: previous }));
      notify(`Could not save this list preference: ${error.message}`);
    }
  }

  async function saveEvent(event: Event) {
    const previous = events.find((item) => item.id === event.id);
    setEvents((items) => items.map((item) => item.id === event.id ? event : item));
    if (supabase && householdId) {
      if (event.externalId && (event.source === "google" || event.source === "apple") && user) {
        const { error: assignmentError } = await supabase.from("calendar_event_member_assignments").upsert({ household_id: householdId, created_by: user.id, source: event.source, external_id: event.externalId, member_ids: event.memberIds ?? [] }, { onConflict: "household_id,source,external_id" });
        if (assignmentError) notify(`The event was saved, but its sync-proof assignment could not be stored. Run the calendar assignment migration, then save it again. Details: ${assignmentError.message}`);
      }
      const { error } = await supabase.from("events").update({ title: event.title, starts_at: event.startsAt, ends_at: event.endsAt ?? null, all_day: event.allDay ?? false, location: event.location ?? null, category: event.category ?? "General", category_override: true, member_ids: event.memberIds ?? [], member_ids_override: Boolean(event.seriesExternalId) }).eq("id", event.id).eq("household_id", householdId);
      if (error) {
        if (previous) setEvents((items) => items.map((item) => item.id === previous.id ? previous : item));
        notify(`Could not save this event: ${error.message}`);
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
    if (seriesEventsError) { notify(`Could not update the recurring event: ${seriesEventsError.message}`); await refreshCalendarEvents(); return; }
    const externalIds = (seriesEvents ?? []).map((seriesEvent) => seriesEvent.external_id).filter((externalId): externalId is string => Boolean(externalId));
    if (externalIds.length) {
      const { error: clearEventAssignmentsError } = await supabase.from("calendar_event_member_assignments").delete().eq("household_id", householdId).eq("source", event.source).in("external_id", externalIds);
      if (clearEventAssignmentsError) { notify(`Could not update the recurring event: ${clearEventAssignmentsError.message}`); await refreshCalendarEvents(); return; }
    }
    const { error: assignmentError } = await supabase.from("calendar_series_member_assignments").upsert({ household_id: householdId, created_by: user.id, source: event.source, series_external_id: event.seriesExternalId, member_ids: memberIds }, { onConflict: "household_id,source,series_external_id" });
    if (assignmentError) { notify(`Could not update the recurring event: ${assignmentError.message}`); await refreshCalendarEvents(); return; }
    const { error: eventError } = await supabase.from("events").update({ member_ids: memberIds, member_ids_override: false }).eq("household_id", householdId).eq("source", event.source).eq("series_external_id", event.seriesExternalId);
    if (eventError) { notify(`The recurring assignment was saved, but some current events could not be updated: ${eventError.message}`); }
    await refreshCalendarEvents();
  }

  async function deleteEvent(event: Event) {
    const imported = event.source === "google" || event.source === "apple";
    if (!await confirm(imported ? `Remove “${event.title}” from this app? It will return on a later calendar sync while it still exists in ${event.source === "google" ? "Google" : "iCloud"}.` : `Delete “${event.title}”? This can’t be undone.`, { title: imported ? "Remove calendar event?" : "Delete event?", destructive: true })) return;
    setEvents((items) => items.filter((item) => item.id !== event.id));
    setEditingEvent(null);
    if (supabase && householdId) {
      const { error } = await supabase.from("events").delete().eq("id", event.id).eq("household_id", householdId);
      if (error) {
        setEvents((items) => [...items, event].sort((first, second) => new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()));
        notify(`Could not delete this event: ${error.message}`);
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

  const settingsActions = createSettingsActions({
    householdId,
    user,
    members,
    events,
    chores,
    choreRewardMode,
    choreEarnedCentsByMember,
    chorePaidOutCentsByMember,
    showChoresTab,
    showWishlistTab,
    activeTab,
    notify,
    confirm,
    prompt,
    setMembers,
    setEvents,
    setTodos,
    setChores,
    setEventMemberIds,
    setSelectedCalendarMemberIds,
    setChoreRewardMode,
    setChoreEarnedCentsByMember,
    setChorePaidOutCentsByMember,
    setShowChoresTab,
    setShowWishlistTab,
    setActiveTab: (tab) => setActiveTab(tab),
    setHouseholdId,
    setHouseholdName,
  });

  useEffect(() => {
    const handleChoreEmojiUpdate: EventListener = (event) => {
      const detail = (event as unknown as CustomEvent<{ choreId: string | number; emoji: string }>).detail;
      const chore = chores.find((item) => String(item.id) === String(detail?.choreId));
      if (chore && detail?.emoji) void settingsActions.updateChoreEmoji(chore, detail.emoji);
    };
    window.addEventListener("family-update-chore-emoji", handleChoreEmojiUpdate);
    return () => window.removeEventListener("family-update-chore-emoji", handleChoreEmojiUpdate);
  }, [chores, settingsActions]);

  function navigateToTab(tab: HomeTab) {
    if (tab !== "settings" && window.location.hash.startsWith("#settings-")) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
    setActiveTab(tab);
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }

  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] text-slate-500">Connecting your family home…</main>;
  if (supabase && !user) return <AuthScreen onAuthenticated={setUser} invitePending={Boolean(inviteToken)} />;
  if (supabase && user && dataReady && !householdId) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] p-6 text-slate-900"><section className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><span className="text-5xl">🏠</span>{inviteMessage ? <><h1 className="mt-5 text-2xl font-bold">We couldn&apos;t join this home</h1><p className="mt-2 text-slate-500">{inviteMessage}</p><button onClick={() => void settingsActions.signOut()} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Sign in with the invited email</button></> : <><h1 className="mt-5 text-2xl font-bold">Create your family home</h1><p className="mt-2 text-slate-500">This private space will hold your shared calendar, chores, and adult to-dos.</p><button onClick={settingsActions.createHousehold} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Create household</button></>}</section></main>;

  if (screenSaver) return <Screensaver onExit={() => setScreenSaver(false)} />;
  if (seasonalScreenSaver) return <SeasonalScreensaver onExit={() => setSeasonalScreenSaver(false)} />;
  if (supabase && user && householdId && householdDataLoading && !householdDataLoaded) return <main aria-busy="true" className="grid min-h-screen place-items-center bg-[#f8f7ff] p-6 text-slate-900"><section className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Your family home</p><h1 className="mt-4 text-2xl font-bold">Getting everything ready…</h1><p className="mt-2 text-slate-500">Loading your calendar, tasks, chores, lists, and family check-ins.</p></section></main>;
  if (supabase && user && householdId && householdDataError && !householdDataLoaded) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] p-6 text-slate-900"><section role="alert" className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Couldn&apos;t load your home</p><h1 className="mt-4 text-2xl font-bold">Let&apos;s try that again</h1><p className="mt-2 text-slate-500">{householdDataError}</p><button onClick={() => setHouseholdDataRetryKey((key) => key + 1)} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">Try again</button></section></main>;

  const visibleNavigationTabs = navigationTabs.filter(([tab]) => tab !== "chores" || showChoresTab).filter(([tab]) => tab !== "wishlist" || showWishlistTab);
  const celebrationActive = celebratingTaskId !== null || celebratingBirthdayDate !== null || celebratingChoreId !== null;

  return (
    <main ref={mainRef} inert={celebrationActive || undefined} className={`${dark ? "dark " : ""}h-dvh overflow-x-hidden overflow-y-auto overscroll-y-auto`}>
      <div className={`relative min-h-full transition-colors lg:pl-24 ${activeTab === "wishlist" ? "christmas-home-shell text-white" : "bg-[#f8f7ff] text-slate-900 dark:bg-[#151522] dark:text-slate-100"}`}>
        {activeTab === "wishlist" && <div className="christmas-pine-scene pointer-events-none absolute inset-0 z-0" aria-hidden="true" />}
        <HomeNavigation tabs={visibleNavigationTabs} activeTab={activeTab} onNavigate={navigateToTab} />
        <HomeHeader householdName={householdName} activeTab={activeTab} dark={dark} voiceCommand={voiceCommand} onVoiceCommandChange={(value) => { setVoiceCommand(value); setVoiceMessage(""); }} onVoiceCommandComplete={(value) => { setVoiceCommand(""); applyVoiceCommand(value); }} onScreenSaver={() => setScreenSaver(true)} onToggleTheme={() => updateThemeMode(dark ? "light" : "dark")} />
        {householdDataError && householdDataLoaded && <div role="alert" className="mx-auto mt-4 flex w-[calc(100%-2.5rem)] max-w-[1800px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 md:w-[calc(100%-4.5rem)]"><span>We couldn&apos;t refresh all of your family home data.</span><button onClick={() => setHouseholdDataRetryKey((key) => key + 1)} className="rounded-lg px-3 py-1.5 font-bold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">Try again</button></div>}
        {householdDataLoading && householdDataLoaded && <p role="status" className="mx-auto mt-4 w-[calc(100%-2.5rem)] max-w-[1800px] text-sm text-slate-500 md:w-[calc(100%-4.5rem)]">Refreshing your family home…</p>}
        {voiceMessage && <p role="status" className="sr-only">{voiceMessage}</p>}
        {(activeTab === "home" || activeTab === "calendar") ? <div className="mx-auto w-full min-w-0 max-w-[1800px] space-y-5 px-5 pb-24 md:px-9 lg:pb-8">{activeTab === "home" && <HomeDashboard weather={weather} weatherForecast={weatherForecast} weatherInsights={weatherInsights} onOpenWeatherForecast={() => setShowWeatherForecast(true)} dark={dark} sunTimes={sunTimes} auroraActivity={auroraActivity} cometCloseApproach={cometCloseApproach} openTodos={openTodos} members={members} visibleCalendarEvents={visibleCalendarEvents} onAddTodo={addTodo} onToggleTodo={toggleTodo} onOpenTasks={() => setActiveTab("tasks")} onOpenCalendar={() => setActiveTab("calendar")} onOpenCalendarDay={(day) => { setCalendarAnchor(day); setView("Day"); setActiveTab("calendar"); }} onOpenEvent={setSelectedEvent} moodCheckins={moodCheckins} moodMemberId={moodMemberId} selectedMood={selectedMood} savingMood={savingMood} moodMessage={moodMessage} onMoodMemberChange={(memberId) => { setMoodMemberId(memberId); setSelectedMood(moodCheckins.find((checkin) => String(checkin.memberId) === memberId)?.mood ?? "good"); setMoodMessage(""); }} onMoodChange={setSelectedMood} onSaveMood={saveMoodCheckin} calendarAnchor={calendarAnchor} />}
          {activeTab === "calendar" && <CalendarPage anchor={calendarAnchor} events={visibleCalendarEvents} members={members} calendarMessage={calendarMessage} hasCalendarConnection={googleConnected || appleFeeds.some((feed) => feed.enabled)} syncingGoogle={syncingGoogle} onSync={() => googleConnected || appleFeeds.some((feed) => feed.enabled) ? syncAllCalendars() : connectGoogleCalendar()} view={view} onViewChange={(value) => setView(value)} onAnchorChange={setCalendarAnchor} selectedMemberIds={selectedCalendarMemberIds} showFamilyEvents={showFamilyEvents} onToggleMember={toggleCalendarMemberFilter} onToggleFamily={() => setShowFamilyEvents((visible) => !visible)} onEditEvent={setSelectedEvent} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} onCreateEvent={openEventFormAt} showEventForm={showEventForm} onShowEventForm={() => setShowEventForm(true)} onCloseEventForm={() => setShowEventForm(false)} onSubmitEvent={addEvent} title={newItem} onTitleChange={setNewItem} eventDate={eventDate} onDateChange={setEventDate} eventTime={eventTime} onTimeChange={setEventTime} eventEndTime={eventEndTime} onEndTimeChange={setEventEndTime} eventAllDay={eventAllDay} onAllDayChange={setEventAllDay} eventCategory={eventCategory} onCategoryChange={setEventCategory} eventLocation={eventLocation} onLocationChange={setEventLocation} eventMemberIds={eventMemberIds} onToggleEventMember={(memberId) => setEventMemberIds((ids) => ids.includes(memberId) ? ids.filter((item) => item !== memberId) : [...ids, memberId])} />}
        </div> : activeTab === "tasks" ? <TasksPage todos={todos} members={members} onAdd={addTodo} onToggle={toggleTodo} onEdit={editTodo} /> : activeTab === "chores" ? <ChoresPage members={members} chores={chores} choreRewardMode={choreRewardMode} choreRewardTargetCents={choreRewardTargetCents} choreRewardTargetStars={choreRewardTargetStars} earnedCentsByMember={choreEarnedCentsByMember} paidOutCentsByMember={chorePaidOutCentsByMember} celebratingChoreId={celebratingChoreId} onToggle={toggleChore} /> : activeTab === "wishlist" ? <ChristmasWishlistPage voiceDraft={voiceWishlistDraft} /> : activeTab === "settings" ? <SettingsPage choreRewardMode={choreRewardMode} earnedCentsByMember={choreEarnedCentsByMember} paidOutCentsByMember={chorePaidOutCentsByMember} onPayOut={settingsActions.recordChorePayout} onResetToday={settingsActions.resetTodayChoreCompletions} onClearAll={settingsActions.clearAllChoreIncentiveTotals} onAddChore={addChore} onDeleteChore={settingsActions.deleteChore} onRewardModeChange={settingsActions.updateChoreRewardMode} chores={chores} onUpdateChore={settingsActions.updateChore} onReorderChores={reorderChores} members={members} currentUserId={user?.id ?? null} onMemberColorChange={settingsActions.updateMemberColor} onAddMember={settingsActions.addMember} onRemoveMember={settingsActions.removeMember} onUpdateCurrentMemberName={settingsActions.updateCurrentMemberName} themeMode={themeMode} onThemeModeChange={updateThemeMode} showChoresTab={showChoresTab} showWishlistTab={showWishlistTab} onTabVisibilityChange={settingsActions.updateTabVisibility} googleConnections={googleConnections} appleFeeds={appleFeeds} onConnect={connectGoogleCalendar} onToggleConnection={toggleGoogleCalendar} onAddApple={addAppleCalendar} onToggleApple={toggleAppleCalendar} onInviteAdult={settingsActions.inviteAdult} onSignOut={settingsActions.signOut} /> : <ListsPage lists={sharedLists} expandedListKeys={expandedListKeys} onToggleListExpanded={toggleListExpanded} onAddList={addSharedList} onAddItem={addListItem} onToggleItem={toggleListItem} onDeleteItem={deleteListItem} onDeleteList={deleteSharedList} />}
      </div>
      <HomeOverlays weather={weather} weatherForecast={weatherForecast} weatherInsights={weatherInsights} showWeatherForecast={showWeatherForecast} onCloseWeatherForecast={() => setShowWeatherForecast(false)} selectedEvent={selectedEvent} members={members} onCloseSelectedEvent={() => setSelectedEvent(null)} onEditSelectedEvent={() => { if (!selectedEvent) return; setEditingEvent(selectedEvent); setSelectedEvent(null); }} editingEvent={editingEvent} onCloseEditingEvent={() => setEditingEvent(null)} onSaveEvent={saveEvent} onApplySeries={applySeriesMembers} onDeleteEvent={deleteEvent} showTodoForm={showTodoForm} todoTitle={todoTitle} todoDueDate={todoDueDate} todoAssigneeMemberId={todoAssigneeMemberId} editingTodo={editingTodo} onTodoTitleChange={setTodoTitle} onTodoDueDateChange={setTodoDueDate} onTodoAssigneeChange={setTodoAssigneeMemberId} onCloseTodoForm={() => { setEditingTodo(null); setShowTodoForm(false); }} onSaveTodo={saveTodo} voiceChoreDraft={voiceChoreDraft} onCloseVoiceChore={() => setVoiceChoreDraft(null)} onSaveVoiceChore={async (draft) => { await addChore(draft.memberId, draft.routine, draft.title, draft.scheduledFor); setVoiceChoreDraft(null); }} weekendChoreDraft={weekendChoreDraft} choreRewardMode={choreRewardMode} onCloseWeekendChore={() => setWeekendChoreDraft(null)} onSaveWeekendChore={async (draft) => { await addChore(draft.memberId, "Weekend", draft.title, new Date().toLocaleDateString("en-CA"), draft.reward); setWeekendChoreDraft(null); }} voiceListDraft={voiceListDraft} sharedLists={sharedLists} onCloseVoiceList={() => setVoiceListDraft(null)} onSaveVoiceList={async (draft) => { await addListItem(draft.listId, draft.title); setVoiceListDraft(null); }} celebratingTask={celebratingTaskId !== null} celebratingBirthday={celebratingBirthdayDate !== null} />
    </main>
  );
}
