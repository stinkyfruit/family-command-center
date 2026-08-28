import { FormEvent, useMemo, useState } from "react";
import type { Event, Member } from "@/features/home/model";
import { defaultMemberColor, localDateInputValue, weekdays } from "@/features/home/model";
import { AppIcon, NotoEmoji, StyledSelect } from "@/components/home/shared-ui";

export function sameDate(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

function allDayCalendarDate(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function visibleCalendarDate(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

// Google represents all-day dates as midnight UTC. Compare those with the
// visible local calendar date using UTC fields so they never slide a day when
// the dashboard is used outside UTC. Google and iCalendar use an exclusive
// end date for all-day events, so an event from June 10 through June 13 is
// visible on June 10, 11, and 12.
export function eventOccursOn(event: Event, day: Date) {
  const startsAt = new Date(event.startsAt);
  if (event.allDay) {
    const startDate = allDayCalendarDate(startsAt);
    const endDate = isBirthdayEvent(event) ? startDate + 86_400_000 : event.endsAt ? allDayCalendarDate(new Date(event.endsAt)) : startDate + 86_400_000;
    const dayDate = visibleCalendarDate(day);
    return dayDate >= startDate && dayDate < endDate;
  }
  return sameDate(startsAt, day);
}

export function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setDate(date.getDate() - date.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

export function shiftCalendar(date: Date, view: "Day" | "Week" | "Month", direction: number) {
  const result = new Date(date);
  if (view === "Month") result.setMonth(result.getMonth() + direction);
  else result.setDate(result.getDate() + direction * (view === "Week" ? 7 : 1));
  return result;
}

export function memberCalendarColor(member: Member, index: number) {
  const name = member.name.toLowerCase();
  if (member.color && member.color !== defaultMemberColor) return member.color;
  if (name === "michael") return "#86efac";
  if (name === "lucas") return "#fb923c";
  return ["#a5b4fc", "#f9a8d4", "#fde68a", "#67e8f9", "#c4b5fd"][index % 5];
}

export function eventBlockBackground(event: Event, members: Member[]) {
  if (event.generatedHoliday) return "linear-gradient(135deg,#fde68a,#fda4af,#c4b5fd)";
  if (event.generatedSkyEvent) return "linear-gradient(135deg,#bfdbfe,#c4b5fd,#fde68a)";
  const colors = eventMembers(event, members).map((member) => memberCalendarColor(member, members.indexOf(member)));
  if (!colors.length) return "#e2e8f0";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors.map((color, index) => `${color} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`).join(", ")})`;
}

// Older imports may predate categories. Recognize common birthday wording in
// the UI too, so those cards stay festive immediately rather than waiting for
// a future sync to update their saved category.
export function isBirthdayEvent(event: Event) {
  return event.category?.trim().toLocaleLowerCase() === "birthday" || /\b(?:birthday|bday|birth[\s-]+day)\b/i.test(event.title);
}

export function holidayEmoji(title: string) {
  if (/Halloween/.test(title)) return "🎃";
  if (/Christmas/.test(title)) return "🎄";
  if (/Thanksgiving/.test(title)) return "🦃";
  if (/Independence/.test(title)) return "🎆";
  if (/Easter/.test(title)) return "🐣";
  if (/Valentine/.test(title)) return "💗";
  if (/New Year/.test(title)) return "🎉";
  return "✨";
}

export function eventCategoryIcon(event: Event) {
  if (event.generatedHoliday || event.category === "Holiday") return holidayEmoji(event.title);
  if (event.generatedSkyEvent) return event.skyEventKind === "solar" ? "☀️" : "🌙";
  if (isBirthdayEvent(event)) return "🎂";
  if (event.category === "Sports") return "⚽";
  if (event.category === "School Test/Project Due") return "📝";
  if (event.category === "Vacation") return "✈️";
  return "";
}

export function eventMembers(event: Event, members: Member[]) {
  return (event.memberIds ?? []).map((id) => members.find((member) => String(member.id) === id)).filter((member): member is Member => Boolean(member));
}

export function CalendarPersonFilter({ members, selectedMemberIds, showFamilyEvents, onToggleMember, onToggleFamily }: { members: Member[]; selectedMemberIds: string[]; showFamilyEvents: boolean; onToggleMember: (memberId: string) => void; onToggleFamily: () => void }) {
  return <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300"><button type="button" onClick={onToggleFamily} aria-label="Toggle Family" aria-pressed={showFamilyEvents} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:hover:bg-white/10 ${showFamilyEvents ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : ""}`}><i aria-hidden="true" className="size-3 rounded-full bg-slate-300 dark:bg-slate-500"/>Family</button>{members.map((member, index) => { const selected = selectedMemberIds.includes(String(member.id)); return <button key={member.id} type="button" onClick={() => onToggleMember(String(member.id))} aria-label={`Toggle ${member.name}'s events`} aria-pressed={selected} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 dark:hover:bg-white/10 ${selected ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : ""}`}><i aria-hidden="true" className="size-3 rounded-full" style={{ background: memberCalendarColor(member, index) }}/>{member.name}</button>; })}</div>;
}

export function EventChip({ event, members, compact = false }: { event: Event; members: Member[]; compact?: boolean }) {
  const icon = eventCategoryIcon(event);
  return <div style={{ background: eventBlockBackground(event, members) }} className={`rounded-sm px-3 ${compact ? "py-1" : "py-1.5"} text-left text-xs font-semibold text-slate-900`}><span className="flex items-center gap-1 truncate">{icon && <NotoEmoji emoji={icon} className="size-3.5" />}{event.title}</span>{event.location && !compact && <span className="block truncate font-medium opacity-75">⌖ {event.location}</span>}</div>;
}

export function EventDetails({ event, members, onClose, onEdit }: { event: Event; members: Member[]; onClose: () => void; onEdit: () => void }) {
  const assignedMembers = eventMembers(event, members);
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const date = event.allDay ? start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : start.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const time = event.allDay ? "All day" : `${start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}${end ? ` – ${end.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}`;
  return <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"><section className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">{event.category ?? "General"}</span><h2 className="mt-3 text-2xl font-black leading-tight">{(event.generatedHoliday || event.generatedSkyEvent) ? `${eventCategoryIcon(event)} ` : ""}{event.title}</h2></div><button type="button" onClick={onClose} aria-label="Close event details" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"><AppIcon name="close" className="size-5"/></button></div><div className="mt-6 space-y-4 text-sm"><div className="rounded-2xl bg-slate-50 p-4 dark:bg-white/5"><p className="font-bold">{date}</p><p className="mt-1 text-slate-500 dark:text-slate-300">{time}</p></div>{event.location && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Location</p><p className="mt-1 font-semibold">{event.location}</p></div>}{event.notes && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Details</p><p className="mt-1 whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-200">{event.notes}</p></div>}{assignedMembers.length > 0 && <div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">For</p><div className="mt-2 flex flex-wrap gap-2">{assignedMembers.map((member) => <span key={member.id} className="rounded-full px-3 py-1.5 text-xs font-bold text-slate-800" style={{ backgroundColor: `${memberCalendarColor(member, members.indexOf(member))}55` }}>{member.name}</span>)}</div></div>}</div><div className="mt-7 flex justify-end gap-3">{!event.generatedHoliday && !event.generatedSkyEvent && <button type="button" onClick={onEdit} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"><AppIcon name="edit" className="size-4"/><span>Edit event</span></button>}<button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Done</button></div></section></div>;
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

function timedEventLabel(event: Event) {
  const start = new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (!event.endsAt) return start;
  const end = new Date(event.endsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${start}–${end}`;
}

type AllDayEventLayout = { event: Event; columnStart: number; columnSpan: number; row: number };

function allDayEventLayouts(events: Event[], days: Date[]) {
  const dayLength = 86_400_000;
  const weekStart = visibleCalendarDate(days[0]);
  const weekEnd = visibleCalendarDate(days[days.length - 1]) + dayLength;
  const layouts: AllDayEventLayout[] = events.flatMap((event) => {
    if (!event.allDay) return [];
    const eventStart = allDayCalendarDate(new Date(event.startsAt));
    const eventEnd = isBirthdayEvent(event) ? eventStart + dayLength : event.endsAt ? allDayCalendarDate(new Date(event.endsAt)) : eventStart + dayLength;
    const start = Math.max(eventStart, weekStart);
    const end = Math.min(eventEnd, weekEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
    return [{ event, columnStart: Math.round((start - weekStart) / dayLength) + 1, columnSpan: Math.round((end - start) / dayLength), row: 0 }];
  }).sort((first, second) => first.columnStart - second.columnStart || second.columnSpan - first.columnSpan || String(first.event.id).localeCompare(String(second.event.id)));
  const rowEnds: number[] = [];
  for (const layout of layouts) {
    const availableRow = rowEnds.findIndex((rowEnd) => rowEnd <= layout.columnStart);
    layout.row = availableRow === -1 ? rowEnds.length : availableRow;
    rowEnds[layout.row] = layout.columnStart + layout.columnSpan;
  }
  return { layouts, rowCount: Math.max(1, rowEnds.length) };
}

type TimedEventLayout = ReturnType<typeof timedEventPosition> & { left: number; width: number };

function timedEventLayouts(events: Event[]) {
  const sortedEvents = [...events].sort((first, second) => {
    const startDifference = new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime();
    return startDifference || new Date(first.endsAt ?? first.startsAt).getTime() - new Date(second.endsAt ?? second.startsAt).getTime() || String(first.id).localeCompare(String(second.id));
  });
  const layouts = new Map<string | number, TimedEventLayout>();
  let cluster: Event[] = [];
  let clusterEnd = 0;

  function placeCluster(clusterEvents: Event[]) {
    const columns: number[] = [];
    const placements = new Map<string | number, number>();
    let columnCount = 0;

    for (const event of clusterEvents) {
      const start = new Date(event.startsAt).getTime();
      const end = Math.max(start + 30 * 60_000, new Date(event.endsAt ?? start + 60 * 60_000).getTime());
      const availableColumn = columns.findIndex((columnEnd) => columnEnd <= start);
      const column = availableColumn === -1 ? columns.length : availableColumn;
      columns[column] = end;
      columnCount = Math.max(columnCount, column + 1);
      placements.set(event.id, column);
    }

    for (const event of clusterEvents) {
      const column = placements.get(event.id) ?? 0;
      const position = timedEventPosition(event);
      layouts.set(event.id, { ...position, left: (column / columnCount) * 100, width: 100 / columnCount });
    }
  }

  for (const event of sortedEvents) {
    const start = new Date(event.startsAt).getTime();
    const end = Math.max(start + 30 * 60_000, new Date(event.endsAt ?? start + 60 * 60_000).getTime());
    if (cluster.length && start >= clusterEnd) {
      placeCluster(cluster);
      cluster = [];
    }
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, end);
  }
  placeCluster(cluster);

  return layouts;
}

function TimelineEvent({ event, members, onClick, compact = false, layout }: { event: Event; members: Member[]; onClick?: () => void; compact?: boolean; layout?: TimedEventLayout }) {
  const position = timedEventPosition(event);
  const eventLayout = layout ?? { ...position, left: 0, width: 100 };
  const isNarrow = compact || eventLayout.width < 50;
  const assignedMembers = eventMembers(event, members);
  const icon = eventCategoryIcon(event);
  const time = timedEventLabel(event);
  const context = [event.title, time, event.location && `⌖ ${event.location}`, event.notes].filter(Boolean).join(" · ");
  return <button title={context} aria-label={`Open event: ${context}`} onClick={(clickEvent) => { clickEvent.stopPropagation(); onClick?.(); }} style={{ top: eventLayout.top, height: eventLayout.height, left: `calc(${eventLayout.left}% + 0.25rem)`, width: `calc(${eventLayout.width}% - 0.5rem)`, background: eventBlockBackground(event, members) }} className={`absolute z-10 overflow-hidden rounded-md text-left text-slate-900 shadow-sm hover:brightness-95 ${isNarrow ? "p-1 text-[10px]" : "p-2 pb-7 text-xs"}`}>{isNarrow && <span className="block truncate text-[9px] font-bold leading-tight opacity-75">{time}{event.location && <span className="ml-1" aria-hidden="true">⌖</span>}</span>}<span className="absolute bottom-1.5 right-1.5 flex -space-x-1.5">{assignedMembers.slice(0, 4).map((member, index) => <i key={member.id} style={{ background: memberCalendarColor(member, members.indexOf(member)), zIndex: assignedMembers.length - index }} className="grid size-4 place-items-center rounded-full border border-white/80 text-[8px] not-italic font-black text-slate-800 shadow-sm">{member.name.slice(0, 1).toUpperCase()}</i>)}</span><p className={`flex items-center gap-1 ${isNarrow ? "truncate" : "truncate text-[17px] leading-tight"} font-black`}>{icon && <NotoEmoji emoji={icon} className={isNarrow ? "size-3" : "size-4"} />}{event.title}</p>{!isNarrow && event.notes && <p className="mt-0.5 truncate text-[14px] font-semibold leading-tight opacity-80">{event.notes}</p>}{!isNarrow && event.location && <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-tight opacity-60">⌖ {event.location}</p>}</button>;
}

function TimelineColumn({ date, events, members, onEdit, onCreate, compact = false }: { date: Date; events: Event[]; members: Member[]; onEdit?: (event: Event) => void; onCreate?: (day: Date, time: string) => void; compact?: boolean }) {
  const dayEvents = events.filter((event) => eventOccursOn(event, date));
  const timedEvents = dayEvents.filter((event) => !event.allDay);
  const eventLayouts = timedEventLayouts(timedEvents);
  function createAtClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!onCreate) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const minutes = timelineStartHour * 60 + ((event.clientY - bounds.top) / timelineHourHeight) * 60;
    const roundedMinutes = Math.max(timelineStartHour * 60, Math.min((timelineEndHour - 1) * 60 + 30, Math.round(minutes / 30) * 30));
    onCreate(date, `${String(Math.floor(roundedMinutes / 60)).padStart(2, "0")}:${String(roundedMinutes % 60).padStart(2, "0")}`);
  }
  return <div onClick={createAtClick} style={{ height: timelineHeight }} className={`relative border-l border-slate-100 dark:border-white/10 ${onCreate ? "cursor-copy" : ""}`}>{Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, index) => <div key={index} style={{ top: index * timelineHourHeight }} className="pointer-events-none absolute inset-x-0 border-t border-slate-100/80 dark:border-white/10"/>)}{timedEvents.map((event) => <TimelineEvent key={event.id} event={event} members={members} compact={compact} layout={eventLayouts.get(event.id)} onClick={() => onEdit?.(event)} />)}</div>;
}

export function DayCalendar({ date, events, members, onEdit }: { date: Date; events: Event[]; members: Member[]; onEdit: (event: Event) => void }) {
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

export function EventEditor({ event, members, onClose, onSave, onApplySeries, onDelete }: { event: Event; members: Member[]; onClose: () => void; onSave: (event: Event) => void; onApplySeries: (event: Event, memberIds: string[]) => void; onDelete: (event: Event) => void }) {
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
  function submit(formEvent: FormEvent) { formEvent.preventDefault(); const startsAt = allDay ? new Date(`${date}T00:00:00.000Z`) : new Date(`${date}T${time}:00`); const selectedEnd = new Date(`${date}T${endTime}:00`); const nextEvent = { ...event, title: title.trim(), startsAt: startsAt.toISOString(), time: allDay ? "All day" : startsAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), location: location.trim() || null, category, allDay, memberIds }; const originalAllDayDuration = event.allDay && event.endsAt ? new Date(event.endsAt).getTime() - source.getTime() : null; const endsAt = allDay ? (isBirthdayEvent(nextEvent) ? null : originalAllDayDuration && originalAllDayDuration > 0 ? new Date(startsAt.getTime() + originalAllDayDuration) : null) : (selectedEnd > startsAt ? selectedEnd : new Date(startsAt.getTime() + 60 * 60_000)); onSave({ ...nextEvent, endsAt: endsAt?.toISOString() ?? null }); }
  const canApplyToSeries = Boolean(event.seriesExternalId && (event.source === "google" || event.source === "apple"));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-5"><form onSubmit={submit} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-violet-600">EDIT EVENT</p><h2 className="text-2xl font-bold">Make a change</h2></div><button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button></div><label className="mt-5 block text-sm font-bold">Event title<input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><label className="col-span-2 text-sm font-bold sm:col-span-1">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="text-sm font-bold">Starts<input disabled={allDay} type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label><label className="text-sm font-bold">Ends<input disabled={allDay} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 disabled:opacity-50" /></label></div><label className="mt-4 block text-sm font-bold">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" /></label><label className="mt-4 block text-sm font-bold">Category<StyledSelect value={category} onChange={(e) => setCategory(e.target.value)}><option>General</option><option>School Test/Project Due</option><option>Sports</option><option>Birthday</option><option>Vacation</option><option>Holiday</option></StyledSelect></label><fieldset className="mt-4"><legend className="text-sm font-bold">Who is this for?</legend><div className="mt-2 flex flex-wrap gap-2">{members.map((member) => { const id = String(member.id); const selected = memberIds.includes(id); return <label key={id} className={`cursor-pointer rounded-full px-3 py-1 text-xs font-bold ${selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}><input className="sr-only" type="checkbox" checked={selected} onChange={() => setMemberIds((ids) => selected ? ids.filter((item) => item !== id) : [...ids, id])}/>{member.name}</label>; })}</div></fieldset>{canApplyToSeries && <div className="mt-4 rounded-xl bg-violet-50 p-3"><p className="text-xs font-semibold text-violet-800">Apply the selected people to every occurrence of this recurring event, including future syncs.</p><button type="button" onClick={() => onApplySeries(event, memberIds)} className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white">Apply people to entire series</button></div>}<label className="mt-4 flex gap-2 text-sm font-bold"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label><div className="mt-6 flex items-center justify-between gap-3"><button type="button" onClick={() => onDelete(event)} className="rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50">Delete event</button><div className="flex gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 font-bold text-slate-500">Cancel</button><button className="rounded-xl bg-violet-600 px-5 py-2 font-bold text-white">Save event</button></div></div></form></div>;
}

export function WeekCalendar({ anchor, events, members, onEdit, onOpenDay, onCreate }: { anchor: Date; events: Event[]; members: Member[]; onEdit: (event: Event) => void; onOpenDay: (date: Date) => void; onCreate?: (day: Date, time: string) => void }) {
  const first = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  const { layouts: allDayLayouts, rowCount: allDayRowCount } = allDayEventLayouts(events, days);
  return <div className="overflow-x-auto"><div className="min-w-[920px] overflow-hidden rounded-2xl border border-slate-100 dark:border-white/10"><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-white/10"><div/>{days.map((day) => { const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} className={`flex items-baseline justify-center gap-1 border-l border-slate-100 px-2 py-3 dark:border-white/10 ${isToday ? "bg-violet-600 text-white" : "hover:bg-violet-50 dark:hover:bg-white/5"}`}><span className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-white/75" : "text-slate-400"}`}>{day.toLocaleDateString([], { weekday: "short" })}</span><span className="text-xl font-black leading-none">{day.getDate()}</span></button>; })}</div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-100 dark:border-white/10"><span className="px-2 py-2 text-[10px] font-bold text-slate-400">All day</span><div className="relative col-span-7 grid min-h-10 gap-y-0.5 border-l border-slate-100 p-1 dark:border-white/10" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gridTemplateRows: `repeat(${allDayRowCount}, minmax(1.5rem, auto))` }}>{days.slice(1).map((day, index) => <span key={day.toISOString()} aria-hidden="true" style={{ left: `${((index + 1) / 7) * 100}%` }} className="pointer-events-none absolute inset-y-0 border-l border-slate-100 dark:border-white/10" />)}{allDayLayouts.map(({ event, columnStart, columnSpan, row }) => <button key={event.id} type="button" onClick={() => onEdit(event)} style={{ gridColumn: `${columnStart} / span ${columnSpan}`, gridRow: row + 1, marginInline: "0.125rem" }} className="z-10 min-w-0 text-left"><EventChip event={event} members={members} compact /></button>)}</div></div><div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]"><div style={{ height: timelineHeight }} className="relative bg-slate-50/60 dark:bg-white/[.02]">{Array.from({ length: timelineEndHour - timelineStartHour + 1 }, (_, index) => <span key={index} style={{ top: index * timelineHourHeight - 7 }} className="absolute right-2 text-xs font-bold text-slate-400">{new Date(2000, 0, 1, timelineStartHour + index).toLocaleTimeString([], { hour: "numeric" })}</span>)}</div>{days.map((day) => <TimelineColumn key={day.toISOString()} date={day} events={events} members={members} onEdit={onEdit} onCreate={onCreate} />)}</div></div></div>;
}

export function MonthGrid({ anchor, events, members, onOpenDay }: { anchor: Date; events: Event[]; members: Member[]; onOpenDay: (date: Date) => void }) {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const first = startOfWeek(firstOfMonth);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const cellCount = Math.ceil((firstOfMonth.getDay() + daysInMonth) / 7) * 7;
  const days = Array.from({ length: cellCount }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; });
  return <div><div className="mb-1 grid grid-cols-7 gap-1">{weekdays.map((day) => <p key={day} className="p-1 text-center text-xs font-bold text-slate-400">{day}</p>)}</div><div className="grid grid-cols-7 gap-1">{days.map((day) => { const dayEvents = events.filter((event) => eventOccursOn(event, day)); const currentMonth = day.getMonth() === anchor.getMonth(); const isToday = sameDate(day, new Date()); return <button key={day.toISOString()} onClick={() => onOpenDay(day)} aria-label={isToday ? `Today, ${day.toLocaleDateString()}` : day.toLocaleDateString()} className={`relative flex aspect-square min-h-0 flex-col items-stretch overflow-hidden rounded-xl p-2 text-left ${currentMonth ? "bg-slate-50 dark:bg-white/5" : "bg-slate-50/40 text-slate-300 dark:bg-white/[.02]"} ${isToday ? "ring-2 ring-violet-500 ring-offset-1 dark:ring-violet-400 dark:ring-offset-[#151522]" : ""}`}><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-black leading-none ${isToday ? "bg-violet-600 text-white shadow-sm" : "items-start justify-start text-left font-bold"}`}>{day.getDate()}</span><span className="mt-2 block min-h-0 space-y-1 overflow-hidden text-left">{dayEvents.slice(0, 2).map((event) => <EventChip key={event.id} event={event} members={members} compact />)}{dayEvents.length > 2 && <span className="block px-1 text-xs font-bold text-violet-600">+{dayEvents.length - 2} more</span>}</span></button>; })}</div></div>;
}

