"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Event = { id: string | number; title: string; time: string; person: string; color: string; startsAt: string; endsAt?: string | null; notes?: string | null; location?: string | null; category?: string | null; allDay?: boolean; memberIds?: string[]; generatedHoliday?: boolean };
type Todo = { id: string | number; title: string; due: string; done: boolean; assigneeMemberId?: string | number | null };
type Weather = { temperature: number; high: number; low: number; summary: string; location: string };
type Member = { id: string | number; name: string; role: "adult" | "child"; color?: string; userId?: string | null };
type ChoreEntry = { id: string | number; title: string; emoji: string; assigneeMemberId: string | number | null; completionId?: string | number };
type SharedListItem = { id: string | number; title: string; done: boolean };
type SharedList = { id: string | number; title: string; icon: string; items: SharedListItem[] };
type GoogleConnection = { id: string; name: string; enabled: boolean };
type AppleFeed = { id: string; name: string; enabled: boolean };

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
  if (/note|idea/.test(text)) return "✦";
  return "☰";
}

function choreIcon(title: string) {
  const text = title.toLowerCase();
  if (/bed|pillow|blanket/.test(text)) return "🛏️";
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
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventTime, setEventTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventMemberIds, setEventMemberIds] = useState<string[]>([]);
  const [eventLocation, setEventLocation] = useState("");
  const [eventCategory, setEventCategory] = useState("General");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"calendar" | "tasks" | "chores" | "lists" | "settings">("calendar");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [dark, setDark] = useState(false);
  const [screenSaver, setScreenSaver] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("Your Family Home");
  const [familyNote, setFamilyNote] = useState("Don't forget: wear your team jersey for soccer tomorrow!");
  const [familyNoteAuthor, setFamilyNoteAuthor] = useState("Mom");
  const [editingFamilyNote, setEditingFamilyNote] = useState(false);
  const [familyNoteDraft, setFamilyNoteDraft] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [todoTitle, setTodoTitle] = useState("");
  const [todoAssigneeMemberId, setTodoAssigneeMemberId] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<ChoreEntry[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);
  const [googleConnections, setGoogleConnections] = useState<GoogleConnection[]>([]);
  const [appleFeeds, setAppleFeeds] = useState<AppleFeed[]>([]);
  const [celebratingChoreId, setCelebratingChoreId] = useState<string | number | null>(null);

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
    if (!supabase || !user) return;
    supabase.from("members").select("household_id").eq("user_id", user.id).limit(1).then(async ({ data }) => {
      const id = data?.[0]?.household_id ?? null;
      setHouseholdId(id);
      if (id) {
        const { data: household } = await supabase!.from("households").select("name").eq("id", id).single();
        if (household) setHouseholdName(household.name);
        const { data: note } = await supabase!.from("households").select("family_note, family_note_author").eq("id", id).single();
        if (note?.family_note) setFamilyNote(note.family_note);
        if (note?.family_note_author) setFamilyNoteAuthor(note.family_note_author);
      }
      setDataReady(true);
    });
  }, [user]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      supabase.from("events").select("id, title, notes, starts_at, ends_at, all_day, color, location, category, member_ids").eq("household_id", householdId).order("starts_at"),
      supabase.from("todos").select("id, title, due_at, status, completed_at, assignee_member_id").eq("household_id", householdId).neq("status", "archived").order("due_at"),
      supabase.from("members").select("id, user_id, display_name, role, color").eq("household_id", householdId).order("created_at"),
      supabase.from("chores").select("id, title, emoji, assignee_member_id").eq("household_id", householdId).eq("active", true).order("created_at"),
      supabase.from("chore_completions").select("id, chore_id").gte("completed_at", todayStart.toISOString()),
      supabase.from("lists").select("id, title, icon").eq("household_id", householdId).order("created_at"),
      supabase.from("list_items").select("id, list_id, title, completed").order("created_at"),
      supabase.from("google_calendar_connections").select("id, display_name, enabled").eq("household_id", householdId).order("created_at"),
      supabase.from("calendar_feeds").select("id, display_name, enabled").eq("household_id", householdId).eq("provider", "apple").order("created_at"),
    ]).then(async ([eventResult, todoResult, memberResult, choreResult, completionResult, listResult, listItemResult, connectionResult, appleFeedResult]) => {
      if (eventResult.data) setEvents(eventResult.data.map((event) => ({
        id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, endsAt: event.ends_at, notes: event.notes, location: event.location, category: event.category, allDay: event.all_day, memberIds: event.member_ids,
        time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      })));
      if (todoResult.data) {
        const archiveBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const expiredCompleted = todoResult.data.filter((todo) => todo.status === "completed" && todo.completed_at && new Date(todo.completed_at).getTime() < archiveBefore);
        if (expiredCompleted.length) void supabase!.from("todos").update({ status: "archived" }).in("id", expiredCompleted.map((todo) => todo.id));
        const visibleTodos = todoResult.data.filter((todo) => !expiredCompleted.some((expired) => expired.id === todo.id));
        setTodos(visibleTodos.map((todo) => ({ id: todo.id, title: todo.title, due: todo.due_at ? new Date(todo.due_at).toLocaleDateString([], { weekday: "short" }) : "", done: todo.status === "completed", assigneeMemberId: todo.assignee_member_id })));
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
      }
      if (choreResult.data) {
        const completionByChore = new Map((completionResult.data ?? []).map((completion) => [completion.chore_id, completion.id]));
        setChores(choreResult.data.map((chore) => ({ id: chore.id, title: chore.title, emoji: chore.emoji, assigneeMemberId: chore.assignee_member_id, completionId: completionByChore.get(chore.id) })));
      }
      if (listResult.data) {
        const itemsByList = new Map<string, SharedListItem[]>();
        (listItemResult.data ?? []).forEach((item) => itemsByList.set(item.list_id, [...(itemsByList.get(item.list_id) ?? []), { id: item.id, title: item.title, done: item.completed }]));
        setSharedLists(listResult.data.map((list) => ({ id: list.id, title: list.title, icon: list.icon, items: itemsByList.get(list.id) ?? [] })));
      }
      if (connectionResult.data) setGoogleConnections(connectionResult.data.map((connection) => ({ id: connection.id, name: connection.display_name, enabled: connection.enabled })));
      if (appleFeedResult.data) setAppleFeeds(appleFeedResult.data.map((feed) => ({ id: feed.id, name: feed.display_name, enabled: feed.enabled })));
    });
  }, [householdId]);

  useEffect(() => {
    async function loadWeather(latitude: number, longitude: number) {
      try {
        const [weatherResponse, placeResponse] = await Promise.all([
          fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=auto`),
          fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`),
        ]);
        const [data, place] = await Promise.all([weatherResponse.json(), placeResponse.json()]);
        const address = place.address ?? {};
        const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.city_district ?? address.county ?? "Your location";
        setWeather({ temperature: Math.round(data.current.temperature_2m), high: Math.round(data.daily.temperature_2m_max[0]), low: Math.round(data.daily.temperature_2m_min[0]), summary: weatherSummary(data.current.weather_code), location: city });
      } catch { setWeather(null); }
    }
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(
      (position) => loadWeather(position.coords.latitude, position.coords.longitude),
      () => setWeather(null),
      { maximumAge: 900000, timeout: 8000 },
    );
  }, []);
  const openTodos = useMemo(() => todos.filter((todo) => !todo.done), [todos]);
  const calendarEvents = useMemo(() => [...events, ...[calendarAnchor.getFullYear() - 1, calendarAnchor.getFullYear(), calendarAnchor.getFullYear() + 1].flatMap(familyHolidaysForYear)], [events, calendarAnchor]);

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
    setTodoTitle("");
    setTodoAssigneeMemberId("");
    setShowTodoForm(true);
  }

  async function saveTodo(event: FormEvent) {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;
    const assigneeMemberId = todoAssigneeMemberId || null;
    if (supabase && user && householdId) {
      const { data, error } = await supabase.from("todos").insert({ household_id: householdId, created_by: user.id, title, assignee_member_id: assigneeMemberId }).select("id, assignee_member_id").single();
      if (error) { window.alert(`Could not add this task: ${error.message}`); return; }
      if (data) setTodos((items) => [...items, { id: data.id, title, due: "", done: false, assigneeMemberId: data.assignee_member_id }]);
    } else {
      setTodos((items) => [...items, { id: Date.now().toString(), title, due: "", done: false, assigneeMemberId }]);
    }
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
    const { data } = await supabase.from("events").select("id, title, notes, starts_at, ends_at, all_day, color, location, category, member_ids").eq("household_id", householdId).order("starts_at");
    if (data) setEvents(data.map((event) => ({
      id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, endsAt: event.ends_at, notes: event.notes, location: event.location, category: event.category, allDay: event.all_day, memberIds: event.member_ids,
      time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    })));
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
    setTodos((items) => items.map((todo) => todo.id === id ? { ...todo, done } : todo));
    if (supabase && householdId) supabase.from("todos").update({ status: done ? "completed" : "open", completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("household_id", householdId).then(() => undefined);
  }

  async function addChild() {
    const name = window.prompt("Child's name?");
    if (!name?.trim() || !householdId) return;
    if (supabase) {
      const { data, error } = await supabase.from("members").insert({ household_id: householdId, display_name: name.trim(), role: "child" }).select("id, display_name, role").single();
      if (error) { window.alert(error.message); return; }
      if (data) setMembers((items) => [...items, { id: data.id, name: data.display_name, role: data.role }]);
    } else setMembers((items) => [...items, { id: Date.now().toString(), name: name.trim(), role: "child" }]);
  }

  async function addChore(memberId: string | number) {
    const title = window.prompt("What is the chore?");
    if (!title?.trim() || !householdId) return;
    const emoji = choreIcon(title);
    if (supabase) {
      const { data, error } = await supabase.from("chores").insert({ household_id: householdId, assignee_member_id: memberId, title: title.trim(), emoji }).select("id, title, emoji, assignee_member_id").single();
      if (error) { window.alert(error.message); return; }
      if (data) setChores((items) => [...items, { id: data.id, title: data.title, emoji: data.emoji, assigneeMemberId: data.assignee_member_id }]);
    } else setChores((items) => [...items, { id: Date.now().toString(), title: title.trim(), emoji, assigneeMemberId: memberId }]);
  }

  async function toggleChore(chore: ChoreEntry) {
    if (chore.completionId) {
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: undefined } : item));
      if (supabase) await supabase.from("chore_completions").delete().eq("id", chore.completionId);
      return;
    }
    if (supabase) {
      const { data, error } = await supabase.from("chore_completions").insert({ chore_id: chore.id, member_id: chore.assigneeMemberId }).select("id").single();
      if (error) { window.alert(error.message); return; }
      setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: data?.id } : item));
    } else setChores((items) => items.map((item) => item.id === chore.id ? { ...item, completionId: Date.now().toString() } : item));
    setCelebratingChoreId(chore.id);
    window.setTimeout(() => setCelebratingChoreId((id) => id === chore.id ? null : id), 2200);
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

  async function deleteSharedList(list: SharedList) {
    if (!window.confirm(`Delete “${list.title}” and all of its items?`)) return;
    setSharedLists((items) => items.filter((item) => item.id !== list.id));
    if (supabase) {
      const { error } = await supabase.from("lists").delete().eq("id", list.id);
      if (error) { setSharedLists((items) => [...items, list]); window.alert(`Could not delete this list: ${error.message}`); }
    }
  }

  async function saveEvent(event: Event) {
    setEvents((items) => items.map((item) => item.id === event.id ? event : item));
    setEditingEvent(null);
    if (supabase && householdId) await supabase.from("events").update({ title: event.title, starts_at: event.startsAt, ends_at: event.endsAt ?? null, all_day: event.allDay ?? false, location: event.location ?? null, category: event.category ?? "General", category_override: true, member_ids: event.memberIds ?? [] }).eq("id", event.id).eq("household_id", householdId);
  }

  async function deleteEvent(event: Event) {
    if (!window.confirm(`Delete “${event.title}”? This can’t be undone.`)) return;
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

  async function saveFamilyNote() {
    const note = familyNoteDraft.trim();
    if (!note) return;
    const author = members.find((member) => member.userId === user?.id)?.name ?? "Family";
    const previous = { note: familyNote, author: familyNoteAuthor };
    setFamilyNote(note);
    setFamilyNoteAuthor(author);
    setEditingFamilyNote(false);
    if (supabase && householdId) {
      const { error } = await supabase.from("households").update({ family_note: note, family_note_author: author }).eq("id", householdId);
      if (error) {
        setFamilyNote(previous.note);
        setFamilyNoteAuthor(previous.author);
        window.alert(`Could not save the family note: ${error.message}`);
      }
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

  if (!authReady) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] text-slate-500">Connecting your family home…</main>;
  if (supabase && !user) return <AuthScreen onAuthenticated={setUser} />;
  if (supabase && user && dataReady && !householdId) return <main className="grid min-h-screen place-items-center bg-[#f8f7ff] p-6 text-slate-900"><section className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-xl"><span className="text-5xl">🏠</span><h1 className="mt-5 text-2xl font-bold">Create your family home</h1><p className="mt-2 text-slate-500">This private space will hold your shared calendar, chores, and adult to-dos.</p><button onClick={createHousehold} className="mt-6 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Create household</button></section></main>;

  if (screenSaver) return <Screensaver onExit={() => setScreenSaver(false)} />;

  return (
    <main className={dark ? "dark min-h-screen" : "min-h-screen"}>
      <div className="min-h-screen bg-[#f8f7ff] text-slate-900 transition-colors dark:bg-[#151522] dark:text-slate-100 lg:pl-24">
        <aside className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-100 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#1c1c2b]/95 lg:inset-y-0 left-0 right-auto w-24 flex-col justify-start gap-3 border-r border-t-0 px-3 py-6">
          <div className="hidden lg:grid size-12 place-items-center self-center rounded-2xl bg-violet-600 text-xl text-white shadow-lg shadow-violet-300/50">✦</div>
          <nav className="flex flex-1 justify-around gap-1 lg:mt-8 lg:flex-col lg:justify-start">{([ ["calendar", "▦", "Calendar"], ["tasks", "✓", "Tasks"], ["chores", "✦", "Chores"], ["lists", "☰", "Lists"] ] as const).map(([tab, icon, label]) => <button key={tab} onClick={() => setActiveTab(tab)} title={label} className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === tab ? "bg-violet-600 text-white shadow-md" : "text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10"}`}><span className="text-xl leading-none">{icon}</span><span className="hidden lg:block">{label}</span></button>)}</nav>
          <button onClick={() => setActiveTab("settings")} title="Settings" className={`hidden lg:flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold transition-colors ${activeTab === "settings" ? "bg-violet-600 text-white shadow-md" : "text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10"}`}><span className="text-xl leading-none">⚙</span><span>Settings</span></button>
        </aside>
        <header className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-5 md:px-9">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-600 text-xl shadow-lg shadow-violet-300/50 lg:hidden">✦</div><div><h1 className="text-xl font-bold tracking-tight">{householdName}</h1><p className="text-sm text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => setScreenSaver(true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">Photos</button><button onClick={() => setDark((value) => !value)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:ring-white/10">{dark ? "☀ Light" : "☾ Dark"}</button></div>
        </header>
        {activeTab === "calendar" ? <div className="mx-auto max-w-[1800px] space-y-5 px-5 pb-24 md:px-9 lg:pb-8">
          <section className="grid gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
            <article className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#7dd3fc] via-[#60a5fa] to-[#818cf8] p-5 text-white shadow-lg shadow-sky-200/50"><span className="absolute -right-5 -top-9 size-28 rounded-full bg-yellow-200/70"/><div className="relative flex h-full items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-wide">{timeGreeting()} · {weather?.location ?? "LOCAL FORECAST"}</p><p className="mt-2 text-4xl font-black tracking-tighter">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-semibold text-white/90">{weather ? `${weather.summary} · ↑ ${weather.high}° ↓ ${weather.low}°` : "Allow location for today’s weather"}</p></div><span className="text-5xl drop-shadow-sm">{weather?.summary === "Rain" ? "🌦️" : weather?.summary === "Snow" ? "❄️" : weather?.summary === "Cloudy" ? "☁️" : "☀️"}</span></div></article>
            <article className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-rose-500">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={addTodo} className="grid size-8 place-items-center rounded-xl bg-rose-100 text-lg font-bold text-rose-600 hover:bg-rose-200">+</button></div><div className="mt-3 space-y-1">{openTodos.slice(0, 2).map((todo) => { const assignee = members.find((member) => member.id === todo.assigneeMemberId); return <label key={todo.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} className="size-4 accent-rose-500"/><span className="min-w-0 flex-1 truncate font-medium">{todo.title}</span>{assignee && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${assignee.color ?? "#fda4af"}33`, color: assignee.color ?? "#be123c" }}>{assignee.name}</span>}</label>; })}{openTodos.length === 0 && <p className="text-sm text-slate-400">You&apos;re all caught up.</p>}</div><button onClick={() => setActiveTab("tasks")} className="mt-2 text-xs font-bold text-violet-600">View all tasks →</button></article>
            <article className="rounded-[1.75rem] bg-amber-100 p-5 text-amber-950"><div className="flex items-start justify-between gap-3"><p className="text-xs font-bold text-amber-700">FAMILY NOTE</p>{!editingFamilyNote && <button onClick={() => { setFamilyNoteDraft(familyNote); setEditingFamilyNote(true); }} className="rounded-lg px-2 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200">Edit</button>}</div>{editingFamilyNote ? <><textarea autoFocus value={familyNoteDraft} onChange={(event) => setFamilyNoteDraft(event.target.value)} maxLength={280} rows={3} className="mt-2 w-full resize-none rounded-xl border border-amber-300 bg-white/80 px-3 py-2 text-base font-semibold leading-snug outline-amber-500"/><div className="mt-3 flex justify-end gap-2"><button onClick={() => setEditingFamilyNote(false)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-200">Cancel</button><button onClick={saveFamilyNote} disabled={!familyNoteDraft.trim()} className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">Save</button></div></> : <><p className="mt-2 text-base font-bold leading-snug">{familyNote}</p><p className="mt-3 text-xs font-semibold text-amber-700">— {familyNoteAuthor}</p></>}</article>
          </section>
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{calendarAnchor.toLocaleDateString([], { month: "long", year: "numeric" })}</h2><div className="flex flex-wrap items-center gap-2"><button onClick={() => googleConnected || appleFeeds.some((feed) => feed.enabled) ? syncAllCalendars() : connectGoogleCalendar()} disabled={syncingGoogle} className="rounded-xl border border-violet-200 px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200">{syncingGoogle ? "Syncing…" : googleConnected || appleFeeds.some((feed) => feed.enabled) ? "Sync all" : "Connect Google"}</button><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div></div>
            {calendarMessage && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-100">{calendarMessage}</p>}
            <div className="mb-4 flex items-center justify-between"><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, -1))} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">← Previous</button><button onClick={() => setCalendarAnchor(new Date())} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">Today</button><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, 1))} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">Next →</button></div>
            <FamilyColorKey members={members} />
            {view === "Day" ? <DayCalendar date={calendarAnchor} events={calendarEvents} members={members} onEdit={setEditingEvent} /> : view === "Week" ? <WeekCalendar anchor={calendarAnchor} events={calendarEvents} members={members} onEdit={setEditingEvent} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} /> : <MonthGrid anchor={calendarAnchor} events={calendarEvents} members={members} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} />}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
              {showEventForm ? <form onSubmit={addEvent} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10"><div className="flex items-center justify-between"><p className="font-bold text-violet-800 dark:text-violet-100">Add a family event</p><button type="button" onClick={() => setShowEventForm(false)} className="text-lg font-bold text-violet-500">×</button></div><input required autoFocus value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="What&apos;s happening?" className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-violet-500"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Date<input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Starts<input disabled={eventAllDay} required type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Ends<input disabled={eventAllDay} required type="time" value={eventEndTime} onChange={(event) => setEventEndTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label></div><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Category<select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Location<input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="e.g. Backyard or 123 Main St" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label></div><fieldset className="mt-3"><legend className="text-xs font-bold text-violet-800 dark:text-violet-200">Who is this for?</legend><div className="mt-1 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = eventMemberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-200"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => setEventMemberIds((ids) => selected ? ids.filter((item) => item !== id) : [...ids, id])}/>{member.name}</label>; })}</div></fieldset><div className="mt-4 flex items-center justify-between"><label className="flex gap-2 text-sm font-bold text-violet-800 dark:text-violet-200"><input type="checkbox" checked={eventAllDay} onChange={(event) => setEventAllDay(event.target.checked)} className="size-4 accent-violet-600" />All day</label><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Save event</button></div></form> : <div className="flex justify-center"><button onClick={() => setShowEventForm(true)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">+ Add event</button></div>}
            </div>
          </section>
        </div> : activeTab === "tasks" ? <TasksPage todos={todos} members={members} onAdd={addTodo} onToggle={toggleTodo} /> : activeTab === "chores" ? <ChoresPage members={members} chores={chores} celebratingChoreId={celebratingChoreId} onAddChild={addChild} onAddChore={addChore} onToggle={toggleChore} onDeleteChore={deleteChore} /> : activeTab === "settings" ? <SettingsPage googleConnections={googleConnections} appleFeeds={appleFeeds} onConnect={connectGoogleCalendar} onToggleConnection={toggleGoogleCalendar} onAddApple={addAppleCalendar} onToggleApple={toggleAppleCalendar} /> : <ListsPage lists={sharedLists} onAddList={addSharedList} onAddItem={addListItem} onToggleItem={toggleListItem} onDeleteList={deleteSharedList} />}
      </div>
      {editingEvent && <EventEditor key={editingEvent.id} event={editingEvent} members={members} onClose={() => setEditingEvent(null)} onSave={saveEvent} onDelete={deleteEvent} />}
      {showTodoForm && <TaskEditor title={todoTitle} assigneeMemberId={todoAssigneeMemberId} members={members} onTitleChange={setTodoTitle} onAssigneeChange={setTodoAssigneeMemberId} onClose={() => setShowTodoForm(false)} onSave={saveTodo} />}
    </main>
  );
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
  if (name === "michael") return "#86efac";
  if (name === "lucas") return "#fb923c";
  if (member.color && member.color !== "#7c3aed") return member.color;
  return ["#a5b4fc", "#f9a8d4", "#fde68a", "#67e8f9", "#c4b5fd"][index % 5];
}

