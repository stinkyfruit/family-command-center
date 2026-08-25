"use client";

import { useEffect, useState } from "react";
import { AccessibleLottie } from "@/components/home/accessible-lottie";
import { AppIcon } from "@/components/home/shared-ui";
import type { ChoreEntry, ChoreRewardMode, Member } from "@/features/home/model";
import { choreIcon, choreRoutines, isDailyRoutineChore, isVisibleRoutineChore, notoIconPath, pickCelebrationAnimation } from "@/features/home/model";

export function ChoreCelebration({ animationSrc, label = "Chore complete" }: { animationSrc?: string; label?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [animation] = useState(() => animationSrc ?? pickCelebrationAnimation());
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <div className="pointer-events-auto fixed inset-0 z-50 grid place-items-center overflow-hidden bg-violet-950/35 p-6 backdrop-blur-sm" role="status" aria-label={label}><div className="w-full max-w-xl">{reduceMotion ? <div className="grid aspect-square place-items-center text-8xl">✨</div> : <AccessibleLottie src={animation} label={label} loop={false} wrapperClassName="h-[min(70vh,38rem)] w-full drop-shadow-2xl" className="size-full" />}</div></div>;
}

export function ChoresPage({ members, chores, choreRewardMode, choreRewardTargetCents, choreRewardTargetStars, earnedCentsByMember, paidOutCentsByMember, celebratingChoreId, onToggle }: { members: Member[]; chores: ChoreEntry[]; choreRewardMode: ChoreRewardMode; choreRewardTargetCents: number; choreRewardTargetStars: number; earnedCentsByMember: Record<string, number>; paidOutCentsByMember: Record<string, number>; celebratingChoreId: string | number | null; onToggle: (chore: ChoreEntry) => void }) {
  return <><WeekdayChoresBoard members={members} chores={chores} mode={choreRewardMode} targetCents={choreRewardTargetCents} targetStars={choreRewardTargetStars} earnedCentsByMember={earnedCentsByMember} paidOutCentsByMember={paidOutCentsByMember} celebratingChoreId={celebratingChoreId} onToggle={onToggle} /><TemporaryRoutineChores members={members} chores={chores} mode={choreRewardMode} onToggle={onToggle} /> </>;
}

function formatReward(cents: number, stars: number, mode: ChoreRewardMode) {
  return mode === "money" ? `$${(cents / 100).toFixed(2)}` : `${stars} ${stars === 1 ? "star" : "stars"}`;
}

function ChildIncentiveProgress({ child, chores, mode, targetCents, targetStars, earnedCentsByMember, paidOutCentsByMember }: { child: Member; chores: ChoreEntry[]; mode: ChoreRewardMode; targetCents: number; targetStars: number; earnedCentsByMember: Record<string, number>; paidOutCentsByMember: Record<string, number> }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const isWeekend = [0, 6].includes(new Date().getDay());
  const weekendStart = new Date();
  weekendStart.setHours(0, 0, 0, 0);
  if (weekendStart.getDay() === 0) weekendStart.setDate(weekendStart.getDate() - 1);
  const weekendDates = new Set([0, 1].map((offset) => {
    const date = new Date(weekendStart);
    date.setDate(weekendStart.getDate() + offset);
    return date.toLocaleDateString("en-CA");
  }));
  const weekendChores = chores.filter((chore) => chore.assigneeMemberId === child.id && chore.routine === "Weekend" && chore.scheduledFor && weekendDates.has(chore.scheduledFor));
  const weekendTarget = mode === "money" ? weekendChores.reduce((sum, chore) => sum + chore.rewardCents, 0) : weekendChores.reduce((sum, chore) => sum + chore.rewardStars, 0);
  const dailyChores = chores.filter((chore) => chore.assigneeMemberId === child.id && isDailyRoutineChore(chore));
  const dailyPotential = mode === "money" ? dailyChores.reduce((sum, chore) => sum + chore.rewardCents, 0) : dailyChores.reduce((sum, chore) => sum + chore.rewardStars, 0);
  const configuredTarget = mode === "money" ? targetCents : targetStars;
  const target = isWeekend ? weekendTarget : dailyPotential || configuredTarget;
  const dailyEarned = isWeekend
    ? weekendChores.reduce((sum, chore) => sum + (mode === "money" ? chore.completedRewardCents ?? 0 : chore.completedRewardStars ?? 0), 0)
    : dailyChores.reduce((sum, chore) => sum + (mode === "money" ? chore.completedRewardCents ?? 0 : chore.completedRewardStars ?? 0), 0);
  const runningEarnedCents = earnedCentsByMember[String(child.id)] ?? 0;
  const paidOutCents = paidOutCentsByMember[String(child.id)] ?? 0;
  const availableCents = runningEarnedCents - paidOutCents;
  const progress = Math.min(100, target ? dailyEarned / target * 100 : 0);
  const isRainbowCard = child.name.toLowerCase() === "lucas";
  const progressCardClass = isRainbowCard ? "bg-white/85 dark:bg-white/85" : "bg-white/75 dark:bg-white/10";
  const primaryTextClass = isRainbowCard ? "text-emerald-700" : "text-emerald-700 dark:text-emerald-200";
  const secondaryTextClass = isRainbowCard ? "text-slate-500" : "text-slate-500 dark:text-slate-300";
  const progressTextClass = isRainbowCard ? "text-slate-700" : "text-slate-700 dark:text-slate-100";
  const progressTrackClass = isRainbowCard ? "bg-slate-200" : "bg-slate-200 dark:bg-white/10";
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <article className={`relative overflow-hidden rounded-2xl p-4 ${progressCardClass}`}><div className="flex items-start justify-between gap-2"><div>{mode === "money" ? <><p className={`text-[10px] font-black uppercase tracking-[0.16em] ${primaryTextClass}`}>Available</p><p className={`mt-0.5 text-3xl font-black leading-none ${primaryTextClass}`}>${Math.max(0, availableCents / 100).toFixed(2)}</p><p className={`mt-1 text-xs font-bold ${secondaryTextClass}`}>Earned: ${(runningEarnedCents / 100).toFixed(2)} · Paid out: ${(paidOutCents / 100).toFixed(2)}</p></> : <span className={`text-sm font-black ${progressTextClass}`}>Progress</span>}</div><span className={`rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black ${primaryTextClass} ${isRainbowCard ? "" : "dark:bg-emerald-400/20"}`}>{mode === "money" ? `${isWeekend ? "Weekend" : "Today"}: $${(dailyEarned / 100).toFixed(2)} / $${(target / 100).toFixed(2)}` : `${dailyEarned} / ${target} stars`}</span></div><div className="mt-3 flex items-end gap-4"><div className="relative grid size-28 shrink-0 place-items-end overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-amber-50 to-amber-100 p-1 dark:from-amber-300/10 dark:to-amber-400/20"><div className="absolute inset-x-0 bottom-0 rounded-t-[1.5rem] bg-gradient-to-t from-amber-300/70 to-yellow-200/60 transition-[height] motion-reduce:transition-none" style={{ height: `${Math.max(12, progress)}%` }} />{reduceMotion ? <span className="relative z-10 grid size-28 place-items-center text-7xl" aria-label={`${child.name}'s piggy bank`}>🐷</span> : <AccessibleLottie src="/chores/piggy%20bank.json" label={`${child.name}'s piggy bank`} wrapperClassName="relative z-10 size-28" className="size-full object-contain drop-shadow-sm" />}</div><div className="min-w-0 flex-1"><p className={`text-sm font-black ${progressTextClass}`}>{isWeekend ? target === 0 ? "No weekend chores yet" : progress >= 100 ? "Weekend complete!" : `${Math.round(progress)}% of weekend chores` : progress >= 100 ? "Pool complete!" : `${Math.round(progress)}% of the pool`}</p><div className={`mt-2 h-3 overflow-hidden rounded-full ${progressTrackClass}`}><div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-500 transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div><p className={`mt-2 text-xs font-semibold ${secondaryTextClass}`}>{isWeekend ? target === 0 ? "Add weekend chores in Settings to create a reward pool." : "Complete weekend chores to grow the Earned total." : mode === "money" ? "Complete chores to grow the Earned total." : `Every completed chore adds to ${child.name}&apos;s bank.`}</p></div></div></article>;
}

function TemporaryRoutineChores({ members, chores, mode, onToggle }: { members: Member[]; chores: ChoreEntry[]; mode: ChoreRewardMode; onToggle: (chore: ChoreEntry) => void }) {
  const isWeekday = new Date().getDay() > 0 && new Date().getDay() < 6;
  const today = new Date().toLocaleDateString("en-CA");
  const children = members.filter((member) => member.role === "child");
  const temporary = chores.filter((chore) => !chore.isFixed && chore.scheduledFor === today && (chore.routine === "Before school" || chore.routine === "After school" || chore.routine === "Weekend"));
  if (!children.length) return null;
  const weekend = !isWeekday;
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-violet-50 p-5 ring-1 ring-violet-100 dark:bg-violet-500/10 dark:ring-violet-400/20"><div><p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">{weekend ? "Weekend chores" : "For today only"}</p><h2 className="mt-1 text-xl font-black">{weekend ? "Weekend chores" : "One-time routine chores"}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{weekend ? "Weekend chores are managed in Settings. These do not change the weekday routine." : "Extra chores for today."}</p></div><div className="mt-4 grid gap-3 md:grid-cols-2">{children.map((child) => { const childChores = temporary.filter((chore) => chore.assigneeMemberId === child.id); const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <article key={child.id} className={`rounded-3xl p-5 ${theme}`}><h3 className="text-2xl font-black">{child.name}</h3><div className="mt-3 space-y-2">{childChores.length ? childChores.map((chore) => <button type="button" key={chore.id} onClick={() => onToggle(chore)} className={`flex min-h-16 w-full items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-left transition-transform active:scale-[.98] dark:bg-white/10 ${chore.completionId ? "opacity-65" : "hover:-translate-y-0.5"}`}><span className="text-lg">{chore.emoji}</span><span className={`min-w-0 flex-1 text-sm font-bold ${chore.completionId ? "text-slate-400 line-through" : "text-slate-800"}`}>{chore.title}</span><span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-200">{formatReward(chore.rewardCents, chore.rewardStars, mode)}</span><span className={`grid size-8 shrink-0 place-items-center rounded-lg border-2 text-lg font-black ${chore.completionId ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span></button>) : <p className="rounded-xl border border-dashed border-white/70 px-3 py-3 text-center text-xs font-semibold text-slate-600 dark:border-white/20 dark:text-slate-300">Nothing extra today.</p>}</div></article>; })}</div></div></section>;
}

function WeekdayChoresBoard({ members, chores, mode, targetCents, targetStars, earnedCentsByMember, paidOutCentsByMember, celebratingChoreId, onToggle }: { members: Member[]; chores: ChoreEntry[]; mode: ChoreRewardMode; targetCents: number; targetStars: number; earnedCentsByMember: Record<string, number>; paidOutCentsByMember: Record<string, number>; celebratingChoreId: string | number | null; onToggle: (chore: ChoreEntry) => void }) {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [expandedRoutines, setExpandedRoutines] = useState<Record<string, boolean>>({});
  const children = members.filter((member) => member.role === "child");
  const isWeekday = new Date().getDay() > 0 && new Date().getDay() < 6;
  const routineOrder = currentHour >= 12 ? ["After school", "Before school", "To-do"] : ["Before school", "After school", "To-do"];
  const routines = [...choreRoutines]
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
        const pictureSlot = card.querySelector<HTMLElement>("button > span:first-of-type");
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
  }, [chores, expandedRoutines]);

  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><div><p className="text-sm font-bold text-sky-600">KIDS&apos; CHORES</p><h2 className="text-2xl font-bold">{isWeekday ? "Daily routines" : "Weekend chores"}</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">{isWeekday ? "Choose a chore to mark it complete. Chore setup and editing live in Settings." : "Weekday routines are off today. Weekend chores and progress stay visible here."}</p></div>{children.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{children.map((child) => { const theme = child.name.toLowerCase() === "lucas" ? "bg-[linear-gradient(135deg,#fda4af,#fef08a,#86efac,#93c5fd,#c4b5fd)]" : child.name.toLowerCase() === "michael" ? "bg-emerald-100 dark:bg-emerald-400/10" : "bg-sky-50 dark:bg-sky-400/10"; return <div key={child.id} className={`rounded-3xl p-5 ${theme}`}><h3 className="text-2xl font-black">{child.name}</h3><div className="mt-5 space-y-5"><ChildIncentiveProgress child={child} chores={chores} mode={mode} targetCents={targetCents} targetStars={targetStars} earnedCentsByMember={earnedCentsByMember} paidOutCentsByMember={paidOutCentsByMember} />{isWeekday && routines.map((routine) => { const routineKey = `${child.id}-${routine.id}`; const isExpanded = expandedRoutines[routineKey] ?? (routine.id !== "Before school" || currentHour < 12); const contentId = `routine-${routineKey.toLowerCase().replaceAll(" ", "-")}`; const routineChores = sortedChores.filter((chore) => chore.assigneeMemberId === child.id && chore.routine === routine.id); return <section key={routine.id} className="rounded-2xl bg-white/45 p-3"><div className="flex items-center justify-between gap-3"><button type="button" onClick={() => setExpandedRoutines((current) => ({ ...current, [routineKey]: !isExpanded }))} aria-controls={contentId} aria-expanded={isExpanded} className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl text-left text-sm font-black text-slate-700 hover:bg-white/40"><AppIcon name="chevronRight" className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-90" : ""}`}/><span className="mr-1.5">{routine.icon}</span>{routine.label}</button></div>{isExpanded && <div id={contentId} className="mt-3 grid gap-3">{routineChores.map((chore) => <div key={chore.id} data-chore-id={String(chore.id)} className="relative min-w-0"><button type="button" onClick={() => onToggle(chore)} className={`flex min-h-20 w-full items-center gap-2 rounded-2xl bg-white/90 p-3 text-left shadow-sm transition-transform active:scale-[.98] ${chore.completionId ? "opacity-65" : "hover:-translate-y-0.5"}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-3xl shadow-sm">{!chore.emoji || chore.emoji === "✨" ? choreIcon(chore.title) : chore.emoji}</span><span className={`min-w-0 flex-1 text-base font-black leading-tight ${chore.completionId ? "text-slate-400 line-through" : "text-slate-800"}`}>{chore.title}</span><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-black ${chore.completionId ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-100 dark:text-emerald-800" : "bg-amber-100 text-amber-800 dark:bg-amber-100 dark:text-amber-800"}`}>{formatReward(chore.rewardCents, chore.rewardStars, mode)}</span><span className={`grid size-9 shrink-0 place-items-center rounded-lg border-2 text-xl font-black ${chore.completionId ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent"}`}>✓</span></button>{celebratingChoreId === chore.id && <ChoreCelebration/>}</div>)}{routineChores.length === 0 && <p className="rounded-xl bg-white/50 px-3 py-4 text-center text-xs font-semibold text-slate-600">Routine is ready for today.</p>}</div>}</section>; })}</div></div>; })}</div> : <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Add a child in Settings to create a chore board.</div>}</div></section>;
}
