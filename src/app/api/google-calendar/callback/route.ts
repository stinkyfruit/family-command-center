import { NextRequest, NextResponse } from "next/server";
import { importGoogleEvents, serverSupabase, verifyGoogleState } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const redirect = new URL("/", request.url);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const verified = state ? verifyGoogleState(state) : null;
  if (!code || !verified) { redirect.searchParams.set("calendar", "google-error"); return NextResponse.redirect(redirect); }
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "", redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? "", grant_type: "authorization_code" }) });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.refresh_token) throw new Error(tokens.error_description ?? "Google did not return a refresh token.");
    const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList/primary", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const calendar = await calendarResponse.json();
    if (!calendarResponse.ok) throw new Error(calendar.error?.message ?? "Could not read your primary calendar.");
    const admin = serverSupabase();
    const { data: connection, error } = await admin.from("google_calendar_connections").upsert({ household_id: verified.householdId, connected_by: verified.userId, google_calendar_id: calendar.id, display_name: calendar.summaryOverride ?? calendar.summary ?? "Google Calendar", color: calendar.backgroundColor ?? null }, { onConflict: "household_id,google_calendar_id" }).select("id, household_id, connected_by, google_calendar_id").single();
    if (error || !connection) throw error ?? new Error("Could not save the calendar connection.");
    const { error: credentialsError } = await admin.rpc("store_google_calendar_credentials", { p_connection_id: connection.id, p_access_token: tokens.access_token, p_refresh_token: tokens.refresh_token, p_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString() });
    if (credentialsError) throw credentialsError;
    await importGoogleEvents(connection);
    redirect.searchParams.set("calendar", "google-connected");
  } catch { redirect.searchParams.set("calendar", "google-error"); }
  return NextResponse.redirect(redirect);
}