function eventBlockBackground(event: Event, members: Member[]) {
  if (event.generatedHoliday) return "linear-gradient(135deg,#fde68a,#fda4af,#c4b5fd)";
  const colors = eventMembers(event, members).map((member) => memberCalendarColor(member, members.indexOf(member)));
  if (!colors.length) return "#e2e8f0";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(", ")})`;
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

function eventMembers(event: Event, members: Member[]) {
  return (event.memberIds ?? []).map((id) => members.find((member) => String(member.id) === id)).filter((member): member is Member => Boolean(member));
}

function FamilyColorKey({ members }: { members: Member[] }) {
  if (!members.length) return null;
  return <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300"><span className="text-[10px] uppercase tracking-wide text-slate-400">Family colors</span>{members.map((member, index) => <span key={member.id} className="flex items-center gap-1.5"><i className="size-3 rounded-full" style={{ background: memberCalendarColor(member, index) }}/>{member.name}</span>)}<span className="flex items-center gap-1.5"><i className="size-3 rounded-full bg-slate-200"/>Family</span></div>;
}

function EventChip({ event, members, compact = false }: { event: Event; members: Member[]; compact?: boolean }) {
  return <div style={{ background: eventBlockBackground(event, members) }} className={`rounded-sm px-3 ${compact ? "py-1" : "py-1.5"} text-left text-xs font-semibold text-slate-900`}><span className="block truncate">{event.generatedHoliday ? `${holidayEmoji(event.title)} ` : ""}{event.title}</span>{event.location && !compact && <span className="block truncate font-medium opacity-75">⌖ {event.location}</span>}</div>;
}

function dayCardDecoration(events: Event[]) {
  if (events.some((event) => event.category === "Birthday")) return "ring-2 ring-pink-300 bg-gradient-to-br from-pink-100 via-rose-50 to-violet-100";
  if (events.some((event) => event.category === "Holiday")) return "ring-2 ring-amber-300 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100";
  return "";
}

const timelineStartHour = 6;
const timelineEndHour = 21;
const timelineHourHeight = 64;

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
  return <button onClick={event.generatedHoliday ? undefined : onClick} style={{ top: position.top, height: position.height, background: eventBlockBackground(event, members) }} className={`absolute inset-x-1 z-10 overflow-hidden rounded-md p-2 text-left text-slate-900 shadow-sm hover:brightness-95 ${compact ? "text-[10px]" : "min-h-[92px] pb-7 text-xs"}`}><span className="absolute bottom-1.5 right-1.5 flex -space-x-1.5">{assignedMembers.slice(0, 4).map((member, index) => <i key={member.id} style={{ background: memberCalendarColor(member, members.indexOf(member)), zIndex: assignedMembers.length - index }} className="grid size-4 place-items-center rounded-full border border-white/80 text-[8px] not-italic font-black text-slate-800 shadow-sm">{member.name.slice(0, 1).toUpperCase()}</i>)}</span><p className={`${compact ? "truncate" : "truncate text-[17px] leading-tight"} font-black`}>{event.generatedHoliday ? `${holidayEmoji(event.title)} ` : ""}{event.title}</p>{!compact && event.notes && <p className="mt-0.5 truncate text-[14px] font-semibold leading-tight opacity-80">{event.notes}</p>}{!compact && event.location && <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-tight opacity-60">⌖ {event.location}</p>}</button>;
}

function TimelineColumn({ date, events, members, onEdit, compact = false }: { date: Date; events: Event[]; members: Member[]; onEdit?: (event: Event) => void; compact?: boolean }) {
  const dayEvents = events.filter((event) => eventOccursOn(event, date));
  const timedEvents = dayEvents.filter((event) => !event.allDay);
  return <div className="relative h-[960px] border-l border-slate-100 dark:border-white/10">{Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, index) => <div key={index} style={{ top: index * timelineHourHeight }} className="absolute inset-x-0 border-t border-slate-100/80 dark:border-white/10"/>)}{timedEvents.map((event) => <TimelineEvent key={event.id} event={event} members={members} compact={compact} onClick={() => onEdit?.(event)} />)}</div>;
}

function DayCalendar({ date, events, members, onEdit }: { date: Date; events: Event[]; members: Member[]; onEdit: (event: Event) => void }) {
  const dayEvents = events.filter((event) => eventOccursOn(event, date));
  const allDayEvents = dayEvents.filter((event) => event.allDay);
  return <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-white/10"><div className="flex items-baseline gap-2 border-b border-slate-100 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#151522]"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{date.toLocaleDateString([], { weekday: "short" })}</p><p className="text-2xl font-black leading-none">{date.getDate()}</p></div>{allDayEvents.length > 0 && <div className="border-b border-slate-100 p-3 dark:border-white/10"><p className="mb-2 text-xs font-bold text-slate-400">ALL DAY</p><div className="flex flex-wrap gap-2">{allDayEvents.map((event) => <button key={event.id} disabled={event.generatedHoliday} onClick={() => onEdit(event)} style={{ background: eventBlockBackground(event, members) }} className="rounded-md px-3 py-2 text-sm font-bold text-slate-900 disabled:cursor-default">{event.generatedHoliday ? `${holidayEmoji(event.title)} ` : ""}{event.title}</button>)}</div></div>}<div className="grid grid-cols-[4rem_1fr] overflow-auto"><div className="relative h-[960px] bg-slate-50/60 dark:bg-white/[.02]">{Array.from({ length: timelineEndHour - timelineStartHour }, (_, index) => <span key={index} style={{ top: index * timelineHourHeight - 7 }} className="absolute right-2 text-xs font-bold text-slate-400">{new Date(2000, 0, 1, timelineStartHour + index).toLocaleTimeString([], { hour: "numeric" })}</span>)}</div><TimelineColumn date={date} events={events} members={members} onEdit={onEdit}/></div></div>;
}

function EventEditor({ event, members, onClose, onSave, onDelete }: { event: Event; members: Member[]; onClose: () => void; onSave: (event: Event) => void; onDelete: (event: Event) => void }) {
  const source = new Date(event.startsAt);
  const endSource = event.endsAt ? new Date(event.endsAt) : new Date(source.getTime() + 60 * 60_000);
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.allDay ? `${source.getUTCFullYear()}-${String(source.getUTCMonth() + 1).padStart(2, "0")}-${String(source.getUTCDate()).padStart(2, "0")}` : source.toISOString().slice(0, 10));
  const [time, setTime] = useState(source.toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState(endSource.toTimeString().slice(0, 5));
  const [location, setLocation] = useState(event.location ?? "");
  const [category, setCategory] = useState(event.category ?? "General");
  const [allDay, setAllDay] = useState(event.allDay ?? event.time === "All day");
  const [memberIds, setMemberIds] = useState(event.memberIds ?? []);
  function submit(formEvent: FormEvent) { formEvent.preventDefault(); const startsAt = new Date(`${date}T${time}:00`); const selectedEnd = new Date(`${date}T${endTime}:00`); const endsAt = allDay ? null : (selectedEnd > startsAt ? selectedEnd : new Date(startsAt.getTime() + 60 * 60_000)); onSave({ ...event, title: title.trim(), startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, time: allDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), location: location.trim() || null, category, allDay, memberIds }); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5"><form onSubmit={submit} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">EDIT EVENT</p><h2 className="text-2xl font-bold">Make a change</h2></div><button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button></div><label className="mt-5 block text-sm font-bold">Event title<input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><div className="mt-4 grid grid-cols-3 gap-3"><label className="text-sm font-bold">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="text-sm font-bold">Starts<input disabled={allDay} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label><label className="text-sm font-bold">Ends<input disabled={allDay} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label></div><label className="mt-4 block text-sm font-bold">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="mt-4 block text-sm font-bold">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><fieldset className="mt-4"><legend className="text-sm font-bold">Who is this for?</legend><div className="mt-2 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = memberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => setMemberIds((ids) => selected ? ids.filter((item) => item !== id) : [...ids, id])}/>{member.name}</label>; })}</div></fieldset><label className="mt-4 flex gap-2 text-sm font-bold"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label><div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => onDelete(event)} className="rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50">Delete event</button><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-500">Cancel</button><button className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white">Save event</button></div></div></form></div>;
}

function WeekCalendar({ anchor, events, members, onEdit, onOpenDay }: { anchor: Date; events: Event[]; members: Member[]; onEdit: (event: Event) => void; onOpenDay: (date: Date) => void }) {
  const first = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div className="overflow-x-auto"><div className="min-w-[920px] overflow-hidden rounded-2xl border border-slate-100 dark:border-white/10"><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-white/10"><div/>{days.map((day) => { const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`flex items-baseline justify-center gap-1 border-l border-slate-100 px-2 py-3 dark:border-white/10 ${isToday ? "bg-violet-600 text-white" : "hover:bg-violet-50 dark:hover:bg-white/5"}`}><span className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-white/75" : "text-slate-400"}`}>{day.toLocaleDateString([], { weekday: "short" })}</span><span className="text-xl font-black leading-none">{day.getDate()}</span></button>; })}</div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-white/10"><span className="px-2 py-2 text-[10px] font-bold uppercase text-slate-400">All day</span>{days.map((day) => <div key={day.toISOString()} className="min-h-10 space-y-1 border-l border-slate-100 p-1 dark:border-white/10">{events.filter((event) => event.allDay && eventOccursOn(event, day)).slice(0, 2).map((event) => <button key={event.id} disabled={event.generatedHoliday} onClick={() => onEdit(event)} className="w-full disabled:cursor-default"><EventChip event={event} members={members} compact /></button>)}</div>)}</div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"><div className="relative h-[960px] bg-slate-50/60 dark:bg-white/[.02]">{Array.from({ length: timelineEndHour - timelineStartHour }, (_, index) => <span key={index} style={{ top: index * timelineHourHeight - 7 }} className="absolute right-2 text-xs font-bold text-slate-400">{new Date(2000, 0, 1, timelineStartHour + index).toLocaleTimeString([], { hour: "numeric" })}</span>)}</div>{days.map((day) => <TimelineColumn key={day.toISOString()} date={day} events={events} members={members} onEdit={onEdit} />)}</div></div></div>;
}

