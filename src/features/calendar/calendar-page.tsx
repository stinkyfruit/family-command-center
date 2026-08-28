"use client";

import { type ChangeEvent, type FormEvent } from "react";
import type { Event, Member } from "@/features/home/model";
import { AppIcon, StyledSelect } from "@/components/home/shared-ui";
import { CalendarPersonFilter, DayCalendar, MonthGrid, WeekCalendar } from "@/components/home/calendar";
import { shiftCalendar } from "@/components/home/calendar";

export type CalendarView = "Day" | "Week" | "Month";

type CalendarPageProps = {
  anchor: Date;
  events: Event[];
  members: Member[];
  calendarMessage: string;
  hasCalendarConnection: boolean;
  syncingGoogle: boolean;
  onSync: () => void;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onAnchorChange: (date: Date) => void;
  selectedMemberIds: string[];
  showFamilyEvents: boolean;
  onToggleMember: (memberId: string) => void;
  onToggleFamily: () => void;
  onEditEvent: (event: Event) => void;
  onOpenDay: (date: Date) => void;
  onCreateEvent: (day: Date, time?: string) => void;
  showEventForm: boolean;
  onShowEventForm: () => void;
  onCloseEventForm: () => void;
  onSubmitEvent: (event: FormEvent<HTMLFormElement>) => void;
  title: string;
  onTitleChange: (value: string) => void;
  eventDate: string;
  onDateChange: (value: string) => void;
  eventTime: string;
  onTimeChange: (value: string) => void;
  eventEndTime: string;
  onEndTimeChange: (value: string) => void;
  eventAllDay: boolean;
  onAllDayChange: (value: boolean) => void;
  eventCategory: string;
  onCategoryChange: (value: string) => void;
  eventLocation: string;
  onLocationChange: (value: string) => void;
  eventMemberIds: string[];
  onToggleEventMember: (memberId: string) => void;
};

export function CalendarPage({
  anchor,
  events,
  members,
  calendarMessage,
  hasCalendarConnection,
  syncingGoogle,
  onSync,
  view,
  onViewChange,
  onAnchorChange,
  selectedMemberIds,
  showFamilyEvents,
  onToggleMember,
  onToggleFamily,
  onEditEvent,
  onOpenDay,
  onCreateEvent,
  showEventForm,
  onShowEventForm,
  onCloseEventForm,
  onSubmitEvent,
  title,
  onTitleChange,
  eventDate,
  onDateChange,
  eventTime,
  onTimeChange,
  eventEndTime,
  onEndTimeChange,
  eventAllDay,
  onAllDayChange,
  eventCategory,
  onCategoryChange,
  eventLocation,
  onLocationChange,
  eventMemberIds,
  onToggleEventMember,
}: CalendarPageProps) {
  const handleInputChange = (setter: (value: string) => void) => (event: ChangeEvent<HTMLInputElement>) => setter(event.target.value);

  return <section className="rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{anchor.toLocaleDateString([], { month: "long", year: "numeric" })}</h2><div className="flex flex-wrap items-center gap-2"><button onClick={onSync} disabled={syncingGoogle} className="rounded-xl border border-violet-200 px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:border-violet-400/30 dark:text-violet-200">{syncingGoogle ? "Syncing…" : hasCalendarConnection ? "Sync all" : "Connect Google"}</button><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week", "Month"] as const).map((item) => <button key={item} onClick={() => onViewChange(item)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${view === item ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{item}</button>)}</div></div></div>
    {calendarMessage && <p className="mt-3 rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 dark:bg-violet-400/10 dark:text-violet-100">{calendarMessage}</p>}
    <div className="mb-4 flex items-center justify-between"><button onClick={() => onAnchorChange(shiftCalendar(anchor, view, -1))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10"><AppIcon name="chevronLeft" className="size-4"/>Previous</button><button onClick={() => onAnchorChange(new Date())} className="rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10">Today</button><button onClick={() => onAnchorChange(shiftCalendar(anchor, view, 1))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-50 dark:hover:bg-white/10">Next<AppIcon name="chevronRight" className="size-4"/></button></div>
    <CalendarPersonFilter members={members} selectedMemberIds={selectedMemberIds} showFamilyEvents={showFamilyEvents} onToggleMember={onToggleMember} onToggleFamily={onToggleFamily} />
    {view === "Day" ? <DayCalendar date={anchor} events={events} members={members} onEdit={onEditEvent} /> : view === "Week" ? <WeekCalendar anchor={anchor} events={events} members={members} onEdit={onEditEvent} onOpenDay={onOpenDay} onCreate={onCreateEvent} /> : <MonthGrid anchor={anchor} events={events} members={members} onOpenDay={onOpenDay} />}
    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/10">
      {showEventForm ? <form onSubmit={onSubmitEvent} className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-500/10"><div className="flex items-center justify-between"><p className="font-bold text-violet-800 dark:text-violet-100">Add a family event</p><button type="button" onClick={onCloseEventForm} className="text-lg font-bold text-violet-500">×</button></div><div className="mt-3"><input required autoFocus value={title} onChange={handleInputChange(onTitleChange)} placeholder="What&apos;s happening?" className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800 outline-violet-500"/></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Date<input required type="date" value={eventDate} onChange={handleInputChange(onDateChange)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800" /></label><div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Starts<input disabled={eventAllDay} required type="time" value={eventTime} onChange={handleInputChange(onTimeChange)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Ends<input disabled={eventAllDay} required type="time" value={eventEndTime} onChange={handleInputChange(onEndTimeChange)} className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-2 py-2 text-sm text-slate-800 disabled:opacity-50" /></label></div><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Category<StyledSelect value={eventCategory} onChange={(event) => onCategoryChange(event.target.value)}><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></StyledSelect></label><label className="text-xs font-bold text-violet-800 dark:text-violet-200">Location<input value={eventLocation} onChange={handleInputChange(onLocationChange)} placeholder="e.g. Backyard or 123 Main St" className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800"/></label></div><fieldset className="mt-3"><legend className="text-xs font-bold text-violet-800 dark:text-violet-200">Who is this for?</legend><div className="mt-1 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = eventMemberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-white text-violet-700 ring-1 ring-violet-200"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => onToggleEventMember(id)}/>{member.name}</label>; })}</div></fieldset><div className="mt-4 flex items-center justify-between"><label className="flex gap-2 text-sm font-bold text-violet-800 dark:text-violet-200"><input type="checkbox" checked={eventAllDay} onChange={(event) => onAllDayChange(event.target.checked)} className="size-4 accent-violet-600" />All day</label><button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white">Save event</button></div></form> : <div className="flex justify-center"><button onClick={onShowEventForm} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">+ Add event</button></div>}
    </div>
  </section>;
}