export function PhoneHomeCalendar({ events, members, onOpenDay, onOpenEvent }: { events: Event[]; members: Member[]; onOpenDay: (date: Date) => void; onOpenEvent: (event: Event) => void }) {
  const [mode, setMode] = useState<"Day" | "Week">("Day");
  const today = useMemo(() => new Date(), []);
  const days = mode === "Day" ? [today] : Array.from({ length: 7 }, (_, index) => { const day = startOfWeek(today); day.setDate(day.getDate() + index); return day; });
  const timeLabel = (event: Event) => event.allDay ? "All day" : new Date(event.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return <section className="min-w-0 max-w-full overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:hidden">
    <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-600">CALENDAR</p><h2 className="text-xl font-bold">{mode === "Day" ? "Today" : "This week"}</h2></div><div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/10">{(["Day", "Week"] as const).map((option) => <button key={option} onClick={() => setMode(option)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${mode === option ? "bg-white text-violet-700 shadow-sm dark:bg-violet-500 dark:text-white" : "text-slate-500 dark:text-slate-300"}`}>{option}</button>)}</div></div>
    <div className="mt-4 min-w-0 space-y-3">{days.map((day) => { const dayEvents = events.filter((event) => eventOccursOn(event, day)).sort((first, second) => Number(Boolean(second.allDay)) - Number(Boolean(first.allDay)) || new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()); return <article key={day.toDateString()} className="min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 dark:border-white/10 dark:bg-white/[.03]"><button onClick={() => onOpenDay(day)} className="flex w-full min-w-0 items-center justify-between px-4 py-3 text-left hover:bg-violet-50 dark:hover:bg-white/5"><span><span className="block text-sm font-black">{day.toLocaleDateString([], { weekday: "long" })}</span><span className="text-xs font-semibold text-slate-500 dark:text-slate-300">{day.toLocaleDateString([], { month: "short", day: "numeric" })}</span></span><span className="text-sm font-black text-violet-600 dark:text-violet-300">Open ›</span></button><div className="min-w-0 space-y-2 border-t border-slate-100 p-3 dark:border-white/10">{dayEvents.length ? dayEvents.slice(0, mode === "Day" ? 4 : 2).map((event) => { const icon = eventCategoryIcon(event); const detail = event.location ?? event.notes; return <button key={event.id} onClick={() => onOpenEvent(event)} style={{ background: eventBlockBackground(event, members) }} className="block w-full min-w-0 max-w-full overflow-hidden rounded-xl px-3 py-3 text-left text-slate-900 shadow-sm"><span className="block break-words line-clamp-2 text-sm font-black leading-tight"><span className="mr-2 text-xs font-black text-slate-700 dark:text-slate-700">{timeLabel(event)}</span>{icon && <span className="mr-1.5">{icon}</span>}{event.title}</span>{detail && <span className="mt-1 block truncate text-xs font-semibold leading-tight opacity-70">{event.location && <span className="mr-1">⌖</span>}{detail}</span>}</button>; }) : <p className="px-1 py-1 text-sm font-medium text-slate-500 dark:text-slate-300">Nothing planned.</p>}{dayEvents.length > (mode === "Day" ? 4 : 2) && <button onClick={() => onOpenDay(day)} className="px-1 text-xs font-black text-violet-600 dark:text-violet-300">+{dayEvents.length - (mode === "Day" ? 4 : 2)} more events</button>}</div></article>; })}</div>
  </section>;
}
