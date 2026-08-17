import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

type OAuthState = { householdId: string; userId: string; expiresAt: number };

export function calendarEventCategory(title: string) {
  const text = title.toLowerCase();
  if (/\b(birthday|bday|birth day)\b/.test(text)) return "Birthday";
  if (/\b(soccer|football|baseball|softball|basketball|volleyball|tennis|swim|swimming|gymnastics|dance|practice|game|match|tournament)\b/.test(text)) return "Sports";
  if (/\b(test|exam|quiz|project|assignment|homework|school due|due date)\b/.test(text)) return "School Test/Project Due";
  if (/\b(vacation|vacay|trip|travel|flight|hotel|cruise)\b/.test(text)) return "Vacation";
  if (/\b(christmas|thanksgiving|easter|halloween|new year|memorial day|labor day|fourth of july|july 4)\b/.test(text)) return "Holiday";
  return "General";
}

export function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase server configuration.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function requestUser(authorization: string | null) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !authorization?.startsWith("Bearer ")) return null;
  const client = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await client.auth.getUser();
  return data.user;
}

function stateSecret() {
  const secret = process.env.GOOGLE_CALENDAR_STATE_SECRET;
  if (!secret) throw new Error("Missing GOOGLE_CALENDAR_STATE_SECRET.");
  return secret;
}

export function createGoogleState(payload: OAuthState) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyGoogleState(value: string): OAuthState | null {
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState;
    return payload.expiresAt > Date.now() ? payload : null;
  } catch { return null; }
}

export async function importGoogleEvents(connection: { id: string; household_id: string; connected_by: string; google_calendar_id: string }) {
  const admin = serverSupabase();
  const { data: credentialRows, error } = await admin.rpc("get_google_calendar_credentials", { p_connection_id: connection.id });
  const credentials = credentialRows?.[0];
  if (error || !credentials) throw new Error("Google Calendar credentials were not found.");
  let accessToken = credentials.access_token;
  if (!credentials.expires_at || new Date(credentials.expires_at).getTime() < Date.now() + 60_000) {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "", refresh_token: credentials.refresh_token, grant_type: "refresh_token" }) });
    const refreshed = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(refreshed.error_description ?? "Google token refresh failed.");
    accessToken = refreshed.access_token;
    const { error: storeError } = await admin.rpc("store_google_calendar_credentials", { p_connection_id: connection.id, p_access_token: accessToken, p_refresh_token: credentials.refresh_token, p_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() });
    if (storeError) throw storeError;
  }
  const start = new Date();
  const end = new Date(); end.setFullYear(end.getFullYear() + 1);
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.google_calendar_id)}/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&maxResults=2500`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "Google Calendar sync failed.");
  const googleItems = (result.items ?? []).filter((item: { status?: string }) => item.status !== "cancelled") as { id: string; recurringEventId?: string; summary?: string; description?: string; location?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }[];
  const externalIds = googleItems.map((item) => item.id);
  const { data: trackedEvents } = await admin.from("events").select("id, external_id").eq("google_calendar_connection_id", connection.id);
  const seriesExternalIds = [...new Set(googleItems.flatMap((item) => item.recurringEventId ? [`${connection.id}:${item.recurringEventId}`] : []))];
  const { data: existingEvents } = externalIds.length ? await admin.from("events").select("external_id, category, category_override, member_ids, member_ids_override").eq("household_id", connection.household_id).eq("source", "google").in("external_id", externalIds) : { data: [] };
  const { data: seriesAssignments } = seriesExternalIds.length ? await admin.from("calendar_series_member_assignments").select("series_external_id, member_ids").eq("household_id", connection.household_id).eq("source", "google").in("series_external_id", seriesExternalIds) : { data: [] };
  const existingByExternalId = new Map((existingEvents ?? []).map((event) => [event.external_id, event]));
  const assignmentsBySeriesId = new Map((seriesAssignments ?? []).map((assignment) => [assignment.series_external_id, assignment.member_ids]));
  const events = googleItems.map((item) => {
    const existing = existingByExternalId.get(item.id);
    const seriesExternalId = item.recurringEventId ? `${connection.id}:${item.recurringEventId}` : null;
    const seriesMemberIds = seriesExternalId ? assignmentsBySeriesId.get(seriesExternalId) : undefined;
    const memberIds = existing?.member_ids_override ? existing.member_ids ?? [] : seriesMemberIds ?? [];
    const memberIdsOverride = Boolean(existing?.member_ids_override);
    const title = item.summary || "Untitled event";
    const category = existing?.category_override ? existing.category : calendarEventCategory(title);
    const isBirthday = category === "Birthday";
    return {
    household_id: connection.household_id, created_by: connection.connected_by, google_calendar_connection_id: connection.id, series_external_id: seriesExternalId, title: item.summary || "Untitled event", notes: item.description ?? null, location: item.location ?? null,
    starts_at: item.start?.dateTime ?? `${item.start?.date}T00:00:00.000Z`, ends_at: isBirthday ? null : (item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00.000Z` : null)), all_day: isBirthday || Boolean(item.start?.date), color: "#4285f4", source: "google", external_id: item.id,
    category,
    category_override: existing?.category_override ?? false, member_ids: memberIds, member_ids_override: memberIdsOverride,
  };
  });
  if (events.length) {
    const { error: upsertError } = await admin.from("events").upsert(events, { onConflict: "household_id,source,external_id" });
    if (upsertError) throw upsertError;
  }
  // Only remove events that a prior sync already tied to this exact calendar.
  // If Google gave us a paginated result, leave cleanup for the next complete sync.
  const removedIds = (trackedEvents ?? []).filter((event) => !externalIds.includes(event.external_id)).map((event) => event.id);
  if (!result.nextPageToken && removedIds.length) {
    const { error: cleanupError } = await admin.from("events").delete().in("id", removedIds);
    if (cleanupError) throw cleanupError;
  }
  await admin.from("google_calendar_connections").update({ last_synced_at: new Date().toISOString() }).eq("id", connection.id);
  return events.length;
}