function MonthGrid({ anchor, events, members, onOpenDay }: { anchor: Date; events: Event[]; members: Member[]; onOpenDay: (date: Date) => void }) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const first = startOfWeek(firstOfMonth);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div><div className="mb-1 grid grid-cols-7 gap-1">{weekdays.map((day) => <p key={day} className="p-1 text-center text-xs font-bold text-slate-400">{day}</p>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => eventOccursOn(event, day)); const currentMonth = day.getMonth() === anchor.getMonth(); const birthday = dayEvents.some((event) => event.category === "Birthday"); const holiday = dayEvents.some((event) => event.category === "Holiday"); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`relative flex aspect-square min-h-0 flex-col items-stretch overflow-hidden rounded-xl p-2 text-left ${currentMonth ? "bg-slate-50 dark:bg-white/5" : "bg-slate-50/40 text-slate-300 dark:bg-white/[.02]"} ${dayCardDecoration(dayEvents)}`}>{birthday && <span className="absolute right-1 top-1 text-sm">🎈</span>}{holiday && <span className="absolute right-1 top-1 text-sm">✨</span>}<span className="flex h-7 shrink-0 items-start justify-start text-left text-sm font-bold leading-none">{day.getDate()}</span><span className="block min-h-0 space-y-1 overflow-hidden text-left">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} members={members} compact />)}{dayEvents.length > 2 && <span className="block px-1 text-xs font-bold text-violet-600">+{dayEvents.length - 2} more</span>}</span></button>; })}</div></div>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User | null) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const result = isNew
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
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
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? error.message : "A new confirmation email is on its way.");
  }

  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#ddd6fe,transparent_35%),#f8f7ff] p-5 text-slate-900"><form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-violet-200/50"><div className="grid size-12 place-items-center rounded-2xl bg-violet-600 text-xl text-white">✦</div><h1 className="mt-6 text-3xl font-bold">Welcome home</h1><p className="mt-2 text-slate-500">Sign in to your private family command center.</p><label className="mt-6 block text-sm font-bold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-violet-500" placeholder="you@example.com" /></label><label className="mt-4 block text-sm font-bold">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-violet-500" placeholder="At least 6 characters" /></label>{message && <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-700">{message}</p>}<button className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700">{isNew ? "Create account" : "Sign in"}</button><button type="button" onClick={resendConfirmation} className="mt-3 w-full text-sm font-semibold text-slate-500 hover:text-violet-600">Resend confirmation email</button><button type="button" onClick={() => { setIsNew((value) => !value); setMessage(""); }} className="mt-4 w-full text-sm font-bold text-violet-600">{isNew ? "Already have an account? Sign in" : "New here? Create an account"}</button></form></main>;
}

