"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Event = { id: string | number; title: string; time: string; person: string; color: string; startsAt: string; location?: string | null; category?: string | null };
type Todo = { id: string | number; title: string; due: string; done: boolean };
type Weather = { temperature: number; high: number; low: number; summary: string; location: string };

const starterEvents: Event[] = [
  { id: 1, title: "School drop-off", time: "8:10 AM", person: "Everyone", color: "bg-sky-400", startsAt: new Date().toISOString() },
  { id: 2, title: "Maya — dance", time: "4:30 PM", person: "Maya", color: "bg-violet-400", startsAt: new Date().toISOString() },
  { id: 3, title: "Soccer practice", time: "5:30 PM", person: "Owen", color: "bg-amber-400", startsAt: new Date().toISOString() },
  { id: 4, title: "Family dinner", time: "6:30 PM", person: "Everyone", color: "bg-rose-400", startsAt: new Date().toISOString() },
];

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [activeTab, setActiveTab] = useState<"calendar" | "tasks" | "lists">("calendar");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [dark, setDark] = useState(false);
  const [screenSaver, setScreenSaver] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState("Your Family Home");
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);

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
    Promise.all([
      supabase.from("events").select("id, title, starts_at, all_day, color, location, category").eq("household_id", householdId).order("starts_at"),
      supabase.from("todos").select("id, title, due_at, status").eq("household_id", householdId).neq("status", "archived").order("due_at"),
    ]).then(([eventResult, todoResult]) => {
      if (eventResult.data) setEvents(eventResult.data.map((event) => ({
        id: event.id, title: event.title, person: "Family", color: "bg-violet-400", startsAt: event.starts_at, location: event.location, category: event.category,
        time: event.all_day ? "All day" : new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      })));
      if (todoResult.data) setTodos(todoResult.data.map((todo) => ({ id: todo.id, title: todo.title, due: todo.due_at ? new Date(todo.due_at).toLocaleDateString([], { weekday: "short" }) : "", done: todo.status === "completed" })));
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
        if (!error && data) setEvents((items) => [...items, { id: data.id, title, time: eventAllDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), person: eventPerson, color: "bg-emerald-400", startsAt: startsAt.toISOString(), location: eventLocation.trim() || null, category: eventCategory }]);
      });
    } else {
      setEvents((items) => [...items, { id: Date.now().toString(), title, time: eventAllDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), person: eventPerson, color: "bg-emerald-400", startsAt: startsAt.toISOString(), location: eventLocation.trim() || null, category: eventCategory }]);
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

  function toggleTodo(id: string | number) {
    const target = todos.find((todo) => todo.id === id);
    if (!target) return;
    const done = !target.done;
    setTodos((items) => items.map((todo) => todo.id === id ? { ...todo, done } : todo));
    if (supabase && householdId) supabase.from("todos").update({ status: done ? "completed" : "open", completed_at: done ? new Date().toISOString() : null }).eq("id", id).eq("household_id", householdId).then(() => undefined);
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
      <div className="min-h-screen bg-[#f8f7ff] text-slate-900 transition-colors dark:bg-[#151522] dark:text-slate-100">
        <header className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-5 py-5 md:px-9">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-600 text-xl shadow-lg shadow-violet-300/50">✦</div><div><h1 className="text-xl font-bold tracking-tight">{householdName}</h1><p className="text-sm text-slate-500 dark:text-slate-400">Wednesday, August 19</p></div></div>
          <nav className="order-3 flex w-full gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:order-none md:w-auto">{([ ["calendar", "▦ Calendar"], ["tasks", "✓ Tasks"], ["lists", "☰ Lists"] ] as const).map(([tab, label]) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-2 text-sm font-bold ${activeTab === tab ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10"}`}>{label}</button>)}</nav>
          <div className="flex items-center gap-2"><button onClick={() => setScreenSaver(true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">Photos</button><button onClick={() => setDark((value) => !value)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:ring-white/10">{dark ? "☀ Light" : "☾ Dark"}</button></div>
        </header>
        {activeTab === "calendar" ? <div className="mx-auto grid max-w-[1600px] gap-5 px-5 pb-8 md:px-9 xl:grid-cols-[1fr_2.6fr_1fr]">
          <section className="space-y-5">
            <article className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#7dd3fc] via-[#60a5fa] to-[#818cf8] p-6 text-white shadow-lg shadow-sky-200/50"><span className="absolute -right-8 -top-10 size-36 rounded-full bg-yellow-200/70 blur-[1px]"/><span className="absolute right-14 top-5 size-9 rounded-full bg-white/35"/><span className="absolute right-6 top-12 h-6 w-20 rounded-full bg-white/25"/><div className="relative"><div className="flex items-center justify-between"><div><p className="font-bold tracking-wide">GOOD MORNING</p><p className="mt-1 text-sm text-sky-50">{weather?.location ?? "Your local forecast"}</p></div><span className="text-5xl drop-shadow-sm">{weather?.summary === "Rain" ? "🌦️" : weather?.summary === "Snow" ? "❄️" : weather?.summary === "Cloudy" ? "☁️" : "☀️"}</span></div><div className="mt-8 flex items-end justify-between"><div><p className="text-7xl font-black tracking-tighter">{weather ? `${weather.temperature}°` : "—"}</p><p className="mt-1 text-base font-semibold text-white/90">{weather ? `${weather.summary} skies` : "Let’s find your weather"}</p></div>{weather && <div className="rounded-2xl border border-white/25 bg-white/20 px-4 py-3 text-center backdrop-blur-sm"><p className="text-xs font-bold text-white/75">TODAY</p><p className="mt-1 text-sm font-bold">↑ {weather.high}° &nbsp; ↓ {weather.low}°</p></div>}</div><p className="mt-5 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-white/90">{weather ? "A beautiful day for family adventures!" : "Allow location to see today’s forecast."}</p></div></article>
            <article className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">Chore corner</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Today</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-400/10"><p className="mb-3 font-bold text-sky-800 dark:text-sky-200">Michael</p><div className="space-y-3"><Chore emoji="🐕" title="Walk Charlie" person="After school" /><Chore emoji="♻️" title="Recycling" person="Before dinner" /></div></div><div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-400/10"><p className="mb-3 font-bold text-amber-800 dark:text-amber-200">Lucas</p><div className="space-y-3"><Chore emoji="🧺" title="Laundry" person="Put away" /><Chore emoji="🧽" title="Wipe table" person="After dinner" /></div></div></div></article>
          </section>
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">FAMILY CALENDAR</p><h2 className="text-2xl font-bold">{calendarAnchor.toLocaleDateString([], { month: "long", year: "numeric" })}</h2></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div>
            <form onSubmit={addEvent} className="my-6 rounded-2xl bg-violet-50 p-2 dark:bg-violet-500/10"><div className="flex gap-2"><input required value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="What&apos;s happening?" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-violet-400"/><button type="button" onClick={() => setShowEventForm((value) => !value)} className="rounded-xl px-3 text-sm font-bold text-violet-700 hover:bg-violet-100 dark:text-violet-200">Details</button><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">+ Add</button></div>{showEventForm && <div className="mt-3 grid gap-3 border-t border-violet-100 px-2 pt-3 sm:grid-cols-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Date<input required type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Time<input disabled={eventAllDay} required type="time" value={eventTime} onChange={(event) => setEventTime(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Category<select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800"><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></select></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Location<input value={eventLocation} onChange={(event) => setEventLocation(event.target.value)} placeholder="e.g. Backyard or 123 Main St" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><label className="flex items-end gap-2 pb-2 text-sm font-bold text-violet-800 dark:text-violet-200"><input type="checkbox" checked={eventAllDay} onChange={(event) => setEventAllDay(event.target.checked)} className="size-4 accent-violet-600" />All day</label></div>}</form>
            <div className="mb-4 flex items-center justify-between"><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, -1))} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">← Previous</button><button onClick={() => setCalendarAnchor(new Date())} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">Today</button><button onClick={() => setCalendarAnchor(shiftCalendar(calendarAnchor, view, 1))} className="rounded-lg px-3 py-1 text-sm font-bold text-violet-700 hover:bg-violet-50">Next →</button></div>
            {view === "Day" ? <DayCalendar date={calendarAnchor} events={events} /> : view === "Week" ? <WeekCalendar anchor={calendarAnchor} events={events} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} /> : <MonthGrid anchor={calendarAnchor} events={events} onOpenDay={(date) => { setCalendarAnchor(date); setView("Day"); }} />}
          </section>
          <section className="space-y-5"><article className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-rose-500">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={addTodo} className="grid size-9 place-items-center rounded-xl bg-rose-100 text-xl font-bold text-rose-600 hover:bg-rose-200">+</button></div><div className="space-y-3">{openTodos.map((todo) => <label key={todo.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} className="mt-1 size-4 accent-rose-500"/><span className="flex-1 text-sm font-medium">{todo.title}{todo.due && <small className="mt-1 block font-semibold text-slate-400">{todo.due}</small>}</span></label>)}</div><button onClick={() => setActiveTab("tasks")} className="mt-4 text-sm font-bold text-violet-600">View all tasks →</button></article><article className="rounded-[1.75rem] bg-amber-100 p-6 text-amber-950"><p className="text-sm font-bold text-amber-700">FAMILY NOTE</p><p className="mt-2 text-lg font-bold leading-snug">Don&apos;t forget: wear your team jersey for soccer tomorrow!</p><p className="mt-4 text-sm font-semibold text-amber-700">— Mom</p></article></section>
        </div> : activeTab === "tasks" ? <TasksPage todos={todos} onAdd={addTodo} onToggle={toggleTodo} /> : <ListsPage />}
      </div>
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

function EventChip({ event }: { event: Event }) {
  const style = categoryStyle(event.category);
  return <div className={`rounded-lg px-2 py-1 text-left text-xs font-semibold ${style}`}><span className="block truncate">{categoryIcon(event.category)} {event.title}</span>{event.location && <span className="block truncate font-medium opacity-75">⌖ {event.location}</span>}</div>;
}

function categoryStyle(category?: string | null) {
  if (category === "School Test/Project Due") return "bg-rose-100 text-rose-800";
  if (category === "Sports") return "bg-emerald-100 text-emerald-800";
  if (category === "Birthday") return "bg-pink-100 text-pink-800";
  if (category === "Vacation") return "bg-sky-100 text-sky-800";
  if (category === "Holiday") return "bg-amber-100 text-amber-800";
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

function DayCalendar({ date, events }: { date: Date; events: Event[] }) {
  const dayEvents = events.filter((event) => sameDate(new Date(event.startsAt), date));
  return <div className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><p className="mb-3 text-sm font-bold text-slate-500">{date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p>{dayEvents.length ? <div className="space-y-2">{dayEvents.map((event) => <div key={event.id} className="flex items-center gap-3 rounded-xl bg-violet-50 p-3 dark:bg-violet-400/10"><span className="size-2 rounded-full bg-violet-500"/><div><p className="font-bold">{event.title}</p><p className="text-sm text-slate-500 dark:text-slate-400">{event.time}{event.location ? ` · ${event.location}` : ""}</p></div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">Nothing scheduled for this day.</p>}</div>;
}

function WeekCalendar({ anchor, events, onOpenDay }: { anchor: Date; events: Event[]; onOpenDay: (date: Date) => void }) {
  const first = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => sameDate(new Date(event.startsAt), day)); const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`aspect-square min-h-0 overflow-hidden rounded-xl p-2 text-left transition-colors ${isToday ? "bg-violet-600 text-white" : "bg-slate-50 hover:bg-violet-50 dark:bg-white/5 dark:hover:bg-white/10"} ${dayCardDecoration(dayEvents)}`}><div className="h-11"><p className={`text-xs font-bold ${isToday ? "text-white/75" : "text-slate-400"}`}>{day.toLocaleDateString([], { weekday: "short" })}</p><p className="text-lg font-bold">{day.getDate()}</p></div><div className="space-y-1">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} />)}{dayEvents.length > 2 && <p className={`px-1 text-xs font-bold ${isToday ? "text-white" : "text-violet-600"}`}>+{dayEvents.length - 2} more</p>}</div></button>; })}</div>;
}

