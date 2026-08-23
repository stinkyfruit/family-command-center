"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcon, type IconName } from "@/components/home/shared-ui";

export type SettingsSectionId = "settings-personal" | "settings-family" | "settings-calendars" | "settings-chores" | "settings-account";

const settingsSections: Array<{ id: SettingsSectionId; label: string; description: string; icon: IconName }> = [
  { id: "settings-personal", label: "Personal", description: "Appearance and nickname", icon: "settings" },
  { id: "settings-family", label: "Family", description: "People and home tabs", icon: "home" },
  { id: "settings-calendars", label: "Calendars", description: "Google and Apple feeds", icon: "calendar" },
  { id: "settings-chores", label: "Chores", description: "Rewards and payouts", icon: "chores" },
  { id: "settings-account", label: "Account", description: "Sign out", icon: "signOut" },
];

export function SettingsNavigation({ showChores, showAccount }: { showChores: boolean; showAccount: boolean }) {
  const visibleSections = useMemo(() => settingsSections.filter((section) => (section.id !== "settings-chores" || showChores) && (section.id !== "settings-account" || showAccount)), [showChores, showAccount]);
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(visibleSections[0]?.id ?? "settings-personal");

  useEffect(() => {
    const sections = visibleSections.map((section) => document.getElementById(section.id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visibleEntry = entries.filter((entry) => entry.isIntersecting).sort((first, second) => first.boundingClientRect.top - second.boundingClientRect.top)[0];
      if (visibleEntry) setActiveSection(visibleEntry.target.id as SettingsSectionId);
    }, { rootMargin: "-112px 0px -55%", threshold: [0, 0.15] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [visibleSections]);

  return <>
    <section className="mx-auto max-w-[1800px] px-5 pb-5 md:px-9" aria-labelledby="settings-page-title">
      <div className="rounded-[2rem] bg-indigo-50 p-5 shadow-sm ring-1 ring-indigo-100 dark:bg-indigo-400/10 dark:ring-indigo-300/20">
        <p className="text-sm font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-200">SETTINGS</p>
        <h2 id="settings-page-title" className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Make your family home fit your family</h2>
        <p className="mt-1 max-w-2xl text-sm font-medium text-slate-600 dark:text-slate-300">Choose a section below. Changes save as you make them.</p>
      </div>
    </section>
    <div className="sticky top-3 z-30 mx-auto mt-3 max-w-[1800px] px-5 md:px-9">
      <div className="rounded-[1.5rem] bg-indigo-50/95 p-2 shadow-lg shadow-indigo-950/10 ring-1 ring-indigo-100 backdrop-blur dark:bg-slate-900/95 dark:ring-white/10">
        <nav aria-label="Settings sections" className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {visibleSections.map((section) => <a key={section.id} href={`#${section.id}`} aria-current={activeSection === section.id ? "location" : undefined} className={`group flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left ring-1 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${activeSection === section.id ? "bg-indigo-600 text-white shadow-sm ring-indigo-600 dark:bg-indigo-500 dark:ring-indigo-500" : "bg-white/85 ring-indigo-100 hover:bg-white dark:bg-white/10 dark:ring-white/10 dark:hover:bg-white/15"}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${activeSection === section.id ? "bg-white/15 text-white" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-300/15 dark:text-indigo-200"}`}><AppIcon name={section.icon} className="size-4" /></span>
            <span className="min-w-0"><span className={`block truncate text-xs font-black sm:text-sm ${activeSection === section.id ? "text-white" : "text-slate-800 dark:text-white"}`}>{section.label}</span><span className={`hidden truncate text-[11px] font-semibold sm:block ${activeSection === section.id ? "text-white/75" : "text-slate-500 dark:text-slate-300"}`}>{section.description}</span></span>
            <AppIcon name="chevronRight" className={`ml-auto size-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${activeSection === section.id ? "text-white/80" : "text-indigo-500"}`} />
          </a>)}
        </nav>
      </div>
    </div>
  </>;
}
