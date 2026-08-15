"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Event = { id: string | number; title: string; time: string; person: string; color: string; startsAt: string; location?: string | null; category?: string | null; allDay?: boolean };
type Todo = { id: string | number; title: string; due: string; done: boolean };
type Weather = { temperature: number; high: number; low: number; summary: string; location: string };
type Member = { id: string | number; name: string; role: "adult" | "child" };
type ChoreEntry = { id: string | number; title: string; emoji: string; assigneeMemberId: string | number | null; completionId?: string | number };
type SharedListItem = { id: string | number; title: string; done: boolean };
type SharedList = { id: string | number; title: string; icon: string; items: SharedListItem[] };

const starterEvents: Event[] = [
  { id: 1, title: "School drop-off", time: "8:10 AM", person: "Everyone", color: "bg-sky-400", startsAt: new Date().toISOString() },
  { id: 2, title: "Maya — dance", time: "4:30 PM", person: "Maya", color: "bg-violet-400", startsAt: new Date().toISOString() },
  { id: 3, title: "Soccer practice", time: "5:30 PM", person: "Owen", color: "bg-amber-400", startsAt: new Date().toISOString() },
  { id: 4, title: "Family dinner", time: "6:30 PM", person: "Everyone", color: "bg-rose-400", startsAt: new Date().toISOString() },
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function listIcon(title: string) {
  const text = title.toLowerCase();
  if (/groc|shop|market/.test(text)) return "🛒";
  if (/dinner|meal|recipe|food/.test(text)) return "🍽️";
  if (/pack|trip|travel|vacation/.test(text)) return "🧳";
  if (/note|idea/.test(text)) return "✦";
  return "☰";
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
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventPerson, setEventPerson] = useState("Family");
  const [eventLocation, setEventLocation] = useState("");
  const [eventCategory, setEventCategory] = useState("General");
  const [calendarAnchor, setCalendarAnchor] = useState(new Date());
  const [activeTab, setActiveTab] = useState<"calendar" | "tasks" | "chores" | "lists" | "settings">("calendar");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [view, setView] = useState<"Day" | "Week" | "Month">("Month");
  const [dark, setDark] = useState(false);
  const [screenSaver, setScreenSaver] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("Your Family Home");
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [chores, setChores] = useState<ChoreEntry[]>([]);
  const [sharedLists, setSharedLists] = useState<SharedList[]>([]);

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
    if (result === "google-connected") setCalendarMessage("Google Calendar connected and synced.");
    if (result === "google-error") setCalendarMessage("Google Calendar could not be connected. Check your setup and try again.");
  }, []);

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
      }
      setDataReady(true);
    });
  }, [user]);

  useEffect(() => {
    if (!supabase || !householdId) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    Promise.all([
      supabase.from("events").select("id, title, starts_at, all_day, color, location, category").eq("household_id", householdId).order("starts_at"),
      supabase.from("todos").select("id, title, due_at, status").eq("household_id", householdId).neq("status", "archived").order("due_at"),
      supabase.from("members").select("id, display_name, role").eq("household_id", householdId).order("created_at"),
      supabase.from("chores").select("id, title, emoji, assignee_member_id").eq("household_id", householdId).eq("active", true).order("created_at"),
      supabase.from("chore_completions").select("id, chore_id").gte("completed_at", todayStart.toISOString()),
      supabase.from("lists").select("id, title, icon").eq("household_id", householdId).order("created_at"),
      supabase.from("list_items").select("id, list_id, title, completed").order("created_at"),
    ]).then(([eventResult, todoResult, memberResult, choreResult, completionResult, listResult, listItemResult]) => {
      if (eventResult.data) setEvents(eventResult.data.map((event) => ({
        id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, location: event.location, category: event.category, allDay: event.all_day,
        time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      })));
      if (todoResult.data) setTodos(todoResult.data.map((todo) => ({ id: todo.id, title: todo.title, due: todo.due_at ? new Date(todo.due_at).toLocaleDateString([], { weekday: "short" }) : "", done: todo.status === "completed" })));
      if (memberResult.data) setMembers(memberResult.data.map((member) => ({ id: member.id, name: member.display_name, role: member.role })));
      if (choreResult.data) {
        const completionByChore = new Map((completionResult.data ?? []).map((completion) => [completion.chore_id, completion.id]));
        setChores(choreResult.data.map((chore) => ({ id: chore.id, title: chore.title, emoji: chore.emoji, assigneeMemberId: chore.assignee_member_id, completionId: completionByChore.get(chore.id) })));
      }
      if (listResult.data) {
        const itemsByList = new Map<string, SharedListItem[]>();
        (listItemResult.data ?? []).forEach((item) => itemsByList.set(item.list_id, [...(itemsByList.get(item.list_id) ?? []), { id: item.id, title: item.title, done: item.completed }]));
        setSharedLists(listResult.data.map((list) => ({ id: list.id, title: list.title, icon: list.icon, items: itemsByList.get(list.id) ?? [] })));
      }
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

  function addEvent(event: FormEvent) {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    const startsAt = new Date(`${eventDate}T${eventTime}:00`);
    if (supabase && user && householdId) {
      supabase.from("events").insert({ household_id: householdId, created_by: user.id, title, starts_at: startsAt.toISOString(), all_day: eventAllDay, color: "#34d399", location: eventLocation.trim() || null, category: eventCategory }).select("id").single().then(({ data, error }) => {
        if (!error && data) setEvents((items) => [...items, { id: data.id, title, time: eventAllDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), person: eventPerson, color: "bg-emerald-400", startsAt: startsAt.toISOString(), location: eventLocation.trim() || null, category: eventCategory, allDay: eventAllDay }]);
      });
    } else {
      setEvents((items) => [...items, { id: Date.now().toString(), title, time: eventAllDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), person: eventPerson, color: "bg-emerald-400", startsAt: startsAt.toISOString(), location: eventLocation.trim() || null, category: eventCategory, allDay: eventAllDay }]);
    }
    setNewItem("");
    setEventLocation("");
    setEventCategory("General");
    setCalendarAnchor(startsAt);
    setShowEventForm(false);
  }

  function addTodo() {
    const title = window.prompt("What needs to get done?");
    if (!title?.trim()) return;
    if (supabase && user && householdId) {
      supabase.from("todos").insert({ household_id: householdId, created_by: user.id, title: title.trim() }).select("id").single().then(({ data, error }) => {
        if (!error && data) setTodos((items) => [...items, { id: data.id, title: title.trim(), due: "", done: false }]);
      });
    } else {
      setTodos((items) => [...items, { id: Date.now().toString(), title: title.trim(), due: "", done: false }]);
    }
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
    setCalendarMessage(result.skipped ? "Google Calendar is already up to date." : `Google Calendar synced${result.imported ? ` · ${result.imported} events checked` : ""}.`);
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
    const emoji = window.prompt("Pick an emoji for it", "✨")?.trim() || "✨";
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
    if (supabase && householdId) await supabase.from("events").update({ title: event.title, starts_at: event.startsAt, all_day: event.allDay ?? false, location: event.location ?? null, category: event.category ?? "General", category_override: true }).eq("id", event.id).eq("household_id", householdId);
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
            <article className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#7dd3fc] via-[#60a5fa] to-[#818cf8] p-5 text-white shadow-lg shadow-sky-200/50"><span className="absolute -right-5 -top-9 size-28 rounded-full bg-yellow-200/70"/><div className="relative flex h-full items-center justify-between gap-4"><div><p className="text-xs font-bold tracking-wide">GOOD MORNING · {weather?.location ?? "LOCAL FORECAST"}</p><p className="mt-2 text-4xl font-black tracking-tighter">{weather ? `${weather.temperature}°` : "—"}</p><p className="text-sm font-semibold text-white/90">{weather ? `${weather.summary} · ↑ ${weather.high}° ↓ ${weather.low}°` : "Allow location for today’s weather"}</p></div><span className="text-5xl drop-shadow-sm">{weather?.summary === "Rain" ? "🌦️" : weather?.summary === "Snow" ? "❄️" : weather?.summary === "Cloudy" ? "☁️" : "☀️"}</span></div></article>
            <article className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-rose-500">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={addTodo} className="grid size-8 place-items-center rounded-xl bg-rose-100 text-lg font-bold text-rose-600 hover:bg-rose-200">+</button></div><div className="mt-3 space-y-1">{openTodos.slice(0, 2).map((todo) => <label key={todo.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} className="size-4 accent-rose-500"/><span className="truncate font-medium">{todo.title}</span></label>)}{openTodos.length === 0 && <p className="text-sm text-slate-400">You&apos;re all caught up.</p>}</div><button onClick={() => setActiveTab("tasks")} className="mt-2 text-xs font-bold text-violet-600">View all tasks →</button></article>
            <article className="rounded-[1.75rem] bg-amber-100 p-5 text-amber-950"><p className="text-xs font-bold text-amber-700">FAMILY NOTE</p><p className="mt-2 text-base font-bold leading-snug">Don&apos;t forget: wear your team jersey for soccer tomorrow!</p><p className="mt-3 text-xs font-semibold text-amber-700">— Mom</p></article>
          </section>
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">FAMILY CALENDAR</p><h2 className="text-2xl font-bold">{calendarAnchor.toLocaleDateString([], { month: "long", year: "numeric" })}</h2></div><div className="flex flex-wrap items-center gap-2"><button onClick={() => googleConnected ? syncGoogleCalendar(true) : connectGoogleCalendar()} disabled={syncingGoogle} className="rounded-xl border border-violet-200 px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200">{syncingGoogle ? "Syncing…" : googleConnected ? "Sync now" : "Connect Google"}</button><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div></div>
            {calendarMessage && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-100">{calendarMessage}</p>}
            <div className="mb-4 flex items-center justify-between"><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, -1))} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">← Previous</button><button onClick={() => setCalendarAnchor(new Date())} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">Today</button><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, 1))} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">Next →</button></div>
            {view === "Day" ? <DayCalendar date={calendarAnchor} events={events} onEdit={setEditingEvent} /> : view === "Week" ? <WeekCalendar anchor={calendarAnchor} events={events} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} /> : <MonthGrid anchor={calendarAnchor} events={events} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} />}
            <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
              {showEventForm ? <form onSubmit={addEvent} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10"><div className="flex items-center justify-between"><p className="font-bold text-violet-800 dark:text-violet-100">Add a family event</p><button type="button" onClick={() => setShowEventForm(false)} className="text-lg font-bold text-violet-500">×</button></div><input required autoFocus value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="What&apos;s happening?" className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-violet-500"/><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Date<input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Time<input disabled={eventAllDay} required type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Category<select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Location<input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="e.g. Backyard or 123 Main St" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label></div><div className="mt-4 flex items-center justify-between"><label className="flex gap-2 text-sm font-bold text-violet-800 dark:text-violet-200"><input type="checkbox" checked={eventAllDay} onChange={(event) => setEventAllDay(event.target.checked)} className="size-4 accent-violet-600" />All day</label><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Save event</button></div></form> : <div className="flex justify-center"><button onClick={() => setShowEventForm(true)} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">+ Add event</button></div>}
            </div>
          </section>
        </div> : activeTab === "tasks" ? <TasksPage todos={todos} onAdd={addTodo} onToggle={toggleTodo} /> : activeTab === "chores" ? <ChoresPage members={members} chores={chores} onAddChild={addChild} onAddChore={addChore} onToggle={toggleChore} /> : activeTab === "settings" ? <SettingsPage googleConnected={googleConnected} onConnect={connectGoogleCalendar} /> : <ListsPage lists={sharedLists} onAddList={addSharedList} onAddItem={addListItem} onToggleItem={toggleListItem} onDeleteList={deleteSharedList} />}
      </div>
      {editingEvent && <EventEditor key={editingEvent.id} event={editingEvent} onClose={() => setEditingEvent(null)} onSave={saveEvent} onDelete={deleteEvent} />}
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

