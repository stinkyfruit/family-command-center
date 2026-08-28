"use client";

import { useState } from "react";
import type { Event, Member } from "@/features/home/model";
import { WeekCalendar, MonthGrid } from "@/components/home/calendar";

export function CalendarPreview({ anchor, events, members, onOpenCalendar, onOpenDay, onOpenEvent }: { anchor: Date; events: Event[]; members: Member[]; onOpenCalendar: () => void; onOpenDay: (day: Date) => void; onOpenEvent: (event: Event) => void }) {
  const [previewView, setPreviewView] = useState<"Week" | "Month">("Week");

  return <section className="hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:block md:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">CALENDAR</p><h2 className="text-xl font-bold">{previewView === "Week" ? "This week" : "This month"}</h2></div><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Week", "Month"] as const).map((option) => <button key={option} type="button" onClick={() => setPreviewView(option)} aria-pressed={previewView === option} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${previewView === option ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{option}</button>)}</div><button onClick={onOpenCalendar} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">Open calendar</button></div></div><div className="mt-4">{previewView === "Week" ? <WeekCalendar anchor={anchor} events={events} members={members} onEdit={onOpenEvent} onOpenDay={onOpenDay} /> : <MonthGrid anchor={anchor} events={events} members={members} onOpenDay={onOpenDay} />}</div></section>;
}
