import webpush from "web-push";
import { serverSupabase } from "@/lib/google-calendar";

type NotificationDevice = { id: string; endpoint: string; p256dh: string; auth: string };

function configureWebPush() {
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) throw new Error("Web Push is not configured. Set the VAPID subject, public key, and private key.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

async function sendPushToDevices(devices: NotificationDevice[] | null | undefined, title: string, body: string, tag: string) {
  configureWebPush();
  const admin = serverSupabase();

  const results = await Promise.allSettled((devices ?? []).map(async (device: NotificationDevice) => {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify({ title, body, tag, url: "/" }));
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : null;
      if (statusCode === 404 || statusCode === 410) await admin.from("notification_devices").update({ enabled: false }).eq("id", device.id);
      throw error;
    }
  }));

  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function sendPushToMembers(memberIds: string[], title: string, body: string, tag: string) {
  if (!memberIds.length) return { sent: 0, failed: 0 };
  const admin = serverSupabase();
  const { data: devices, error } = await admin
    .from("notification_devices")
    .select("id, endpoint, p256dh, auth")
    .eq("enabled", true)
    .in("member_id", memberIds);
  if (error) throw error;
  return sendPushToDevices(devices, title, body, tag);
}

export async function sendPushToHousehold(householdId: string, title: string, body: string, tag: string) {
  const admin = serverSupabase();
  const { data: devices, error } = await admin
    .from("notification_devices")
    .select("id, endpoint, p256dh, auth")
    .eq("household_id", householdId)
    .eq("enabled", true)
    .eq("morning_digest_enabled", true);
  if (error) throw error;
  return sendPushToDevices(devices, title, body, tag);
}
