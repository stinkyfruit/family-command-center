"use client";

import type { AuroraActivity, CometCloseApproach, Event, Member, MoodCheckin, MoodKey, Todo, Weather } from "@/features/home/model";
import { FamilyMoodCard } from "@/components/home/mood";
import { PhoneHomeCalendar } from "@/components/home/calendar";
import { CalendarPreview } from "@/features/calendar/calendar-page";
import { WeatherCard } from "@/features/weather/weather-card";

type HomeDashboardProps = {
  weather: Weather | null;
  onOpenWeatherForecast: () => void;
  dark: boolean;
  sunTimes: { sunrise: number; sunset: number } | null;
  auroraActivity: AuroraActivity | null;
  cometCloseApproach: CometCloseApproach | null;
  openTodos: Todo[];
  members: Member[];
  visibleCalendarEvents: Event[];
  onAddTodo: () => void;
  onToggleTodo: (todoId: string | number) => void;
  onOpenTasks: () => void;
  onOpenCalendar: () => void;
  onOpenCalendarDay: (day: Date) => void;
  onOpenEvent: (event: Event) => void;
  moodCheckins: MoodCheckin[];
  moodMemberId: string;
  selectedMood: MoodKey;
  savingMood: boolean;
  moodMessage: string;
  onMoodMemberChange: (memberId: string) => void;
  onMoodChange: (mood: MoodKey) => void;
  onSaveMood: () => Promise<boolean>;
  calendarAnchor: Date;
};

export function HomeDashboard({
  weather,
  onOpenWeatherForecast,
  sunTimes,
  auroraActivity,
  cometCloseApproach,
  openTodos,
  members,
  visibleCalendarEvents,
  onAddTodo,
  onToggleTodo,
  onOpenTasks,
  onOpenCalendar,
  onOpenCalendarDay,
  onOpenEvent,
  moodCheckins,
  moodMemberId,
  selectedMood,
  savingMood,
  moodMessage,
  onMoodMemberChange,
  onMoodChange,
  onSaveMood,
  calendarAnchor,
}: HomeDashboardProps) {
  return <>
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
      <WeatherCard weather={weather} sunTimes={sunTimes} auroraActivity={auroraActivity} cometCloseApproach={cometCloseApproach} onOpenForecast={onOpenWeatherForecast} />
      <article className="min-w-0 overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-violet-600">ADULT SPACE</p><h2 className="text-lg font-bold">To-dos</h2></div><button onClick={onAddTodo} className="grid size-8 place-items-center rounded-xl bg-violet-100 text-lg font-bold text-violet-600 hover:bg-violet-200">+</button></div><div className="mt-3 min-w-0 space-y-1">{openTodos.slice(0, 5).map((todo) => { const assignee = members.find((member) => member.id === todo.assigneeMemberId); return <label key={todo.id} className="flex min-w-0 cursor-pointer items-center gap-2 rounded-lg p-1 text-sm hover:bg-slate-50 dark:hover:bg-white/5"><input type="checkbox" checked={todo.done} onChange={() => onToggleTodo(todo.id)} className="size-4 accent-violet-500"/><span className="min-w-0 flex-1 truncate font-medium">{todo.title}</span>{assignee && <span className="max-w-24 shrink-0 truncate rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${assignee.color ?? "#fda4af"}33`, color: assignee.color ?? "#be123c" }}>{assignee.name}</span>}</label>; })}{openTodos.length === 0 && <p className="text-sm text-slate-400">You&apos;re all caught up.</p>}</div><button onClick={onOpenTasks} className="mt-2 text-xs font-bold text-violet-600">View all tasks →</button></article>
      <div className="min-w-0 md:hidden"><PhoneHomeCalendar events={visibleCalendarEvents} members={members} onOpenDay={onOpenCalendarDay} onOpenEvent={onOpenEvent} /></div>
      <FamilyMoodCard members={members} checkins={moodCheckins} selectedMemberId={moodMemberId} selectedMood={selectedMood} saving={savingMood} message={moodMessage} onMemberChange={onMoodMemberChange} onMoodChange={onMoodChange} onSave={onSaveMood} />
    </section>
    <CalendarPreview anchor={calendarAnchor} events={visibleCalendarEvents} members={members} onOpenCalendar={onOpenCalendar} onOpenDay={onOpenCalendarDay} />
  </>;
}
