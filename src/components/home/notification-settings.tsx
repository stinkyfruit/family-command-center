"use client";

import { useEffect, useState } from "react";
import type { Member } from "@/features/home/model";
import { AppIcon, StyledSelect, useAppNotifications } from "@/components/home/shared-ui";
import { disablePushNotifications, enablePushNotifications, getPushDeviceEndpoint, getPushEnabled, isPushSupported, requestPushNotification } from "@/lib/notification-client";
import { supabase } from "@/lib/supabase";

export function NotificationSettings({ householdId, currentMember }: { householdId?: string | null; currentMember: Member }) {
  const { notify } = useAppNotifications();
  const [resolvedHouseholdId, setResolvedHouseholdId] = useState<string | null>(householdId ?? null);
  const [enabled, setEnabled] = useState(false);
  const [deviceEndpoint, setDeviceEndpoint] = useState<string | null>(null);
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
    const client = supabase;
    void Promise.all([
      supported ? getPushEnabled() : Promise.resolve(false),
      supported ? getPushDeviceEndpoint() : Promise.resolve(null),
      client.from("households").select("morning_digest_time").eq("id", resolvedHouseholdId).single(),
    ]).then(async ([pushValue, endpoint, digestResult]) => {
      if (!active) return;
      setEnabled(pushValue);
      setDeviceEndpoint(endpoint);
      if (!digestResult.error) {
        setDigestTime(String(digestResult.data?.morning_digest_time ?? "08:00").slice(0, 5));
      }
      const deviceDigestResult = endpoint
        ? await client.from("notification_devices").select("morning_digest_enabled").eq("household_id", resolvedHouseholdId).eq("member_id", currentMember.id).eq("endpoint", endpoint).maybeSingle()
        : null;
      if (!active) return;
      if (!deviceDigestResult?.error) {
        setDigestEnabled(Boolean(deviceDigestResult?.data?.morning_digest_enabled));
      }
      setLoading(false);
      setDigestLoading(false);
    });
    return () => { active = false; };
  }, [currentMember.id, resolvedHouseholdId, supported]);

  async function saveDigestTime(time: string) {
    if (!resolvedHouseholdId || !supabase) return;
    setDigestSaving(true);
    const { error } = await supabase.from("households").update({ morning_digest_time: time }).eq("id", resolvedHouseholdId);
    setDigestSaving(false);
    if (error) notify(`Could not save the morning digest setting: ${error.message}`);
  }

  async function saveDigestDevice(enabledValue: boolean) {
    if (!resolvedHouseholdId || !supabase || !deviceEndpoint) {
      setDigestEnabled(false);
      notify("Enable phone notifications on this device first.", "warning");
      return;
    }
    setDigestSaving(true);
    const { error } = await supabase.from("notification_devices").update({ morning_digest_enabled: enabledValue }).eq("household_id", resolvedHouseholdId).eq("member_id", currentMember.id).eq("endpoint", deviceEndpoint);
    setDigestSaving(false);
    if (error) {
      setDigestEnabled(!enabledValue);
      notify(`Could not save the morning digest setting: ${error.message}`);
    }
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
    setDeviceEndpoint(result.endpoint ?? null);
    setDigestEnabled(false);
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
    setDeviceEndpoint(null);
    setDigestEnabled(false);
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
    if (!deviceEndpoint) return;
    setDigestPreviewing(true);
    const result = await requestPushNotification({ event: "morning_digest_preview", householdId: resolvedHouseholdId, endpoint: deviceEndpoint });
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
    <div className="mt-4 grid gap-3">
      <section className="rounded-2xl bg-white/75 p-4 ring-1 ring-emerald-100 dark:bg-white/10 dark:ring-white/10">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100"><AppIcon name="bell" className="size-4" /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">Family updates</p>{enabled && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100">On this device</span>}</div><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Receive assignments and family activity notifications on this device.</p></div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={enabled} disabled={!supported || saving || loading || !resolvedHouseholdId} onChange={(event) => void (event.target.checked ? enable() : disable())} className="size-4 accent-emerald-600" /><span>{enabled ? "On" : "Off"}</span></label>
        </div>
        {!supported ? <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-300">This browser does not support phone notifications. Try the installed app in a current Safari or Chrome browser.</p> : <div className="mt-4 flex flex-wrap gap-2">
          {enabled && <button type="button" onClick={() => void sendTest()} disabled={testing} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50">{testing ? "Sending…" : "Send test notification"}</button>}
        </div>}
        {enabled && <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-100">Ready to receive notifications.</p>}
      </section>
      {supabase && resolvedHouseholdId && <section className="rounded-2xl bg-white/75 p-4 ring-1 ring-emerald-100 dark:bg-white/10 dark:ring-white/10">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-100"><AppIcon name="calendar" className="size-4" /></span>
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">Daily morning digest</p>{digestEnabled && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-100">On</span>}</div><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Get today&apos;s calendar events and open tasks due today.</p></div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-bold"><input type="checkbox" checked={digestEnabled} disabled={!enabled || digestLoading || digestSaving} onChange={(event) => { setDigestEnabled(event.target.checked); void saveDigestDevice(event.target.checked); }} className="size-4 accent-emerald-600" /><span>{digestEnabled ? "On" : "Off"}</span></label>
        </div>
        {digestEnabled && <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm font-bold">Household sends at<StyledSelect value={digestTime} disabled={digestSaving} onChange={(event) => { setDigestTime(event.target.value); void saveDigestTime(event.target.value); }}><option value="06:00">6:00 AM</option><option value="07:00">7:00 AM</option><option value="08:00">8:00 AM</option><option value="09:00">9:00 AM</option><option value="10:00">10:00 AM</option></StyledSelect></label>
          <button type="button" onClick={() => void sendDigestPreview()} disabled={!enabled || digestPreviewing} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50">{digestPreviewing ? "Sending…" : "Send a preview"}</button>
        </div>}
        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Choose whether this device receives the household digest. The schedule uses your household timezone.</p>
      </section>}
    </div>
  </article>;
}
