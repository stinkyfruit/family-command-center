import { NextRequest, NextResponse } from "next/server";
import { requestUser, serverSupabase } from "@/lib/google-calendar";
import { buildMorningDigest, currentHouseholdDateTime } from "@/lib/morning-digest";
import { sendPushToHousehold } from "@/lib/push-server";

export const runtime = "nodejs";

function authorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function sendPreview(request: NextRequest, body: { householdId?: string }) {
  const user = await requestUser(request.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Sign in before previewing the morning digest." }, { status: 401 });
  const householdId = body.householdId ?? request.nextUrl.searchParams.get("householdId");
  if (!householdId) return NextResponse.json({ error: "A household is required." }, { status: 400 });
  const admin = serverSupabase();
  const { data: actor } = await admin.from("members").select("id").eq("household_id", householdId).eq("user_id", user.id).maybeSingle();
  if (!actor) return NextResponse.json({ error: "You do not have access to this household." }, { status: 403 });
  const { data: optedInDevice } = await admin.from("notification_devices").select("id").eq("household_id", householdId).eq("member_id", actor.id).eq("enabled", true).eq("morning_digest_enabled", true).limit(1).maybeSingle();
  if (!optedInDevice) return NextResponse.json({ error: "Turn on the morning digest for this device before sending a preview." }, { status: 400 });
  const { data: household } = await admin.from("households").select("timezone").eq("id", householdId).single();
  const timeZone = household?.timezone ?? "America/Chicago";
  const today = currentHouseholdDateTime(new Date(), timeZone).date;
  const digest = await buildMorningDigest(admin, householdId, today, timeZone);
  return NextResponse.json(await sendPushToHousehold(householdId, digest.title, digest.body, "morning-digest-preview"));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { event?: string; householdId?: string };
    if (body.event !== "morning_digest_preview") return NextResponse.json({ error: "Unsupported notification event." }, { status: 400 });
    return await sendPreview(request, body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the digest preview." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!authorizedCron(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const admin = serverSupabase();
    const { data: households, error } = await admin.from("households").select("id, timezone, morning_digest_time");
    if (error) throw error;
    let sent = 0;
    let skipped = 0;
    for (const household of households ?? []) {
      const timeZone = household.timezone || "America/Chicago";
      const localNow = currentHouseholdDateTime(new Date(), timeZone);
      const configuredHour = Number(String(household.morning_digest_time ?? "08:00").slice(0, 2));
      if (localNow.hour !== configuredHour) { skipped += 1; continue; }

      const { data: existing } = await admin.from("notification_digest_deliveries").select("id, status, claimed_at").eq("household_id", household.id).eq("digest_date", localNow.date).maybeSingle();
      if (existing?.status === "sent" || (existing?.claimed_at && Date.now() - new Date(existing.claimed_at).getTime() < 90 * 60_000)) { skipped += 1; continue; }
      if (existing) {
        await admin.from("notification_digest_deliveries").update({ status: "pending", claimed_at: new Date().toISOString(), error_message: null }).eq("id", existing.id);
      } else {
        const { error: claimError } = await admin.from("notification_digest_deliveries").insert({ household_id: household.id, digest_date: localNow.date, status: "pending", claimed_at: new Date().toISOString() });
        if (claimError) { skipped += 1; continue; }
      }

      try {
        const digest = await buildMorningDigest(admin, household.id, localNow.date, timeZone);
        await sendPushToHousehold(household.id, digest.title, digest.body, "morning-digest");
        await admin.from("notification_digest_deliveries").update({ status: "sent", sent_at: new Date().toISOString(), error_message: null }).eq("household_id", household.id).eq("digest_date", localNow.date);
        sent += 1;
      } catch (error) {
        await admin.from("notification_digest_deliveries").update({ status: "failed", claimed_at: null, error_message: error instanceof Error ? error.message : "Unknown digest error" }).eq("household_id", household.id).eq("digest_date", localNow.date);
      }
    }
    return NextResponse.json({ sent, skipped, households: households?.length ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not run morning digests." }, { status: 500 });
  }
}
