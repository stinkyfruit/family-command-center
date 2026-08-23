import { supabase } from "@/lib/supabase";

export type NtfyNotificationRequest =
  | { event: "test"; householdId: string }
  | { event: "task_assigned"; householdId: string; targetMemberId: string; taskTitle: string; dueDate?: string | null }
  | { event: "child_mood_changed"; householdId: string; childMemberId: string; mood: string };

export async function requestNtfyNotification(payload: NtfyNotificationRequest) {
  if (!supabase) return { error: "Supabase is not configured." };
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { error: "Your session has expired. Please sign in again." };

  try {
    const response = await fetch("/api/notifications/ntfy", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string; sent?: number };
    return response.ok ? result : { error: result.error ?? "Could not send the notification." };
  } catch {
    return { error: "Could not reach the notification service." };
  }
}