function EventChip({ event, compact = false }: { event: Event; compact?: boolean }) {
  const style = categoryStyle(event.category);
  return <div className={`rounded-lg px-2 ${compact ? "py-0.5" : "py-1"} text-left text-xs font-semibold ${style}`}><span className="block truncate">{categoryIcon(event.category)} {event.title}</span>{event.location && !compact && <span className="block truncate font-medium opacity-75">⌖ {event.location}</span>}</div>;
}

function categoryStyle(category?: string | null) {
  if (category === "School Test/Project Due") return "bg-rose-200 text-rose-950";
  if (category === "Sports") return "bg-emerald-200 text-emerald-950";
  if (category === "Birthday") return "bg-pink-200 text-pink-950";
  if (category === "Vacation") return "bg-sky-200 text-sky-950";
  if (category === "Holiday") return "bg-amber-200 text-amber-950";
  return "bg-violet-100 text-violet-800 dark:bg-violet-400/20 dark:text-violet-100";
}

function categoryIcon(category?: string | null) {
  if (category === "School Test/Project Due") return "✎";
  if (category === "Sports") return "⚽";
  if (category === "Birthday") return "🎂";
  if (category === "Vacation") return "✈";
  if (category === "Holiday") return "✦";
  return "•";
}

function dayCardDecoration(events: Event[]) {
  if (events.some((event) => event.category === "Birthday")) return "ring-2 ring-pink-300 bg-gradient-to-br from-pink-100 via-rose-50 to-violet-100";
  if (events.some((event) => event.category === "Holiday")) return "ring-2 ring-amber-300 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100";
  return "";
}