function Screensaver({ onExit }: { onExit: () => void }) {
  return <main className="min-h-screen cursor-pointer bg-[radial-gradient(circle_at_30%_20%,#fbcfe8,transparent_24%),radial-gradient(circle_at_70%_70%,#bfdbfe,transparent_28%),linear-gradient(120deg,#312e81,#0f766e)] p-8 text-white" onClick={onExit}><div className="flex h-[calc(100vh-4rem)] flex-col justify-between rounded-[2rem] border border-white/25 bg-black/10 p-8 backdrop-blur-sm"><div className="flex items-center justify-between text-lg font-medium text-white/80"><span>Good evening, family</span><span>Tap anywhere to return</span></div><div><p className="text-7xl font-semibold tracking-tight md:text-9xl">7:42</p><p className="mt-3 text-2xl text-white/80">Wednesday, August 19</p></div><div className="flex flex-wrap items-center gap-4 text-lg"><span className="rounded-full bg-white/20 px-4 py-2">☀️ 76° · Clear skies</span><span className="rounded-full bg-white/20 px-4 py-2">Next: Dance · 4:30 PM</span></div></div></main>;
}

function TasksPage({ todos, members, onAdd, onToggle }: { todos: Todo[]; members: Member[]; onAdd: () => void; onToggle: (id: string | number) => void }) {
  const open = todos.filter((todo) => !todo.done);
  const completed = todos.filter((todo) => todo.done);
  const assignee = (todo: Todo) => members.find((member) => member.id === todo.assigneeMemberId);
  return <section className="mx-auto max-w-[1600px] px-5 pb-8 md:px-9"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-8"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-rose-500">FAMILY TASKS</p><h2 className="text-3xl font-bold">Today&apos;s to-dos</h2></div><button onClick={onAdd} className="rounded-xl bg-rose-500 px-4 py-3 font-bold text-white">+ Add task</button></div><div className="mt-7 grid gap-4 md:grid-cols-2">{open.map((todo) => { const person = assignee(todo); return <button key={todo.id} onClick={() => onToggle(todo.id)} className="flex items-start gap-4 rounded-2xl bg-rose-50 p-5 text-left hover:bg-rose-100 dark:bg-rose-400/10"><span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-rose-400 text-rose-500">✓</span><span className="min-w-0 flex-1"><b className="block">{todo.title}</b><small className="mt-1 block text-slate-500">{todo.due || "No deadline"}</small>{person && <span className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${person.color ?? "#fda4af"}33`, color: person.color ?? "#be123c" }}>For {person.name}</span>}</span></button>; })}{open.length === 0 && <p className="text-slate-400">You&apos;re all caught up.</p>}</div>{completed.length > 0 && <div className="mt-8 border-t border-slate-100 pt-5 dark:border-white/10"><h3 className="font-bold text-emerald-600">Completed recently</h3><p className="mt-1 text-sm text-slate-500">Completed tasks stay here for 7 days, then move out of sight.</p><div className="mt-3 grid gap-3 md:grid-cols-2">{completed.map((todo) => <button key={todo.id} onClick={() => onToggle(todo.id)} className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-left text-sm text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200"><span>✓</span><span className="line-through">{todo.title}</span><span className="ml-auto text-xs">Restore</span></button>)}</div></div>}</div></section>;
}

function TaskEditor({ title, assigneeMemberId, members, onTitleChange, onAssigneeChange, onClose, onSave }: { title: string; assigneeMemberId: string; members: Member[]; onTitleChange: (value: string) => void; onAssigneeChange: (value: string) => void; onClose: () => void; onSave: (event: FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><form onSubmit={onSave} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-rose-500">FAMILY TASK</p><h2 className="text-2xl font-bold">Add a to-do</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button></div><label className="mt-5 block text-sm font-bold">What needs to get done?<input required autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="e.g. Pick up groceries" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-rose-500" /></label><fieldset className="mt-5"><legend className="text-sm font-bold">Assign to <span className="font-normal text-slate-400">(optional)</span></legend><div className="mt-2 flex flex-wrap gap-2"><label className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${!assigneeMemberId ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200"}`}><input className="sr-only" type="radio" name="task-assignee" checked={!assigneeMemberId} onChange={() => onAssigneeChange("")} />Anyone</label>{members.map((member) => <label key={member.id} className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${assigneeMemberId === String(member.id) ? "text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"}`} style={assigneeMemberId === String(member.id) ? { backgroundColor: member.color ?? "#f43f5e" } : undefined}><input className="sr-only" type="radio" name="task-assignee" checked={assigneeMemberId === String(member.id)} onChange={() => onAssigneeChange(String(member.id))} />{member.name}</label>)}</div></fieldset><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-600">Add task</button></div></form></div>;
}

function ChoreCelebration() {
  return <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-hidden bg-violet-950/10"><div className="animate-[bounce_700ms_ease-in-out_2] rounded-[2rem] bg-white/90 px-8 py-5 text-center shadow-2xl backdrop-blur"><p className="text-6xl">🎉</p><p className="mt-1 text-2xl font-black text-violet-700">Amazing job!</p></div><span className="absolute left-[8%] top-[10%] animate-[ping_900ms_ease-out_2] text-6xl">🎆</span><span className="absolute right-[8%] top-[12%] animate-[ping_1s_ease-out_2] text-6xl">🎇</span><span className="absolute left-[18%] top-[30%] animate-bounce text-5xl">✨</span><span className="absolute right-[15%] top-[28%] animate-[bounce_700ms_ease-in-out_2] text-5xl">🌈</span><span className="absolute bottom-[14%] left-[12%] animate-[ping_900ms_ease-out_2] text-5xl">⭐</span><span className="absolute bottom-[12%] right-[15%] animate-[bounce_800ms_ease-in-out_2] text-5xl">💫</span><span className="absolute bottom-[30%] left-[35%] animate-bounce text-4xl">🎊</span><span className="absolute bottom-[26%] right-[35%] animate-[bounce_900ms_ease-in-out_2] text-4xl">🪄</span></div>;
}

function ChoresPage({ members, chores, celebratingChoreId, onAddChild, onAddChore, onToggle, onDeleteChore }: { members: Member[]; chores: ChoreEntry[]; celebratingChoreId: string | number | null; onAddChild: () => void; onAddChore: (memberId: string | number) => void; onToggle: (chore: ChoreEntry) => void; onDeleteChore: (chore: ChoreEntry) => void }) {
  const children = members.filter((member) => member.role === "child");
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-sky-600">KIDS&apos; CHORES</p><h2 className="text-2xl font-bold">Today&apos;s routines</h2></div><button onClick={onAddChild} className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">+ Add child</button></div>{children.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{children.map((child) => { const childChores = chores.filter((chore) => chore.assigneeMemberId === child.id); const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <div key={child.id} className={`rounded-3xl p-5 ${theme}`}><div className="flex items-center justify-between"><h3 className="text-2xl font-black">{child.name}</h3><button onClick={() => onAddChore(child.id)} className="grid size-11 place-items-center rounded-2xl bg-white text-2xl font-bold text-slate-600 shadow-sm">+</button></div><div className="mt-5 grid gap-4">{childChores.map((chore) => <div key={chore.id} className="relative"><button onClick={() => onToggle(chore)} className={`flex min-h-32 w-full items-center gap-5 rounded-3xl bg-white/85 p-5 text-left shadow-sm transition-transform active:scale-[.98] ${chore.completionId ? "opacity-65" : "hover:-translate-y-0.5"}`}><span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-white text-5xl shadow-sm">{chore.emoji || choreIcon(chore.title)}</span><span className={`flex-1 text-2xl font-black leading-tight ${chore.completionId ? "text-slate-400 line-through" : "text-slate-800"}`}>{chore.title}</span><span className={`grid size-16 shrink-0 place-items-center rounded-full border-4 text-4xl font-black ${chore.completionId ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span></button>{celebratingChoreId === chore.id && <ChoreCelebration/>}<button onClick={() => onDeleteChore(chore)} title={`Delete ${chore.title}`} className="absolute right-2 top-2 rounded-lg px-2 py-1 text-slate-300 hover:bg-slate-100 hover:text-rose-600">⌫</button></div>)}{childChores.length === 0 && <p className="rounded-2xl bg-white/60 p-6 text-center text-sm font-semibold text-slate-600">No chores yet. Tap + to add one.</p>}</div></div>; })}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Add Michael and Lucas (or anyone else) to create their chore boards.</div>}</div></section>;
}

function SettingsPage({ googleConnections, appleFeeds, onConnect, onToggleConnection, onAddApple, onToggleApple }: { googleConnections: GoogleConnection[]; appleFeeds: AppleFeed[]; onConnect: () => void; onToggleConnection: (connection: GoogleConnection) => void; onAddApple: (name: string, url: string) => void; onToggleApple: (feed: AppleFeed) => void }) {
  const [appleName, setAppleName] = useState("Home");
  const [appleUrl, setAppleUrl] = useState("");
  function addApple(event: FormEvent) { event.preventDefault(); if (!appleUrl.trim()) return; onAddApple(appleName.trim() || "Apple Calendar", appleUrl.trim()); setAppleUrl(""); }
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-2xl space-y-5"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS</p><h2 className="text-3xl font-bold">Calendar connections</h2><article className="mt-6 rounded-2xl bg-slate-50 p-5 dark:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold">Google Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose which Google calendars appear in your family calendar.</p></div><button onClick={onConnect} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">{googleConnections.length ? "+ Add Google account" : "Connect Google"}</button></div>{googleConnections.length > 0 && <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">{googleConnections.map((connection) => <label key={connection.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold shadow-sm dark:bg-white/5"><input type="checkbox" checked={connection.enabled} onChange={() => onToggleConnection(connection)} className="size-4 accent-violet-600"/><span className="flex-1">{connection.name}</span><span className={connection.enabled ? "text-emerald-600" : "text-slate-400"}>{connection.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article><article className="mt-5 rounded-2xl bg-rose-50 p-5 dark:bg-rose-400/10"><div><p className="font-bold">Apple / iCloud Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paste a public iCloud calendar link for read-only import.</p></div><form onSubmit={addApple} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><input value={appleName} onChange={(event) => setAppleName(event.target.value)} placeholder="Calendar name" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><input required value={appleUrl} onChange={(event) => setAppleUrl(event.target.value)} placeholder="Paste public iCloud link" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white">Add</button></form>{appleFeeds.length > 0 && <div className="mt-5 space-y-2 border-t border-rose-200 pt-4">{appleFeeds.map((feed) => <label key={feed.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold shadow-sm"><input type="checkbox" checked={feed.enabled} onChange={() => onToggleApple(feed)} className="size-4 accent-rose-500"/><span className="flex-1">{feed.name}</span><span className={feed.enabled ? "text-emerald-600" : "text-slate-400"}>{feed.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article></div></div></section>;
}

function ListsPage({ lists, onAddList, onAddItem, onToggleItem, onDeleteList }: { lists: SharedList[]; onAddList: () => void; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">SHARED LISTS</p><h2 className="text-3xl font-bold">Keep the house moving</h2></div><button onClick={onAddList} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">+ New list</button></div>{lists.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{lists.map((list, index) => <ListCard key={list.id} list={list} colorIndex={index} onAddItem={onAddItem} onToggleItem={onToggleItem} onDeleteList={onDeleteList} />)}</div> : <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-4xl">🛒</p><h3 className="mt-3 text-xl font-bold">Start your first shared list</h3><p className="mt-1 text-slate-500">Groceries, packing, dinner ideas—anything your family needs.</p><button onClick={onAddList} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">+ New list</button></div>}</section>;
}

function ListCard({ list, colorIndex, onAddItem, onToggleItem, onDeleteList }: { list: SharedList; colorIndex: number; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  const colors = ["bg-rose-100", "bg-sky-100", "bg-amber-100", "bg-emerald-100", "bg-violet-100", "bg-orange-100"];
  return <article className={`rounded-[2rem] p-6 shadow-sm ring-1 ring-white/70 dark:bg-white/5 dark:ring-white/10 ${colors[colorIndex % colors.length]}`}><div className="flex items-start justify-between"><div><p className="text-3xl">{list.icon}</p><h2 className="mt-3 text-xl font-bold">{list.title}</h2></div><div className="flex gap-2"><button onClick={() => onAddItem(list.id)} className="grid size-9 place-items-center rounded-xl bg-white/80 text-lg font-bold text-violet-700 hover:bg-white">+</button><button onClick={() => onDeleteList(list)} title={`Delete ${list.title}`} className="grid size-9 place-items-center rounded-xl bg-white/50 text-lg text-slate-500 hover:bg-white hover:text-rose-600">⌫</button></div></div><div className="mt-5 space-y-2">{list.items.map((item) => <button key={item.id} onClick={() => onToggleItem(list.id, item.id)} className="flex w-full items-center gap-3 rounded-xl bg-white/70 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-white"><span className={item.done ? "text-emerald-500" : "text-slate-400"}>{item.done ? "✓" : "○"}</span><span className={item.done ? "line-through text-slate-400" : ""}>{item.title}</span></button>)}{list.items.length === 0 && <p className="text-sm text-slate-500">Tap + to add an item.</p>}</div></article>;
}
