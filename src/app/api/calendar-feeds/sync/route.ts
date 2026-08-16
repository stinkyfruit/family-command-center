import { NextRequest, NextResponse } from "next/server";
import { parseIcal } from "@/lib/ical";
import { requestUser, serverSupabase } from "@/lib/google-calendar";

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return "Could not sync Apple Calendar.";
}

function appleFeedUrl(value: string) {
  const url = new URL(value.replace(/^webcal:/i, "https:"));
  if (url.protocol !== "https:" || !(url.hostname === "icloud.com" || url.hostname.endsWith(".icloud.com"))) throw new Error("Use the public iCloud calendar link from Apple Calendar.");
  return url.toString();
}

function appleOccurrences(event: ReturnType<typeof parseIcal>[number]) {
  if (!event.recurrenceRule?.includes("FREQ=YEARLY")) return [{ ...event, occurrenceId: event.uid }];
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const duration = end ? end.getTime() - start.getTime() : null;
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 4 }, (_, index) => {
    const year = currentYear - 1 + index;
    const occurrenceStart = new Date(start);
    occurrenceStart.setUTCFullYear(year);
    const occurrenceEnd = duration === null ? null : new Date(occurrenceStart.getTime() + duration);
    return { ...event, uid: `${event.uid}:${year}`, startsAt: occurrenceStart.toISOString(), endsAt: occurrenceEnd?.toISOString() ?? null, occurrenceId: `${event.uid}:${year}` };
  });
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    const { householdId, feedId } = await request.json();
    if (!user || !householdId) return NextResponse.json({ error: "Sign in before syncing." }, { status: 401 });
    const admin = serverSupabase();
    const base = admin.from("calendar_feeds").select("id, household_id, created_by, display_name, feed_url").eq("household_id", householdId).eq("created_by", user.id).eq("enabled", true);
    const { data: feeds, error } = feedId ? await base.eq("id", feedId) : await base;
    if (error) throw error;
    let imported = 0;
    for (const feed of feeds ?? []) {
      const response = await fetch(appleFeedUrl(feed.feed_url), { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not read ${feed.display_name}.`);
      const parsedEvents = parseIcal(await response.text()).flatMap(appleOccurrences);
      const externalIds = parsedEvents.map((event) => `${feed.id}:${event.uid}`);
      const { data: existingEvents } = externalIds.length ? await admin.from("events").select("external_id, category, category_override").eq("household_id", feed.household_id).eq("source", "apple").in("external_id", externalIds) : { data: [] };
      const existingByExternalId = new Map((existingEvents ?? []).map((event) => [event.external_id, event]));
      const events = parsedEvents.map((event) => {
        const externalId = `${feed.id}:${event.uid}`;
        const existing = existingByExternalId.get(externalId);
        return { household_id: feed.household_id, created_by: feed.created_by, title: event.title, notes: event.notes, location: event.location, starts_at: event.startsAt, ends_at: event.endsAt, all_day: event.allDay, color: "#ec4899", source: "apple", external_id: externalId, category: existing?.category_override ? existing.category : "General", category_override: existing?.category_override ?? false };
      });
      if (events.length) {
        const { error: upsertError } = await admin.from("events").upsert(events, { onConflict: "household_id,source,external_id" });
        if (upsertError) throw upsertError;
      }
      await admin.from("calendar_feeds").update({ last_synced_at: new Date().toISOString() }).eq("id", feed.id);
      imported += events.length;
    }
    return NextResponse.json({ imported });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