function DayCalendar({ date, events, onEdit }: { date: Date; events: Event[]; onEdit: (event: Event) => void }) {
  const dayEvents = events.filter((event) => sameDate(new Date(event.startsAt), date));
  return <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><p className="mb-3 text-sm font-bold text-slate-500">{date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>{dayEvents.length ? <div className="space-y-2">{dayEvents.map((event) => <button key={event.id} onClick={() => onEdit(event)} className="flex w-full items-center gap-3 rounded-xl bg-violet-50 p-3 text-left hover:bg-violet-100 dark:bg-violet-400/10"><span className="size-2 rounded-full bg-violet-500"/><div><p className="font-bold">{event.title}</p><p className="text-sm text-slate-500 dark:text-slate-400">{event.time}{event.location ? ` · ${event.location}` : ""}</p></div><span className="ml-auto text-sm font-bold text-violet-600">Edit</span></button>)}</div> : <p className="py-8 text-center text-sm text-slate-400">Nothing scheduled for this day.</p>}</div>;
}

function EventEditor({ event, onClose, onSave, onDelete }: { event: Event; onClose: () => void; onSave: (event: Event) => void; onDelete: (event: Event) => void }) {
  const source = new Date(event.startsAt);
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(source.toISOString().slice(0, 10));
  const [time, setTime] = useState(source.toTimeString().slice(0, 5));
  const [location, setLocation] = useState(event.location ?? "");
  const [category, setCategory] = useState(event.category ?? "General");
  const [allDay, setAllDay] = useState(event.allDay ?? event.time === "All day");
  function submit(formEvent: FormEvent) { formEvent.preventDefault(); const startsAt = new Date(`${date}T${time}:00`); onSave({ ...event, title: title.trim(), startsAt: startsAt.toISOString(), time: allDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), location: location.trim() || null, category, allDay }); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5"><form onSubmit={submit} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">EDIT EVENT</p><h2 className="text-2xl font-bold">Make a change</h2></div><button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button></div><label className="mt-5 block text-sm font-bold">Event title<input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><div className="mt-4 grid grid-cols-2 gap-3"><label className="text-sm font-bold">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="text-sm font-bold">Time<input disabled={allDay} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label></div><label className="mt-4 block text-sm font-bold">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="mt-4 block text-sm font-bold">Category<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><label className="mt-4 flex gap-2 text-sm font-bold"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label><div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => onDelete(event)} className="rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50">Delete event</button><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-500">Cancel</button><button className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white">Save event</button></div></div></form></div>;
}

