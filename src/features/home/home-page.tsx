"use client";

import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Lottie } from "lottie-react";
import { supabase } from "@/lib/supabase";
import {
  type AppleFeed,
  type ChoreEntry,
  type Event,
  type GoogleConnection,
  type Member,
  type MoodCheckin,
  type MoodKey,
  type SharedList,
  type SharedListItem,
  type ThemeMode,
  type Todo,
  type Weather,
  choreIcon,
  choreRoutines,
  defaultMemberColor,
  displayEventsOnce,
  familyHolidaysForYear,
  isHexColor,
  isMoodKey,
  isVisibleRoutineChore,
  memberColorOptions,
  listIcon,
  listVisualIcon,
  localDateInputValue,
  moodOption,
  notoIconPath,
  pickCelebrationAnimation,
  starterEvents,
  timeGreeting,
  weatherAnimation,
  weatherOrbClass,
  weatherSummary,
} from "@/features/home/model";
import { AppIcon, NotoEmoji } from "@/components/home/shared-ui";
import { eventOccursOn as calendarEventOccursOn, isBirthdayEvent, memberCalendarColor, shiftCalendar } from "@/components/home/calendar";
import {
  CalendarPersonFilter,
  DayCalendar,
  EventDetails,
  EventEditor,
  MonthGrid,
  PhoneHomeCalendar,
  WeekCalendar,
} from "@/components/home/calendar";
import { FamilyMoodCard } from "@/components/home/mood";
import { AuthScreen, Screensaver, SeasonalScreensaver, TaskEditor, TasksPage } from "@/components/home/task-components";
import ChristmasWishlistPage from "@/features/christmas-wishlist/christmas-wishlist-page";

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
  const [activeTab, setActiveTab] = useState<"home" | "calendar" | "tasks" | "chores" | "lists" | "wishlist" | "settings">("home");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [celebratingBirthdayDate, setCelebratingBirthdayDate] = useState<string | null>(null);
  const openedBirthdayDate = useRef<string | null>(null);
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [selectedCalendarMemberIds, setSelectedCalendarMemberIds] = useState<string[]>([]);
  const [showFamilyEvents, setShowFamilyEvents] = useState(false);
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
      // Browser-only auth initialization.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // Browser-only URL initialization.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="min-h-full bg-[#f8f7ff] text-slate-900 transition-colors dark:bg-[#151522] dark:text-slate-100 lg:pl-24">
        <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#1c1c2b]/95 md:flex md:justify-around md:p-2 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-24 lg:border-r lg:border-t-0 lg:px-2 lg:py-4">
          <nav className="grid min-w-0 grid-cols-7 gap-1 md:flex md:flex-1 md:justify-around lg:mt-6 lg:flex-col lg:justify-start">{([ ["home", "home", "Home"], ["calendar", "calendar", "Calendar"], ["tasks", "tasks", "Tasks"], ["chores", "chores", "Chores"], ["lists", "lists", "Lists"], ["wishlist", "wishlist", "Wish lists"], ["settings", "settings", "Settings"] ] as const).map(([tab, icon, label]) => <button key={tab} onClick={() => setActiveTab(tab)} title={label} className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-bold transition-colors md:min-h-0 md:flex-1 md:rounded-2xl md:px-3 lg:w-full lg:flex-none lg:px-1 ${activeTab === tab ? "bg-violet-600 text-white shadow-md" : "text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10"}`}><AppIcon name={icon} className="size-5"/><span className="hidden max-w-full truncate lg:block">{label}</span></button>)}</nav>
        </aside>
        <header className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-5 md:px-9">
          <div className="flex items-center gap-3"><div className="hidden size-11 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300/50 md:grid lg:hidden"><AppIcon name="home" className="size-5"/></div><div><h1 className="text-xl font-bold tracking-tight">{householdName}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => setScreenSaver(true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">Photos</button><button onClick={() => updateThemeMode(dark ? "light" : "dark")} className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:ring-white/10"><AppIcon name={dark ? "sun" : "moon"} className="size-4"/>{dark ? "Light" : "Dark"}</button></div>
        </header>
        {(activeTab === "home" || activeTab === "calendar") ? <div className="mx-auto w-full min-w-0 max-w-[1800px] space-y-5 px-5 pb-24 md:px-9 lg:pb-8">{activeTab === "home" && <>
          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
            <article className="relative w-full max-md:max-w-[22rem] md:max-w-none overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#7dd3fc] via-[#60a5fa] to-[#818cf8] p-5 text-white shadow-lg shadow-sky-200/50 max-md:min-h-40 max-md:p-5 md:max-lg:min-h-40 md:max-lg:p-5 md:p-6"><span className={`absolute -right-5 -top-9 size-28 rounded-full transition-colors duration-500 max-md:-top-6 max-md:size-20 ${weatherOrbClass(weather)}`}/><div className="relative flex h-full min-w-0 items-center justify-between gap-3 max-md:gap-2 md:gap-6 md:max-lg:gap-4"><div className="min-w-0 flex-1"><p title={`${timeGreeting()} · ${weather?.location ?? "LOCAL FORECAST"}`} className="break-words text-xs font-bold leading-tight tracking-wide md:max-lg:truncate md:max-lg:text-sm md:text-sm">{timeGreeting()} · {weather?.location ?? "LOCAL FORECAST"}</p><p className="mt-2 text-4xl font-black tracking-tighter max-md:text-3xl md:max-lg:text-5xl md:text-5xl">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-semibold leading-snug text-white/90 md:max-lg:text-base md:text-base">{weather ? `${weather.summary} · ↑ ${weather.high}° ↓ ${weather.low}°` : "Allow location for today’s weather"}</p></div><span className="block size-24 shrink-0 overflow-hidden md:size-40 md:max-lg:size-28">{weather ? <WeatherAnimation weather={weather} /> : <span className="block text-6xl leading-none drop-shadow-sm md:text-8xl">☀️</span>}</span></div></article>
            <article className="min-w-0 overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-rose-500">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={addTodo} className="grid size-8 place-items-center rounded-xl bg-rose-100 text-lg font-bold text-rose-600 hover:bg-rose-200">+</button></div><div className="mt-3 min-w-0 space-y-1">{openTodos.slice(0, 5).map((todo) => { const assignee = members.find((member) => member.id === todo.assigneeMemberId); return <label key={todo.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} className="size-4 accent-rose-500"/><span className="min-w-0 flex-1 truncate font-medium">{todo.title}</span>{assignee && <span className="max-w-24 shrink-0 truncate rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${assignee.color ?? "#fda4af"}33`, color: assignee.color ?? "#be123c" }}>{assignee.name}</span>}</label>; })}{openTodos.length === 0 && <p className="text-sm text-slate-400">You&apos;re all caught up.</p>}</div><button onClick={() => setActiveTab("tasks")} className="mt-2 text-xs font-bold text-violet-600">View all tasks →</button></article>
            <div className="min-w-0 md:hidden"><PhoneHomeCalendar events={visibleCalendarEvents} members={members} onOpenDay={(day) => { setCalendarAnchor(day); setView("Day"); setActiveTab("calendar"); }} onOpenEvent={setSelectedEvent} /></div>
            <FamilyMoodCard members={members} checkins={moodCheckins} selectedMemberId={moodMemberId} selectedMood={selectedMood} saving={savingMood} message={moodMessage} onMemberChange={(memberId) => { setMoodMemberId(memberId); setSelectedMood(moodCheckins.find((checkin) => String(checkin.memberId) === memberId)?.mood ?? "good"); setMoodMessage(""); }} onMoodChange={setSelectedMood} onSave={saveMoodCheckin} />
          </section>
          <section className="hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:block md:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">CALENDAR</p><h2 className="text-xl font-bold">This month</h2></div><button onClick={() => setActiveTab("calendar")} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Open calendar</button></div><div className="mt-4"><MonthGrid anchor={calendarAnchor} events={visibleCalendarEvents} members={members} onOpenDay={(day) => { setCalendarAnchor(day); setView("Day"); setActiveTab("calendar"); }} /></div></section></>}
          {activeTab === "calendar" && <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{calendarAnchor.toLocaleDateString([], { month: "long", year: "numeric" })}</h2><div className="flex flex-wrap items-center gap-2"><button onClick={() => googleConnected || appleFeeds.some((feed) => feed.enabled) ? syncAllCalendars() : connectGoogleCalendar()} disabled={syncingGoogle} className="rounded-xl border border-violet-200 px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200">{syncingGoogle ? "Syncing…" : googleConnected || appleFeeds.some((feed) => feed.enabled) ? "Sync all" : "Connect Google"}</button><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div></div>
            {calendarMessage && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-100">{calendarMessage}</p>}
            <div className="mb-4 flex items-center justify-between"><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, -1))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10"><AppIcon name="chevronLeft" className="size-4"/>Previous</button><button onClick={() => setCalendarAnchor(new Date())} className="rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10">Today</button><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, 1))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10">Next<AppIcon name="chevronRight" className="size-4"/></button></div>
            <CalendarPersonFilter members={members} selectedMemberIds={selectedCalendarMemberIds} showFamilyEvents={showFamilyEvents} onToggleMember={toggleCalendarMemberFilter} onToggleFamily={() => setShowFamilyEvents((visible) => !visible)} />
            {view === "Day" ? <DayCalendar date={calendarAnchor} events={visibleCalendarEvents} members={members} onEdit={setSelectedEvent} /> : view === "Week" ? <WeekCalendar anchor={calendarAnchor} events={visibleCalendarEvents} members={members} onEdit={setSelectedEvent} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} onCreate={openEventFormAt} /> : <MonthGrid anchor={calendarAnchor} events={visibleCalendarEvents} members={members} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} onAdd={openEventFormAt} />}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
              {showEventForm ? <form onSubmit={addEvent} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10"><div className="flex items-center justify-between"><p className="font-bold text-violet-800 dark:text-violet-100">Add a family event</p><button type="button" onClick={() => setShowEventForm(false)} className="text-lg font-bold text-violet-500">×</button></div><input required autoFocus value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="What&apos;s happening?" className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-violet-500"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Date<input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Starts<input disabled={eventAllDay} required type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Ends<input disabled={eventAllDay} required type="time" value={eventEndTime} onChange={(event) => setEventEndTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label></div><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Category<select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Location<input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="e.g. Backyard or 123 Main St" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label></div><fieldset className="mt-3"><legend className="text-xs font-bold text-violet-800 dark:text-violet-200">Who is this for?</legend><div className="mt-1 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = eventMemberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-200"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => setEventMemberIds((ids) => selected ? ids.filter((item) => item !== id) : [...ids, id])}/>{member.name}</label>; })}</div></fieldset><div className="mt-4 flex items-center justify-between"><label className="flex gap-2 text-sm font-bold text-violet-800 dark:text-violet-200"><input type="checkbox" checked={eventAllDay} onChange={(event) => setEventAllDay(event.target.checked)} className="size-4 accent-violet-600" />All day</label><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Save event</button></div></form> : <div className="flex justify-center"><button onClick={() => setShowEventForm(true)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">+ Add event</button></div>}
            </div>
          </section>}
        </div> : activeTab === "tasks" ? <TasksPage todos={todos} members={members} onAdd={addTodo} onToggle={toggleTodo} onEdit={editTodo} /> : activeTab === "chores" ? <ChoresPage members={members} chores={chores} celebratingChoreId={celebratingChoreId} onAddChild={addChild} onAddChore={addChore} onToggle={toggleChore} onDeleteChore={deleteChore} onReorder={reorderChores} /> : activeTab === "wishlist" ? <ChristmasWishlistPage /> : activeTab === "settings" ? <SettingsPage members={members} onMemberColorChange={updateMemberColor} onAddMember={addMember} themeMode={themeMode} onThemeModeChange={updateThemeMode} googleConnections={googleConnections} appleFeeds={appleFeeds} onConnect={connectGoogleCalendar} onToggleConnection={toggleGoogleCalendar} onAddApple={addAppleCalendar} onToggleApple={toggleAppleCalendar} onInviteAdult={inviteAdult} /> : <ListsPage lists={sharedLists} onAddList={addSharedList} onAddItem={addListItem} onToggleItem={toggleListItem} onDeleteItem={deleteListItem} onDeleteList={deleteSharedList} />}
      </div>
      {selectedEvent && <EventDetails event={selectedEvent} members={members} onClose={() => setSelectedEvent(null)} onEdit={() => { setEditingEvent(selectedEvent); setSelectedEvent(null); }} />}
      {editingEvent && <EventEditor key={editingEvent.id} event={editingEvent} members={members} onClose={() => setEditingEvent(null)} onSave={saveEvent} onApplySeries={applySeriesMembers} onDelete={deleteEvent} />}
      {showTodoForm && <TaskEditor title={todoTitle} dueDate={todoDueDate} assigneeMemberId={todoAssigneeMemberId} members={members} editing={Boolean(editingTodo)} onTitleChange={setTodoTitle} onDueDateChange={setTodoDueDate} onAssigneeChange={setTodoAssigneeMemberId} onClose={() => { setEditingTodo(null); setShowTodoForm(false); }} onSave={saveTodo} />}
      {celebratingTaskId !== null && <ChoreCelebration animationSrc="/animations/general/completions/Celebrations%20Begin.json" />}
      {celebratingBirthdayDate !== null && <ChoreCelebration animationSrc="/animations/holidays/birthday/birthday.json" />}
    </main>
  );
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
  const sortedChores = [...chores].sort((first, second) => Number(Boolean(first.completionId)) - Number(Boolean(second.completionId)) || first.sortOrder - second.sortOrder);
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
  return <><WeekdayChoresBoard members={members} chores={sortedChores} celebratingChoreId={celebratingChoreId} onAddChild={onAddChild} onAddChore={onAddChore} onToggle={onToggle} onDeleteChore={onDeleteChore} onReorder={onReorder} /><TemporaryRoutineChores members={members} chores={sortedChores} onAddChore={onAddChore} onDeleteChore={onDeleteChore} /></>;
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
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [expandedRoutines, setExpandedRoutines] = useState<Record<string, boolean>>({});
  const isWeekday = new Date().getDay() > 0 && new Date().getDay() < 6;
  const children = members.filter((member) => member.role === "child");
  const routineOrder = currentHour >= 12 ? ["After school", "Before school", "To-do"] : ["Before school", "After school", "To-do"];
  const routines = choreRoutines
    .filter((routine) => isWeekday || routine.id === "To-do")
    .sort((first, second) => routineOrder.indexOf(first.id) - routineOrder.indexOf(second.id));
  const today = new Date().toLocaleDateString("en-CA");
  const sortedChores = chores.filter((chore) => isVisibleRoutineChore(chore, today)).sort((first, second) => Number(Boolean(first.completionId)) - Number(Boolean(second.completionId)) || first.sortOrder - second.sortOrder);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
  }, [chores, expandedRoutines, isWeekday]);

  function finishTouchDrag(event: PointerEvent<HTMLSpanElement>, childId: string | number, routine: string) {
    if (event.pointerType === "mouse" || draggedChoreId === null) return;
    event.preventDefault();
    event.stopPropagation();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-chore-id]");
    if (target?.dataset.childId === String(childId) && target.dataset.routine === routine && target.dataset.choreId) onReorder(childId, routine, draggedChoreId, target.dataset.choreId);
    setDraggedChoreId(null);
  }
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-sky-600">KIDS&apos; CHORES</p><h2 className="text-2xl font-bold">Weekday routines</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">After-school routines move to the top in the afternoon. Tap a routine to collapse or expand it.</p></div><button onClick={onAddChild} className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">+ Add child</button></div>{children.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{children.map((child) => { const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <div key={child.id} className={`rounded-3xl p-5 ${theme}`}><h3 className="text-2xl font-black">{child.name}</h3><div className="mt-5 space-y-5">{routines.map((routine) => { const routineKey = `${child.id}-${routine.id}`; const isExpanded = expandedRoutines[routineKey] ?? (routine.id !== "Before school" || currentHour < 12); const contentId = `routine-${routineKey.toLowerCase().replaceAll(" ", "-")}`; const routineChores = sortedChores.filter((chore) => chore.assigneeMemberId === child.id && chore.routine === routine.id); return <section key={routine.id} className="rounded-2xl bg-white/45 p-3"><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => setExpandedRoutines((current) => ({ ...current, [routineKey]: !isExpanded }))} aria-controls={contentId} aria-expanded={isExpanded} className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl text-left text-sm font-black text-slate-700 hover:bg-white/40"><AppIcon name="chevronRight" className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-90" : ""}`}/><span className="mr-1.5">{routine.icon}</span>{routine.label}</button>{routine.id === "To-do" && <button onClick={() => onAddChore(child.id, routine.id)} aria-label={`Add ${routine.label} chore for ${child.name}`} className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-lg font-bold text-slate-600 shadow-sm">+</button>}</div>{isExpanded && <div id={contentId} className="mt-3 grid gap-3">{routineChores.map((chore) => <div key={chore.id} data-chore-id={String(chore.id)} data-child-id={String(child.id)} data-routine={routine.id} draggable={!chore.completionId && !chore.isFixed} onDragStart={() => !chore.isFixed && setDraggedChoreId(chore.id)} onDragEnd={() => setDraggedChoreId(null)} onDragOver={(event) => { if (!chore.completionId && !chore.isFixed) event.preventDefault(); }} onDrop={() => { if (draggedChoreId !== null && !chore.completionId && !chore.isFixed) onReorder(child.id, routine.id, draggedChoreId, chore.id); setDraggedChoreId(null); }} className={`relative min-w-0 transition ${draggedChoreId === chore.id ? "opacity-45" : ""}`}><button onClick={() => onToggle(chore)} className={`flex min-h-20 w-full items-center gap-2 rounded-2xl bg-white/90 p-3 text-left shadow-sm transition-transform active:scale-[.98] ${chore.completionId ? "opacity-65" : "hover:-translate-y-0.5"}`}><span onPointerDown={(event) => { if (event.pointerType !== "mouse" && !chore.isFixed) { event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraggedChoreId(chore.id); } }} onPointerUp={(event) => finishTouchDrag(event, child.id, routine.id)} onPointerCancel={() => setDraggedChoreId(null)} onClick={(event) => event.stopPropagation()} className={`shrink-0 select-none touch-none text-base leading-none ${chore.isFixed ? "text-transparent" : "cursor-grab text-slate-400 active:cursor-grabbing"}`}>⠿</span><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-3xl shadow-sm">{!chore.emoji || chore.emoji === "✨" ? choreIcon(chore.title) : chore.emoji}</span><span className={`min-w-0 flex-1 text-base font-black leading-tight ${chore.completionId ? "text-slate-400 line-through" : "text-slate-800"}`}>{chore.title}</span><span className={`grid size-9 shrink-0 place-items-center rounded-lg border-2 text-xl font-black ${chore.completionId ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span></button>{celebratingChoreId === chore.id && <ChoreCelebration/>}{!chore.isFixed && <button onClick={() => onDeleteChore(chore)} title={`Delete ${chore.title}`} className="absolute right-1 top-1 rounded-lg p-1.5 text-slate-300 hover:bg-slate-100 hover:text-rose-600"><AppIcon name="trash" className="size-3.5"/></button>}</div>)}{routineChores.length === 0 && <p className="rounded-xl bg-white/50 px-3 py-4 text-center text-xs font-semibold text-slate-600">{routine.id === "To-do" ? "Add an anytime to-do." : isWeekday ? "Routine is ready for the weekday." : "Back on Monday."}</p>}</div>}</section>; })}</div></div>; })}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Add Michael and Lucas (or anyone else) to create their chore boards.</div>}</div></section>;
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
    if (!supabase) {
      // Local/demo mode has no settings PIN.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinMode("unlocked");
      return;
    }
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
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-2xl space-y-5"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS</p><h2 className="text-3xl font-bold">Calendar connections</h2><article className="mt-6 rounded-2xl bg-sky-50 p-5 dark:bg-sky-400/10"><p className="font-bold">Appearance</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Auto follows local sunrise and sunset using the weather location.</p><div className="mt-4 flex flex-wrap gap-2">{([ ["auto", "◐ Auto"], ["light", "☀ Light"], ["dark", "☾ Dark"] ] as const).map(([mode, label]) => <button key={mode} onClick={() => onThemeModeChange(mode)} className={`rounded-xl px-4 py-2 text-sm font-bold ${themeMode === mode ? "bg-sky-600 text-white shadow-sm" : "bg-white text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100 dark:bg-white/10 dark:text-sky-100 dark:ring-white/10"}`}>{label}</button>)}</div></article><article className="mt-5 rounded-2xl bg-violet-50 p-5 dark:bg-violet-400/10"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">Person colors</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Choose a color for each person. It appears on their calendar events and assigned tasks.</p></div><button type="button" onClick={() => { setShowAddPerson((value) => !value); setPersonMessage(""); }} className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700">+ Add person</button></div>{showAddPerson && <form onSubmit={submitNewPerson} className="mt-4 grid gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-violet-100 dark:bg-white/10 dark:ring-white/10 sm:grid-cols-[1fr_9rem_auto]"><label className="text-sm font-bold">Name<input required autoFocus value={newPersonName} onChange={(event) => { setNewPersonName(event.target.value); setPersonMessage(""); }} placeholder="e.g. Grandma" className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800" /></label><label className="text-sm font-bold">Type<select value={newPersonRole} onChange={(event) => setNewPersonRole(event.target.value as Member["role"])} className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800"><option value="child">Child</option><option value="adult">Adult</option></select></label><div className="flex items-end gap-2"><button type="button" onClick={() => { setShowAddPerson(false); setNewPersonName(""); setPersonMessage(""); }} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700">Add</button></div>{personMessage && <p className="sm:col-span-3 text-sm font-semibold text-rose-600">{personMessage}</p>}</form>}<div className="mt-4 grid gap-3 sm:grid-cols-2">{members.map((member, index) => { const currentColor = isHexColor(member.color ?? "") && member.color !== defaultMemberColor ? member.color! : memberCalendarColor(member, index); return <div key={member.id} className="rounded-2xl bg-white/80 p-3 ring-1 ring-violet-100 dark:bg-white/10 dark:ring-white/10"><div className="flex items-center gap-3"><span className="size-8 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: currentColor }} /><div className="min-w-0"><p className="truncate font-bold">{member.name}</p><p className="text-xs text-slate-500 dark:text-slate-300">{member.role === "adult" ? "Adult" : "Child"}</p></div></div><div className="mt-3 flex flex-wrap items-center gap-2">{memberColorOptions.map((color) => <button key={color} type="button" aria-label={`Set ${member.name}'s color`} onClick={() => void onMemberColorChange(member.id, color)} className={`size-7 rounded-full border-2 ${currentColor.toLowerCase() === color ? "border-slate-900 ring-2 ring-white" : "border-white/80 dark:border-white/20"}`} style={{ backgroundColor: color }} />)}<label className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-violet-300 text-xs font-black text-violet-600 dark:border-violet-200 dark:text-violet-200" title={`Choose ${member.name}'s custom color`}><span aria-hidden="true">+</span><input type="color" aria-label={`Choose ${member.name}'s custom color`} value={currentColor} onChange={(event) => void onMemberColorChange(member.id, event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" /></label></div></div>; })}</div>{members.length === 0 && <p className="mt-4 text-sm text-slate-500">No people have been added yet.</p>}</article><article className="mt-5 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-400/10"><p className="font-bold">Invite an adult</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">They&apos;ll get their own login and see this same family home.</p><form onSubmit={inviteAdult} className="mt-4 grid gap-3 sm:grid-cols-2"><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Adult&apos;s email address" className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800"/><input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name, e.g. Matt" className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Create private invite</button></form>{inviteStatus && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{inviteStatus}</p>}</article><article className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold">Google Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose which Google calendars appear in your family calendar.</p></div><button onClick={onConnect} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">{googleConnections.length ? "+ Add Google account" : "Connect Google"}</button></div>{googleConnections.length > 0 && <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">{googleConnections.map((connection) => <label key={connection.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold shadow-sm dark:bg-white/5"><input type="checkbox" checked={connection.enabled} onChange={() => onToggleConnection(connection)} className="size-4 accent-violet-600"/><span className="flex-1">{connection.name}</span><span className={connection.enabled ? "text-emerald-600" : "text-slate-400"}>{connection.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article><article className="mt-5 rounded-2xl bg-rose-50 p-5 dark:bg-rose-400/10"><div><p className="font-bold">Apple / iCloud Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paste a public iCloud calendar link for read-only import.</p></div><form onSubmit={addApple} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><input value={appleName} onChange={(event) => setAppleName(event.target.value)} placeholder="Calendar name" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><input required value={appleUrl} onChange={(event) => setAppleUrl(event.target.value)} placeholder="Paste public iCloud link" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white">Add</button></form>{appleFeeds.length > 0 && <div className="mt-5 space-y-2 border-t border-rose-200 pt-4">{appleFeeds.map((feed) => <label key={feed.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm"><input type="checkbox" checked={feed.enabled} onChange={() => onToggleApple(feed)} className="size-4 accent-rose-500"/><span className="flex-1">{feed.name}</span><span className={feed.enabled ? "text-emerald-600" : "text-slate-400"}>{feed.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article></div></div></section>;
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
