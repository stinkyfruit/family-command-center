"use client";

import { FormEvent, useMemo, useState } from "react";

type Event = { id: number; title: string; time: string; person: string; color: string };
type Todo = { id: number; title: string; due: string; done: boolean };

const starterEvents: Event[] = [
  { id: 1, title: "School drop-off", time: "8:10 AM", person: "Everyone", color: "bg-sky-400" },
  { id: 2, title: "Maya — dance", time: "4:30 PM", person: "Maya", color: "bg-violet-400" },
  { id: 3, title: "Soccer practice", time: "5:30 PM", person: "Owen", color: "bg-amber-400" },
  { id: 4, title: "Family dinner", time: "6:30 PM", person: "Everyone", color: "bg-rose-400" },
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
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [dark, setDark] = useState(false);
  const [screenSaver, setScreenSaver] = useState(false);
  const openTodos = useMemo(() => todos.filter((todo) => !todo.done), [todos]);

  function addEvent(event: FormEvent) {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    setEvents((items) => [...items, { id: Date.now(), title, time: "All day", person: "Family", color: "bg-emerald-400" }]);
    setNewItem("");
  }

  function addTodo() {
    const title = window.prompt("What needs to get done?");
    if (!title?.trim()) return;
    setTodos((items) => [...items, { id: Date.now(), title: title.trim(), due: "", done: false }]);
  }

  if (screenSaver) return <Screensaver onExit={() => setScreenSaver(false)} />;

  return (
    <main className={dark ? "dark min-h-screen" : "min-h-screen"}>
      <div className="min-h-screen bg-[#f8f7ff] text-slate-900 transition-colors dark:bg-[#151522] dark:text-slate-100">
        <header className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-5 md:px-9">
          <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-violet-600 text-xl shadow-lg shadow-violet-300/50">✦</div><div><h1 className="text-xl font-bold tracking-tight">The Miller Home</h1><p className="text-sm text-slate-500 dark:text-slate-400">Wednesday, August 19</p></div></div>
          <div className="flex items-center gap-2"><button onClick={() => setScreenSaver(true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">Photos</button><button onClick={() => setDark((value) => !value)} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-white/10 dark:ring-white/10">{dark ? "☀ Light" : "☾ Dark"}</button></div>
        </header>
        <div className="mx-auto grid max-w-[1600px] gap-5 px-5 pb-8 md:px-9 xl:grid-cols-[1.2fr_2.2fr_1.2fr]">
          <section className="space-y-5">
            <article className="overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-sky-400 to-cyan-500 p-6 text-white shadow-lg shadow-sky-200/50"><div className="flex justify-between"><span className="font-semibold">Good morning</span><span className="text-3xl">☀️</span></div><div className="mt-7 flex items-end justify-between"><div><p className="text-6xl font-bold">76°</p><p className="mt-1 text-sky-50">Clear · Austin, TX</p></div><p className="rounded-full bg-white/20 px-3 py-1 text-sm">H: 86° · L: 68°</p></div></article>
            <article className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-bold">Chore corner</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">2 of 4 done</span></div><div className="space-y-4"><Chore emoji="🧺" title="Laundry" person="Maya" done /><Chore emoji="🐕" title="Walk Charlie" person="Owen" /><Chore emoji="♻️" title="Take out recycling" person="Everyone" /></div></article>
          </section>
          <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-violet-600">TODAY&apos;S PLAN</p><h2 className="text-2xl font-bold">Wednesday, August 19</h2></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div>
            <form onSubmit={addEvent} className="my-6 flex gap-2 rounded-2xl bg-violet-50 p-2 dark:bg-violet-500/10"><input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Add an event — “Piano Friday at 4”" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-violet-400"/><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">+ Add</button></form>
            {view === "Month" ? <MonthGrid /> : <div className="space-y-1">{events.map((event) => <div key={event.id} className="group flex items-center gap-4 rounded-2xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-white/5"><p className="w-16 shrink-0 text-sm font-bold text-slate-500 dark:text-slate-400">{event.time}</p><span className={`size-3 shrink-0 rounded-full ${event.color}`} /><div className="min-w-0 flex-1"><p className="font-bold">{event.title}</p><p className="text-sm text-slate-500 dark:text-slate-400">{event.person}</p></div><button onClick={() => setEvents((items) => items.filter((item) => item.id !== event.id))} className="text-slate-300 hover:text-rose-500" aria-label={`Remove ${event.title}`}>×</button></div>)}</div>}
            {view === "Week" && <div className="mt-7 grid grid-cols-7 gap-1 border-t border-slate-100 pt-5 dark:border-white/10">{weekdays.map((day, index) => <div key={day} className={`rounded-xl p-2 text-center text-xs font-semibold ${index === 2 ? "bg-violet-600 text-white" : "text-slate-500 dark:text-slate-400"}`}><p>{day}</p><p className="mt-1 text-base">{17 + index}</p></div>)}</div>}
          </section>
          <section className="space-y-5"><article className="rounded-[1.75rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="mb-5 flex items-center justify-between"><div><p className="text-sm font-semibold text-rose-500">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={addTodo} className="grid size-9 place-items-center rounded-xl bg-rose-100 text-xl font-bold text-rose-600 hover:bg-rose-200">+</button></div><div className="space-y-3">{openTodos.map((todo) => <label key={todo.id} className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => setTodos((items) => items.map((item) => item.id === todo.id ? { ...item, done: true } : item))} className="mt-1 size-4 accent-rose-500"/><span className="flex-1 text-sm font-medium">{todo.title}{todo.due && <small className="mt-1 block font-semibold text-slate-400">{todo.due}</small>}</span></label>)}</div><button className="mt-4 text-sm font-bold text-violet-600">View all tasks →</button></article><article className="rounded-[1.75rem] bg-amber-100 p-6 text-amber-950"><p className="text-sm font-bold text-amber-700">FAMILY NOTE</p><p className="mt-2 text-lg font-bold leading-snug">Don&apos;t forget: wear your team jersey for soccer tomorrow!</p><p className="mt-4 text-sm font-semibold text-amber-700">— Mom</p></article></section>
        </div>
      </div>
    </main>
  );
}

function Chore({ emoji, title, person, done = false }: { emoji: string; title: string; person: string; done?: boolean }) {
  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-lg dark:bg-amber-400/10">{emoji}</span><div className="flex-1"><p className={`text-sm font-bold ${done ? "line-through text-slate-400" : ""}`}>{title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{person}</p></div><span className={done ? "text-emerald-500" : "text-slate-300"}>{done ? "✓" : "○"}</span></div>;
}

function MonthGrid() {
  return <div className="grid grid-cols-7 gap-2 pt-6">{Array.from({ length: 35 }, (_, index) => <div key={index} className={`aspect-square rounded-xl p-2 text-sm ${index === 16 ? "bg-violet-600 font-bold text-white" : "bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-300"}`}>{index + 1 <= 31 ? index + 1 : ""}{index === 16 && <span className="mt-1 block size-1.5 rounded-full bg-amber-300"/>}</div>)}</div>;
}

function Screensaver({ onExit }: { onExit: () => void }) {
  return <main className="min-h-screen cursor-pointer bg-[radial-gradient(circle_at_30%_20%,#fbcfe8,transparent_24%),radial-gradient(circle_at_70%_70%,#bfdbfe,transparent_28%),linear-gradient(120deg,#312e81,#0f766e)] p-8 text-white" onClick={onExit}><div className="flex h-[calc(100vh-4rem)] flex-col justify-between rounded-[2rem] border border-white/25 bg-black/10 p-8 backdrop-blur-sm"><div className="flex items-center justify-between text-lg font-medium text-white/80"><span>Good evening, family</span><span>Tap anywhere to return</span></div><div><p className="text-7xl font-semibold tracking-tight md:text-9xl">7:42</p><p className="mt-3 text-2xl text-white/80">Wednesday, August 19</p></div><div className="flex flex-wrap items-center gap-4 text-lg"><span className="rounded-full bg-white/20 px-4 py-2">☀️ 76° · Clear skies</span><span className="rounded-full bg-white/20 px-4 py-2">Next: Dance · 4:30 PM</span></div></div></main>;
}
