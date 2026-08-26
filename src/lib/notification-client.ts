import { supabase } from "@/lib/supabase";

export type PushNotificationRequest =
  | { event: "test"; householdId: string }
  | { event: "task_assigned"; householdId: string; targetMemberId: string; taskTitle: string; dueDate?: string | null }
  | { event: "family_activity"; householdId: string; activity: "task_created" | "list_created" | "list_item_added"; title: string; listTitle?: string; assigneeMemberId?: string | null }
  | { event: "mood_changed"; householdId: string; memberId: string; mood: string }
  | { event: "morning_digest_preview"; householdId: string };

export async function requestPushNotification(payload: PushNotificationRequest) {
  if (!supabase) return { error: "Supabase is not configured." };
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) return { error: "Your session has expired. Please sign in again." };

  try {
    const endpoint = payload.event === "morning_digest_preview"
      ? `/api/notifications/morning-digest?householdId=${encodeURIComponent(payload.householdId)}`
      : "/api/notifications/push";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { error?: string; sent?: number; failed?: number; skipped?: string };
    return response.ok ? result : { error: result.error ?? "Could not send the notification." };
  } catch {
    return { error: "Could not reach the notification service." };
  }
}

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function isPushSupported() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function enablePushNotifications(householdId: string, memberId: string | number) {
  if (!supabase) return { error: "Supabase is not configured." };
  if (!isPushSupported()) return { error: "This browser does not support phone notifications." };
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  if (!publicKey) return { error: "Web Push is not configured yet. Add the VAPID public key to the app environment." };
  if (Notification.permission === "denied") return { error: "Notifications are blocked for this site in your browser settings." };

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { error: "Notification permission was not granted." };

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const subscription = await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64Url(publicKey) });
  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;
  if (!p256dh || !auth) return { error: "The browser did not return a complete notification subscription." };

  const { error } = await supabase.from("notification_devices").upsert({
    household_id: householdId,
    member_id: memberId,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
    enabled: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (error) return { error: error.message };
  return { enabled: true, endpoint: subscription.endpoint };
}

export async function disablePushNotifications(memberId: string | number) {
  if (!supabase || !isPushSupported()) return { error: "Notifications are not available on this device." };
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return { enabled: false };
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await supabase.from("notification_devices").delete().eq("member_id", memberId).eq("endpoint", endpoint);
  if (error) return { error: error.message };
  return { enabled: false };
}

export async function getPushEnabled() {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return Boolean(await registration?.pushManager.getSubscription());
}

export async function getPushDeviceEndpoint() {
  if (!isPushSupported() || Notification.permission !== "granted") return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}
