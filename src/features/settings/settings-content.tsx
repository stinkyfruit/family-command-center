"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { AppleFeed, GoogleConnection, Member, ThemeMode } from "@/features/home/model";
import { defaultMemberColor, isHexColor, memberColorOptions } from "@/features/home/model";
import { memberCalendarColor } from "@/components/home/calendar";
import { AppIcon, StyledSelect, useAppNotifications } from "@/components/home/shared-ui";
import { NotificationSettings } from "@/components/home/notification-settings";

export type SettingsPageContentProps = {
  householdId?: string | null;
  members: Member[];
  currentUserId: string | null;
  onMemberColorChange: (memberId: string | number, color: string) => Promise<void>;
  onAddMember: (name: string, role: Member["role"]) => Promise<{ error?: string }>;
  onRemoveMember: (member: Member) => Promise<{ error?: string }>;
  onUpdateCurrentMemberName: (name: string) => Promise<{ error?: string }>;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  showChoresTab: boolean;
  showWishlistTab: boolean;
  onTabVisibilityChange: (tab: "chores" | "wishlist", visible: boolean) => void;
  onUnlocked?: () => void;
  googleConnections: GoogleConnection[];
  appleFeeds: AppleFeed[];
  onConnect: () => void;
  onToggleConnection: (connection: GoogleConnection) => void;
  onAddApple: (name: string, url: string) => void;
  onToggleApple: (feed: AppleFeed) => void;
  onInviteAdult: (email: string, displayName: string) => Promise<{ link?: string; error?: string }>;
  onSignOut: () => Promise<{ error?: string }>;
};

type PinMode = "loading" | "setup" | "locked" | "unlocked";

