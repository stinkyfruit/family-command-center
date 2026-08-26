"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/features/home/model";
import { AppIcon, StyledSelect, useAppNotifications } from "@/components/home/shared-ui";
import { disablePushNotifications, enablePushNotifications, getPushEnabled, isPushSupported, requestPushNotification } from "@/lib/notification-client";
import { supabase } from "@/lib/supabase";

export function NotificationSettings({ householdId, currentMember }: { householdId?: string | null; currentMember: Member }) {
  const { notify } = useAppNotifications();
  const [resolvedHouseholdId, setResolvedHouseholdId] = useState<string | null>(householdId ?? null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(() => Boolean(isPushSupported()));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestTime, setDigestTime] = useState("08:00");
  const [digestLoading, setDigestLoading] = useState(() => Boolean(supabase));
  const [digestSaving, setDigestSaving] = useState(false);
  const [digestPreviewing, setDigestPreviewing] = useState(false);
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
    if (!resolvedHouseholdId || !supabase) {
      return () => { active = false; };
    }
    void Promise.all([
      supported ? getPushEnabled() : Promise.resolve(false),
      supabase.from("households").select("morning_digest_enabled, morning_digest_time").eq("id", resolvedHouseholdId).single(),
    ]).then(([pushValue, digestResult]) => {
      if (!active) return;
      setEnabled(pushValue);
      if (!digestResult.error) {
        setDigestEnabled(Boolean(digestResult.data?.morning_digest_enabled));
        setDigestTime(String(digestResult.data?.morning_digest_time ?? "08:00").slice(0, 5));
      }
      setLoading(false);
      setDigestLoading(false);
    });
    return () => { active = false; };
  }, [resolvedHouseholdId, supported]);

  async function saveDigest(patch: { morning_digest_enabled?: boolean; morning_digest_time?: string }) {
    if (!resolvedHouseholdId || !supabase) return;
    setDigestSaving(true);
    const { error } = await supabase.from("households").update(patch).eq("id", resolvedHouseholdId);
    setDigestSaving(false);
    if (error) notify(`Could not save the morning digest setting: ${error.message}`);
  }

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

  async function sendDigestPreview() {
    if (!resolvedHouseholdId) return;
    setDigestPreviewing(true);
    const result = await requestPushNotification({ event: "morning_digest_preview", householdId: resolvedHouseholdId });
    setDigestPreviewing(false);
    if (result.error) notify(result.error);
    else notify("Morning digest preview sent.", "success");
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
    {supabase && resolvedHouseholdId && <div className="mt-5 border-t border-emerald-200 pt-5 dark:border-white/10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-bold">Daily morning digest</p><p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-300">Send this household a summary of today&apos;s calendar events and open tasks due today.</p></div>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={digestEnabled} disabled={digestLoading || digestSaving} onChange={(event) => { setDigestEnabled(event.target.checked); void saveDigest({ morning_digest_enabled: event.target.checked }); }} className="size-4 accent-emerald-600" /><span>{digestEnabled ? "On" : "Off"}</span></label>
      </div>
      {digestEnabled && <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm font-bold">Send at<StyledSelect value={digestTime} disabled={digestSaving} onChange={(event) => { setDigestTime(event.target.value); void saveDigest({ morning_digest_time: event.target.value }); }}><option value="06:00">6:00 AM</option><option value="07:00">7:00 AM</option><option value="08:00">8:00 AM</option><option value="09:00">9:00 AM</option><option value="10:00">10:00 AM</option></StyledSelect></label>
        <button type="button" onClick={() => void sendDigestPreview()} disabled={!enabled || digestPreviewing} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50">{digestPreviewing ? "Sending…" : "Send a preview"}</button>
      </div>}
      <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">The digest uses your household timezone and requires at least one device with phone notifications enabled.</p>
    </div>}
  </article>;
}