function MonthGrid({ anchor, events, onOpenDay }: { anchor: Date; events: Event[]; onOpenDay: (date: Date) => void }) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const first = startOfWeek(firstOfMonth);
  const days = Array.from({ length: 35 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div><div className="mb-1 grid grid-cols-7 gap-1">{weekdays.map((day) => <p key={day} className="p-1 text-center text-xs font-bold text-slate-400">{day}</p>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => sameDate(new Date(event.startsAt), day)); const currentMonth = day.getMonth() === anchor.getMonth(); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`flex aspect-square min-h-0 flex-col items-stretch overflow-hidden rounded-xl p-2 text-left ${currentMonth ? "bg-slate-50 dark:bg-white/5" : "bg-slate-50/40 text-slate-300 dark:bg-white/[.02]"} ${dayCardDecoration(dayEvents)}`}><span className="flex h-7 shrink-0 items-start justify-start text-left text-sm font-bold leading-none">{day.getDate()}</span><span className="block min-h-0 space-y-1 overflow-hidden text-left">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} />)}{dayEvents.length > 2 && <span className="block px-1 text-xs font-bold text-violet-600">+{dayEvents.length - 2} more</span>}</span></button>; })}</div></div>;
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

function ListsPage() {
  return <section className="mx-auto max-w-[1600px] px-5 pb-8 md:px-9"><div className="grid gap-5 md:grid-cols-3"><ListCard icon="🛒" title="Groceries" items={["Milk", "Fruit", "Lunchbox snacks"]} /><ListCard icon="🍽️" title="Dinner ideas" items={["Taco night", "Pasta bake", "Breakfast for dinner"]} /><ListCard icon="✦" title="Family notes" items={["Picture day Friday", "Bring library books"]} /></div></section>;
}

function ListCard({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return <article className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-3xl">{icon}</p><h2 className="mt-3 text-xl font-bold">{title}</h2><div className="mt-5 space-y-3">{items.map((item) => <p key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-200">{item}</p>)}</div></article>;
}