export function SettingsPageContent({ householdId, members, currentUserId, onMemberColorChange, onAddMember, onRemoveMember, onUpdateCurrentMemberName, themeMode, onThemeModeChange, showChoresTab, showWishlistTab, onTabVisibilityChange, onUnlocked, googleConnections, appleFeeds, onConnect, onToggleConnection, onAddApple, onToggleApple, onInviteAdult }: SettingsPageContentProps) {
  const { confirm, prompt } = useAppNotifications();
  const [appleName, setAppleName] = useState("Home");
  const [appleUrl, setAppleUrl] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");
  const [inviting, setInviting] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>("loading");
  const [settingsPin, setSettingsPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState<Member["role"]>("child");
  const [personMessage, setPersonMessage] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | number | null>(null);
  const [memberMessage, setMemberMessage] = useState("");
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const currentMember = members.find((member) => currentUserId && String(member.userId) === currentUserId);

  useEffect(() => {
    if (!supabase) {
      // Local/demo mode has no settings PIN.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinMode("unlocked");
      return;
    }
    supabase.rpc("household_settings_pin_configured").then(({ data, error }) => {
      if (error) { setPinMessage(error.message); setPinMode("locked"); return; }
      setPinMode(data ? "locked" : "setup");
    });
  }, []);

  async function submitPin(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setPinMode("unlocked"); return; }
    if (pinMode === "setup") {
      if (settingsPin !== pinConfirmation) { setPinMessage("Those PINs do not match."); return; }
      const { error } = await supabase.rpc("set_household_settings_pin", { p_pin: settingsPin });
      if (error) { setPinMessage(error.message); return; }
      setSettingsPin(""); setPinConfirmation(""); setPinMode("unlocked"); onUnlocked?.(); return;
    }
    const { data, error } = await supabase.rpc("verify_household_settings_pin", { p_pin: settingsPin });
    if (error) { setPinMessage(error.message); return; }
    if (!data) { setPinMessage("That PIN is not right. Try again."); setSettingsPin(""); return; }
    setSettingsPin(""); setPinMode("unlocked"); onUnlocked?.();
  }

  function addApple(event: FormEvent) {
    event.preventDefault();
    if (!appleUrl.trim()) return;
    onAddApple(appleName.trim() || "Apple Calendar", appleUrl.trim());
    setAppleUrl("");
  }

  async function inviteAdult(event: FormEvent) {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setInviteStatus("Creating a private invite…");
    try {
      const result = await onInviteAdult(inviteEmail, inviteName);
      if (result.error) { setInviteStatus(result.error); return; }
      setInviteStatus("Invite link copied. Send it only to this email address.");
      setInviteEmail("");
      if (result.link) await prompt("Copy this private invitation link and send it to them:", result.link, { title: "Private invitation link", confirmLabel: "Done" });
    } finally {
      setInviting(false);
    }
  }

  async function saveNickname(event: FormEvent) {
    event.preventDefault();
    setSavingNickname(true);
    setNicknameMessage("");
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const result = await onUpdateCurrentMemberName(String(form.get("nickname") ?? ""));
    setSavingNickname(false);
    setNicknameMessage(result.error ?? "Nickname saved.");
  }

  async function submitNewPerson(event: FormEvent) {
    event.preventDefault();
    if (addingPerson) return;
    setAddingPerson(true);
    setPersonMessage("Adding person…");
    try {
      const result = await onAddMember(newPersonName, newPersonRole);
      if (result.error) { setPersonMessage(result.error); return; }
      setNewPersonName("");
      setNewPersonRole("child");
      setPersonMessage("");
      setShowAddPerson(false);
    } finally {
      setAddingPerson(false);
    }
  }

  async function handleRemoveMember(member: Member) {
    if (currentUserId && String(member.userId) === currentUserId) {
      setMemberMessage("You cannot remove the account you are currently using.");
      return;
    }
    if (!await confirm(`Remove ${member.name} from this family? Their assigned tasks and chores will become unassigned.`, { title: "Remove family member?", destructive: true })) return;
    setRemovingMemberId(member.id);
    setMemberMessage("");
    const result = await onRemoveMember(member);
    setRemovingMemberId(null);
    if (result.error) setMemberMessage(result.error);
  }

  if (pinMode !== "unlocked") return <SettingsPinGate mode={pinMode} settingsPin={settingsPin} pinConfirmation={pinConfirmation} pinMessage={pinMessage} onPinChange={setSettingsPin} onConfirmationChange={setPinConfirmation} onSubmit={submitPin} />;
  if (!currentMember) return <SettingsStatus message="Your family profile is still loading." />;

  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <SettingsGroup id="settings-personal" eyebrow="PERSONAL" title="Your settings" description="Set the way this family home feels for you.">
        <article className="rounded-2xl bg-sky-50 p-5 dark:bg-sky-400/10"><p className="font-bold">Appearance</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Auto follows local sunrise and sunset using the weather location.</p><div className="mt-4 flex flex-wrap gap-2">{([ ["auto", "Auto", "settings"], ["light", "Light", "sun"], ["dark", "Dark", "moon"] ] as const).map(([mode, label, icon]) => <button key={mode} type="button" onClick={() => onThemeModeChange(mode)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${themeMode === mode ? "bg-sky-600 text-white shadow-sm" : "bg-white text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100 dark:bg-white/10 dark:text-sky-100 dark:ring-white/10"}`}><AppIcon name={icon} className="size-4" />{label}</button>)}</div></article>
        <article className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-400/10"><p className="font-bold">Your nickname</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">This is the name your family sees for your account.</p><form key={currentMember.id} onSubmit={saveNickname} className="mt-4 flex flex-wrap items-end gap-3"><label htmlFor="current-member-nickname" className="min-w-0 flex-1 text-sm font-bold">Nickname<input id="current-member-nickname" name="nickname" required maxLength={60} defaultValue={currentMember.name} onChange={() => setNicknameMessage("")} placeholder="e.g. Kristen" className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800" /></label><button type="submit" disabled={savingNickname} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">{savingNickname ? "Saving…" : "Save nickname"}</button></form>{nicknameMessage && <p className="mt-3 text-sm font-semibold text-violet-700 dark:text-violet-200">{nicknameMessage}</p>}</article>
      </SettingsGroup>

      <SettingsGroup id="settings-notifications" eyebrow="NOTIFICATIONS" title="Phone notifications" description="Choose whether this device can receive family updates when the app is closed.">
        <NotificationSettings householdId={householdId} currentMember={currentMember} />
      </SettingsGroup>

      <SettingsGroup id="settings-family" eyebrow="FAMILY" title="People and household" description="Manage the people who share this home and the sections they see.">
        <article className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-400/10"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">People and colors</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Choose a color for each person. It appears on their calendar events and assigned tasks.</p></div><button type="button" onClick={() => { setShowAddPerson((value) => !value); setPersonMessage(""); }} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700"><AppIcon name="plus" className="size-4" />Add person</button></div>{showAddPerson && <form onSubmit={submitNewPerson} className="mt-4 grid gap-3 rounded-2xl bg-white/70 p-3 ring-1 ring-violet-100 dark:bg-white/10 dark:ring-white/10 sm:grid-cols-[1fr_9rem_auto]"><label className="text-sm font-bold">Name<input required autoFocus value={newPersonName} onChange={(event) => { setNewPersonName(event.target.value); setPersonMessage(""); }} placeholder="e.g. Grandma" className="mt-1 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm text-slate-800" /></label><label className="text-sm font-bold">Type<StyledSelect value={newPersonRole} onChange={(event) => setNewPersonRole(event.target.value as Member["role"])}><option value="child">Child</option><option value="adult">Adult</option></StyledSelect></label><div className="flex items-end gap-2"><button type="button" onClick={() => { setShowAddPerson(false); setNewPersonName(""); setPersonMessage(""); }} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-700">Add</button></div>{personMessage && <p className="sm:col-span-3 text-sm font-semibold text-rose-600">{personMessage}</p>}</form>}<div className="mt-4 grid gap-3 sm:grid-cols-2">{members.map((member, index) => { const currentColor = isHexColor(member.color ?? "") && member.color !== defaultMemberColor ? member.color! : memberCalendarColor(member, index); return <div key={member.id} className="relative rounded-2xl bg-white/80 p-3 ring-1 ring-violet-100 dark:bg-white/10 dark:ring-white/10"><div className="flex items-center gap-3 pr-10"><span className="size-8 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: currentColor }} /><div className="min-w-0"><p className="truncate font-bold">{member.name}</p><p className="text-xs text-slate-500 dark:text-slate-300">{member.role === "adult" ? "Adult" : "Child"}</p></div></div>{currentUserId && String(member.userId) === currentUserId ? <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">Current</span> : <button type="button" onClick={() => void handleRemoveMember(member)} disabled={String(removingMemberId) === String(member.id)} aria-label={`Remove ${member.name}`} className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-50"><AppIcon name="trash" className="size-4" /></button>}<div className="mt-3 flex flex-wrap items-center gap-2">{memberColorOptions.map((color) => <button key={color} type="button" aria-label={`Set ${member.name}'s color to ${color}`} onClick={() => void onMemberColorChange(member.id, color)} className={`size-7 rounded-full border-2 ${currentColor.toLowerCase() === color ? "border-slate-900 ring-2 ring-white" : "border-white/80 dark:border-white/20"}`} style={{ backgroundColor: color }} />)}<label className="relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-dashed border-violet-300 text-xs font-black text-violet-600 dark:border-violet-200 dark:text-violet-200" title={`Choose ${member.name}'s custom color`}><AppIcon name="plus" className="size-4" /><input type="color" aria-label={`Choose ${member.name}'s custom color`} value={currentColor} onChange={(event) => void onMemberColorChange(member.id, event.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" /></label></div></div>; })}</div>{members.length === 0 && <p className="mt-4 text-sm text-slate-500">No people have been added yet.</p>}{memberMessage && <p className="mt-3 text-sm font-semibold text-rose-600">{memberMessage}</p>}</article>
        <article className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-400/10"><p className="font-bold">Invite an adult</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">They&apos;ll get their own login and see this same family home.</p><form onSubmit={inviteAdult} className="mt-4 grid gap-3 sm:grid-cols-2"><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="Adult&apos;s email address" className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800"/><input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="Name (optional)" className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Create private invite</button></form>{inviteStatus && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-200">{inviteStatus}</p>}</article>
        <article className="rounded-2xl bg-amber-50 p-5 dark:bg-amber-400/10"><p className="font-bold">Home tabs</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Hide sections your household does not use. Your data stays saved if you hide a tab.</p><div className="mt-4 space-y-2"><label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm dark:bg-white/5 dark:text-slate-100"><input type="checkbox" checked={showChoresTab} onChange={(event) => onTabVisibilityChange("chores", event.target.checked)} className="size-4 accent-amber-600"/><span className="flex-1">Chores</span><span className={showChoresTab ? "text-emerald-600" : "text-slate-400"}>{showChoresTab ? "Shown" : "Hidden"}</span></label><label className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm dark:bg-white/5 dark:text-slate-100"><input type="checkbox" checked={showWishlistTab} onChange={(event) => onTabVisibilityChange("wishlist", event.target.checked)} className="size-4 accent-amber-600"/><span className="flex-1">Wish lists</span><span className={showWishlistTab ? "text-emerald-600" : "text-slate-400"}>{showWishlistTab ? "Shown" : "Hidden"}</span></label></div></article>
      </SettingsGroup>

      <SettingsGroup id="settings-calendars" eyebrow="CALENDARS" title="Calendar connections" description="Choose which Google and Apple calendars appear in your family calendar.">
        <article className="rounded-2xl bg-slate-50 p-5 dark:bg-white/5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-bold">Google Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose which Google calendars appear in your family calendar.</p></div><button type="button" onClick={onConnect} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">{googleConnections.length ? <><AppIcon name="plus" className="size-4" />Add Google account</> : "Connect Google"}</button></div>{googleConnections.length > 0 && <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 dark:border-white/10">{googleConnections.map((connection) => <label key={connection.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm dark:bg-white/5"><input type="checkbox" checked={connection.enabled} onChange={() => onToggleConnection(connection)} className="size-4 accent-violet-600"/><span className="flex-1">{connection.name}</span><span className={connection.enabled ? "text-emerald-600" : "text-slate-400"}>{connection.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article>
        <article className="rounded-2xl bg-rose-50 p-5 dark:bg-rose-400/10"><div><p className="font-bold">Apple / iCloud Calendar</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paste a public iCloud calendar link for read-only import.</p></div><form onSubmit={addApple} className="mt-4 grid gap-3 sm:grid-cols-[10rem_1fr_auto]"><input value={appleName} onChange={(event) => setAppleName(event.target.value)} placeholder="Calendar name" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><input required value={appleUrl} onChange={(event) => setAppleUrl(event.target.value)} placeholder="Paste public iCloud link" className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm text-slate-800"/><button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white">Add</button></form>{appleFeeds.length > 0 && <div className="mt-5 space-y-2 border-t border-rose-200 pt-4">{appleFeeds.map((feed) => <label key={feed.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-800 shadow-sm"><input type="checkbox" checked={feed.enabled} onChange={() => onToggleApple(feed)} className="size-4 accent-rose-500"/><span className="flex-1">{feed.name}</span><span className={feed.enabled ? "text-emerald-600" : "text-slate-400"}>{feed.enabled ? "Included" : "Hidden"}</span></label>)}</div>}</article>
      </SettingsGroup>
    </div>
  </section>;
}

function SettingsGroup({ id, eyebrow, title, description, children }: { id: string; eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-6"><div className="border-b border-slate-100 pb-5 dark:border-white/10"><p className="text-sm font-black uppercase tracking-wide text-indigo-600 dark:text-indigo-300">{eyebrow}</p><h2 id={`${id}-title`} className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">{description}</p></div><div className="mt-5 space-y-5">{children}</div></section>;
}

function SettingsPinGate({ mode, settingsPin, pinConfirmation, pinMessage, onPinChange, onConfirmationChange, onSubmit }: { mode: PinMode; settingsPin: string; pinConfirmation: string; pinMessage: string; onPinChange: (value: string) => void; onConfirmationChange: (value: string) => void; onSubmit: (event: FormEvent) => void }) {
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-md rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS LOCK</p><h2 className="mt-1 text-3xl font-bold">{mode === "setup" ? "Create a settings PIN" : "Enter settings PIN"}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{mode === "setup" ? "Choose a 4–8 digit PIN so little hands cannot change calendar connections or family settings." : "Enter the family PIN to open Settings."}</p>{mode === "loading" ? <p className="mt-6 text-sm font-semibold text-slate-400">Checking lock…</p> : <form onSubmit={onSubmit} className="mt-6 space-y-3"><input required inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} autoFocus type="password" value={settingsPin} onChange={(event) => onPinChange(event.target.value.replace(/\D/g, ""))} placeholder="4–8 digit PIN" className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-center text-lg tracking-[.35em] text-slate-800"/>{mode === "setup" && <input required inputMode="numeric" pattern="[0-9]{4,8}" minLength={4} maxLength={8} type="password" value={pinConfirmation} onChange={(event) => onConfirmationChange(event.target.value.replace(/\D/g, ""))} placeholder="Confirm PIN" className="w-full rounded-xl border border-violet-200 bg-white px-4 py-3 text-center text-lg tracking-[.35em] text-slate-800"/>}<button className="w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700">{mode === "setup" ? "Save PIN" : "Unlock settings"}</button>{pinMessage && <p className="text-sm font-semibold text-rose-600">{pinMessage}</p>}</form>}</div></section>;
}

function SettingsStatus({ message }: { message: string }) {
  return <section className="mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="max-w-2xl rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="text-sm font-bold text-violet-600">SETTINGS</p><p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{message}</p></div></section>;
}
