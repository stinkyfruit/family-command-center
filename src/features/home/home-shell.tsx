"use client";

import { AppIcon, SpeechInputButton } from "@/components/home/shared-ui";

export const navigationTabs = [
  ["home", "home", "Home"],
  ["calendar", "calendar", "Calendar"],
  ["tasks", "tasks", "Tasks"],
  ["chores", "chores", "Chores"],
  ["lists", "lists", "Lists"],
  ["wishlist", "wishlist", "Wish lists"],
  ["settings", "settings", "Settings"],
] as const;

export type HomeTab = typeof navigationTabs[number][0];
type NavigationTab = typeof navigationTabs[number];

export function HomeNavigation({ tabs, activeTab, onNavigate }: { tabs: readonly NavigationTab[]; activeTab: HomeTab; onNavigate: (tab: HomeTab) => void }) {
  return <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-lg backdrop-blur dark:border-white/10 dark:bg-[#1c1c2b]/95 md:flex md:justify-around md:p-2 lg:inset-y-0 lg:left-0 lg:right-auto lg:w-24 lg:border-r lg:border-t-0 lg:px-2 lg:py-4">
    <nav style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} className="grid min-w-0 gap-1 md:flex md:flex-1 md:justify-around lg:mt-6 lg:flex-col lg:justify-start">{tabs.map(([tab, icon, label]) => <button key={tab} onClick={() => onNavigate(tab)} title={label} className={`group flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-bold transition-colors md:min-h-0 md:flex-1 md:rounded-2xl md:px-3 lg:w-full lg:flex-none lg:px-1 ${activeTab === tab ? "bg-violet-600 text-white shadow-md" : "text-slate-500 hover:bg-violet-50 dark:text-slate-300 dark:hover:bg-white/10"}`}><AppIcon name={icon} variant="nav" active={activeTab === tab} className="size-5"/><span className="hidden max-w-full truncate lg:block">{label}</span></button>)}</nav>
  </aside>;
}

export function HomeHeader({ householdName, activeTab, dark, voiceCommand, onVoiceCommandChange, onVoiceCommandComplete, onScreenSaver, onToggleTheme }: { householdName: string; activeTab: HomeTab; dark: boolean; voiceCommand: string; onVoiceCommandChange: (value: string) => void; onVoiceCommandComplete: (value: string) => void; onScreenSaver: () => void; onToggleTheme: () => void }) {
  return <header className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-5 md:px-9">
    <div className="flex items-center gap-3"><div className="hidden size-11 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-300/50 md:grid lg:hidden"><AppIcon name="home" className="size-5"/></div><div><h1 className="text-xl font-bold tracking-tight">{householdName}</h1><p className={activeTab === "wishlist" ? "text-sm text-white/70" : "text-sm text-slate-500 dark:text-slate-400"}>{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p></div></div>
    <div className="flex items-center gap-2"><SpeechInputButton value={voiceCommand} onChange={onVoiceCommandChange} onComplete={onVoiceCommandComplete} buttonLabel="Speak a command to add an event, task, chore, wish, or list item" showMessage={false} /><button onClick={onScreenSaver} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10">Photos</button><button onClick={onToggleTheme} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold shadow-sm ring-1 transition-colors ${activeTab === "wishlist" ? dark ? "bg-slate-950/75 text-white ring-white/20 hover:scale-105 hover:bg-emerald-800 hover:ring-emerald-300/50 hover:shadow-lg" : "bg-white/95 text-slate-700 ring-slate-200 hover:scale-105 hover:bg-amber-100 hover:text-amber-900 hover:ring-amber-300 hover:shadow-lg" : "bg-white text-slate-700 ring-slate-200 dark:bg-white/10 dark:text-slate-100 dark:ring-white/10"}`}><AppIcon name={dark ? "sun" : "moon"} className="size-4"/>{dark ? "Light" : "Dark"}</button></div>
  </header>;
}
