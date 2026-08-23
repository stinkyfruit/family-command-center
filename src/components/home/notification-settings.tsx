import { useEffect, useState } from "react";
import type { Member } from "@/features/home/model";
import { requestNtfyNotification } from "@/lib/notification-client";
import { supabase } from "@/lib/supabase";

const topicPattern = /^[A-Za-z0-9_-]{1,64}$/;

function newTopic() {
  const random = typeof crypto.randomUUID === "function" ? crypto.randomUUID().replaceAll("-", "") : `${Date.now()}${Math.random().toString(36).slice(2)}`;
  return `family-${random}`.slice(0, 64);
}

export function NotificationSettings({ householdId, currentMember }: { householdId: string | null; currentMember: Member }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(() => Boolean(supabase && householdId));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase || !householdId) return;
    supabase.from("notification_subscriptions").select("topic").eq("household_id", householdId).eq("member_id", currentMember.id).eq("provider", "ntfy").maybeSingle().then(({ data, error }) => {
      if (error && error.code !== "42P01") setMessage(error.message);
      setTopic(data?.topic ?? "");
      setLoading(false);
    });
  }, [householdId, currentMember.id]);

  async function saveTopic() {
    if (!supabase || !householdId || !topicPattern.test(topic)) { setMessage("Use a topic with only letters, numbers, dashes, or underscores."); return; }
    setSaving(true); setMessage("");
    const { error } = await supabase.from("notification_subscriptions").upsert({ household_id: householdId, member_id: currentMember.id, provider: "ntfy", topic, enabled: true }, { onConflict: "member_id,provider" });
    setSaving(false);
    setMessage(error ? (error.code === "42P01" ? "Run the ntfy notifications migration in Supabase first." : error.message) : "Notification topic saved.");
  }

  async function testTopic() {
    if (!householdId || !topic) return;
    setTesting(true); setMessage("");
    const result = await requestNtfyNotification({ event: "test", householdId });
    setTesting(false);
    setMessage(result.error ?? "Test notification sent. Check your ntfy app.");
  }

  const topicUrl = topic ? `${(process.env.NEXT_PUBLIC_NTFY_BASE_URL ?? "https://ntfy.sh").replace(/\/$/, "")}/${topic}` : "";
  return <article className="mt-5 rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-400/10">
    <p className="font-bold">Phone notifications</p>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Use the ntfy app to get task assignments and child mood updates on your phone.</p>
    {loading ? <p className="mt-4 text-sm font-semibold text-slate-400">Checking notification setup…</p> : <>
      <div className="mt-4 flex flex-wrap gap-2">
        <input aria-label="ntfy topic" value={topic} onChange={(event) => { setTopic(event.target.value.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64)); setMessage(""); }} placeholder="Your private ntfy topic" className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-800" />
        <button type="button" onClick={() => { setTopic(newTopic()); setMessage(""); }} className="rounded-xl border border-emerald-300 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-100">Generate</button>
        <button type="button" onClick={() => void saveTopic()} disabled={saving} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
      </div>
      {topic && <div className="mt-4 rounded-xl bg-white/70 p-3 text-sm dark:bg-white/10"><p className="font-bold">Subscribe in ntfy</p><a href={topicUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-emerald-700 underline dark:text-emerald-200">{topicUrl}</a><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void navigator.clipboard?.writeText(topicUrl)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-emerald-50">Copy topic link</button><button type="button" onClick={() => void testTopic()} disabled={testing} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{testing ? "Sending…" : "Send test notification"}</button></div></div>}
      {message && <p role="status" className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-100">{message}</p>}
    </>}
  </article>;
}
