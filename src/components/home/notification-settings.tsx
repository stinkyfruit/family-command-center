"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/features/home/model";
import { AppIcon, useAppNotifications } from "@/components/home/shared-ui";
import { disablePushNotifications, enablePushNotifications, getPushEnabled, isPushSupported, requestPushNotification } from "@/lib/notification-client";
import { supabase } from "@/lib/supabase";

export function NotificationSettings({ householdId, currentMember }: { householdId?: string | null; currentMember: Member }) {
  const { notify } = useAppNotifications();
  const [resolvedHouseholdId, setResolvedHouseholdId] = useState<string | null>(householdId ?? null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(isPushSupported()));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const supported = isPushSupported();

  useEffect(() => {
    if (householdId) {
      return;
    }
    if (!supabase) {
      return;
    }
    let active = true;
    void supabase.from("members").select("household_id").eq("id", currentMember.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      setResolvedHouseholdId(data?.household_id ?? null);
      if (!data?.household_id) setLoading(false);
    });
    return () => { active = false; };
  }, [currentMember.id, householdId]);

  useEffect(() => {
    let active = true;
    if (!resolvedHouseholdId || !supported) return () => { active = false; };
    void getPushEnabled().then((value) => {
      if (!active) return;
      setEnabled(value);
      setLoading(false);
    });
    return () => { active = false; };
  }, [resolvedHouseholdId, supported]);

  async function enable() {
    if (!resolvedHouseholdId) return;
    setSaving(true);
    const result = await enablePushNotifications(resolvedHouseholdId, currentMember.id);
    setSaving(false);
    if (result.error) {
      notify(result.error, "warning");
      return;
    }
    setEnabled(true);
    notify("Phone notifications are enabled on this device.", "success");
  }

  async function disable() {
    setSaving(true);
    const result = await disablePushNotifications(currentMember.id);
    setSaving(false);
    if (result.error) {
      notify(result.error);
      return;
    }
    setEnabled(false);
    notify("Phone notifications are off on this device.", "info");
  }

  async function sendTest() {
    if (!resolvedHouseholdId) return;
    setTesting(true);
    const result = await requestPushNotification({ event: "test", householdId: resolvedHouseholdId });
    setTesting(false);
    if (result.error) notify(result.error);
    else notify("Test notification sent.", "success");
  }

  return <article className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-400/10">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/80 text-emerald-700 shadow-sm dark:bg-white/10 dark:text-emerald-200"><AppIcon name="bell" className="size-5" /></span>
      <div><p className="font-bold">Phone notifications</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Get task assignments and other family updates even when this app is not open.</p></div>
    </div>
    <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm font-semibold text-emerald-900 dark:bg-white/10 dark:text-emerald-100">On iPhone or iPad, add Family Command Center to your Home Screen before enabling notifications.</p>
    {!supported ? <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-300">This browser does not support phone notifications. Try the installed app in a current Safari or Chrome browser.</p> : <div className="mt-4 flex flex-wrap gap-2">
      {!enabled && <button type="button" onClick={() => void enable()} disabled={saving || loading || !resolvedHouseholdId} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50"><AppIcon name="bell" className="size-4" />{saving || loading ? "Checking…" : "Enable on this device"}</button>}
      {enabled && <><button type="button" onClick={() => void sendTest()} disabled={testing} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50">{testing ? "Sending…" : "Send test notification"}</button><button type="button" onClick={() => void disable()} disabled={saving} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50">Turn off on this device</button></>}
    </div>}
    {enabled && <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-100">Enabled on this device. You can turn it off here at any time.</p>}
  </article>;
}