function WeekCalendar({ anchor, events, onOpenDay }: { anchor: Date; events: Event[]; onOpenDay: (date: Date) => void }) {
  const first = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => sameDate(new Date(event.startsAt), day)); const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`aspect-square min-h-0 overflow-hidden rounded-xl p-2 text-left transition-colors ${isToday ? "bg-violet-600 text-white" : "bg-slate-50 hover:bg-violet-50 dark:bg-white/5 dark:hover:bg-white/10"} ${dayCardDecoration(dayEvents)}`}><div className="h-11"><p className={`text-xs font-bold ${isToday ? "text-white/75" : "text-slate-400"}`}>{day.toLocaleDateString([], { weekday: "short" })}</p><p className="text-lg font-bold">{day.getDate()}</p></div><div className="space-y-1">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} />)}{dayEvents.length > 2 && <p className={`px-1 text-xs font-bold ${isToday ? "text-white" : "text-violet-600"}`}>+{dayEvents.length - 2} more</p>}</div></button>; })}</div>;
}

function MonthGrid({ anchor, events, onOpenDay }: { anchor: Date; events: Event[]; onOpenDay: (date: Date) => void }) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const first = startOfWeek(firstOfMonth);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div><div className="mb-1 grid grid-cols-7 gap-1">{weekdays.map((day) => <p key={day} className="p-1 text-center text-xs font-bold text-slate-400">{day}</p>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => sameDate(new Date(event.startsAt), day)); const currentMonth = day.getMonth() === anchor.getMonth(); const birthday = dayEvents.some((event) => event.category === "Birthday"); const holiday = dayEvents.some((event) => event.category === "Holiday"); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`relative flex aspect-square min-h-0 flex-col items-stretch overflow-hidden rounded-xl p-2 text-left ${currentMonth ? "bg-slate-50 dark:bg-white/5" : "bg-slate-50/40 text-slate-300 dark:bg-white/[.02]"} ${dayCardDecoration(dayEvents)}`}>{birthday && <span className="absolute right-1 top-1 text-sm">🎈</span>}{holiday && <span className="absolute right-1 top-1 text-sm">✨</span>}<span className="flex h-7 shrink-0 items-start justify-start text-left text-sm font-bold leading-none">{day.getDate()}</span><span className="block min-h-0 space-y-1 overflow-hidden text-left">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} compact />)}{dayEvents.length > 2 && <span className="block px-1 text-xs font-bold text-violet-600">+{dayEvents.length - 2} more</span>}</span></button>; })}</div></div>;
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

function TasksPage({ todos, onAdd, onToggle }: { todos: Todo[]; onAdd: () => void; onToggle: (id: string | number) => void }) {
  const open = todos.filter((todo) => !todo.done);
  const completed = todos.filter((todo) => todo.done);
  return <section className="mx-auto max-w-[1600px] px-5 pb-8 md:px-9"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-8"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-rose-500">FAMILY TASKS</p><h2 className="text-3xl font-bold">Today&apos;s to-dos</h2></div><button onClick={onAdd} className="rounded-xl bg-rose-500 px-4 py-3 font-bold text-white">+ Add task</button></div><div className="mt-7 grid gap-4 md:grid-cols-2">{open.map((todo) => <button key={todo.id} onClick={() => onToggle(todo.id)} className="flex items-start gap-4 rounded-2xl bg-rose-50 p-5 text-left hover:bg-rose-100 dark:bg-rose-400/10"><span className="grid size-6 shrink-0 place-items-center rounded-full border-2 border-rose-400 text-rose-500">✓</span><span><b className="block">{todo.title}</b><small className="mt-1 block text-slate-500">{todo.due || "No deadline"}</small></span></button>)}{open.length === 0 && <p className="text-slate-400">You&apos;re all caught up.</p>}</div>{completed.length > 0 && <div className="mt-8 border-t border-slate-100 pt-5 dark:border-white/10"><h3 className="font-bold text-emerald-600">Completed today</h3><div className="mt-3 grid gap-3 md:grid-cols-2">{completed.map((todo) => <button key={todo.id} onClick={() => onToggle(todo.id)} className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-left text-sm text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200"><span>✓</span><span className="line-through">{todo.title}</span><span className="ml-auto text-xs">Restore</span></button>)}</div></div>}</div></section>;
}

function ChoresPage({ members, chores, onAddChild, onAddChore, onToggle }: { members: Member[]; chores: ChoreEntry[]; onAddChild: () => void; onAddChore: (memberId: string | number) => void; onToggle: (chore: ChoreEntry) => void }) {
  const children = members.filter((member) => member.role === "child");
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold text-sky-600">KIDS&apos; CHORES</p><h2 className="text-2xl font-bold">Today&apos;s routines</h2></div><button onClick={onAddChild} className="rounded-xl border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">+ Add child</button></div>{children.length ? <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{children.map((child) => { const childChores = chores.filter((chore) => chore.assigneeMemberId === child.id); const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <div key={child.id} className={`rounded-2xl p-5 ${theme}`}><div className="flex items-center justify-between"><h3 className="text-lg font-bold">{child.name}</h3><button onClick={() => onAddChore(child.id)} className="grid size-8 place-items-center rounded-xl bg-white text-lg font-bold text-slate-600">+</button></div><div className="mt-4 space-y-3">{childChores.map((chore) => <button key={chore.id} onClick={() => onToggle(chore)} className="flex w-full items-center gap-3 text-left"><span className="grid size-10 place-items-center rounded-xl bg-white/70 text-lg">{chore.emoji}</span><span className={`flex-1 text-sm font-bold ${chore.completionId ? "text-slate-400 line-through" : ""}`}>{chore.title}</span><span className={chore.completionId ? "text-emerald-500" : "text-slate-500"}>{chore.completionId ? "✓" : "○"}</span></button>)}{childChores.length === 0 && <p className="text-sm text-slate-600">No chores yet. Tap + to add one.</p>}</div></div>; })}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Add Michael and Lucas (or anyone else) to create their chore boards.</div>}</div></section>;
}

function SettingsPage({ googleConnected, onConnect }: { googleConnected: boolean; onConnect: () => void }) {
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-2xl rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS</p><h2 className="text-3xl font-bold">Calendar connections</h2><article className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5 dark:bg-white/5"><div><p className="font-bold">Google Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{googleConnected ? "Connected. Add another Gmail account here if needed." : "Connect your first Google account to import its calendar."}</p></div><button onClick={onConnect} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">{googleConnected ? "+ Add Google account" : "Connect Google"}</button></article></div></section>;
}

function ListsPage({ lists, onAddList, onAddItem, onToggleItem, onDeleteList }: { lists: SharedList[]; onAddList: () => void; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">SHARED LISTS</p><h2 className="text-3xl font-bold">Keep the house moving</h2></div><button onClick={onAddList} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">+ New list</button></div>{lists.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{lists.map((list) => <ListCard key={list.id} list={list} onAddItem={onAddItem} onToggleItem={onToggleItem} onDeleteList={onDeleteList} />)}</div> : <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-4xl">🛒</p><h3 className="mt-3 text-xl font-bold">Start your first shared list</h3><p className="mt-1 text-slate-500">Groceries, packing, dinner ideas—anything your family needs.</p><button onClick={onAddList} className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">+ New list</button></div>}</section>;
}

function ListCard({ list, onAddItem, onToggleItem, onDeleteList }: { list: SharedList; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  return <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex items-start justify-between"><div><p className="text-3xl">{list.icon}</p><h2 className="mt-3 text-xl font-bold">{list.title}</h2></div><div className="flex gap-2"><button onClick={() => onAddItem(list.id)} className="grid size-9 place-items-center rounded-xl bg-violet-100 text-lg font-bold text-violet-700 hover:bg-violet-200">+</button><button onClick={() => onDeleteList(list)} title={`Delete ${list.title}`} className="grid size-9 place-items-center rounded-xl text-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">⌫</button></div></div><div className="mt-5 space-y-2">{list.items.map((item) => <button key={item.id} onClick={() => onToggleItem(list.id, item.id)} className="flex w-full items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-violet-50 dark:bg-white/5 dark:text-slate-200"><span className={item.done ? "text-emerald-500" : "text-slate-300"}>{item.done ? "✓" : "○"}</span><span className={item.done ? "line-through text-slate-400" : ""}>{item.title}</span></button>)}{list.items.length === 0 && <p className="text-sm text-slate-400">Tap + to add an item.</p>}</div></article>;
}
