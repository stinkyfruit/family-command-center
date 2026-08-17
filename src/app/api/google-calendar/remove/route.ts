import { NextRequest, NextResponse } from "next/server";
import { requestUser, serverSupabase } from "@/lib/google-calendar";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    const { householdId, connectionId } = await request.json();
    if (!user || !householdId || !connectionId) return NextResponse.json({ error: "Sign in before removing a calendar." }, { status: 401 });

    const admin = serverSupabase();
    const { data: connection, error: connectionError } = await admin
      .from("google_calendar_connections")
      .select("id, household_id, google_calendar_id")
      .eq("id", connectionId)
      .eq("household_id", householdId)
      .eq("connected_by", user.id)
      .single();
    if (connectionError || !connection) return NextResponse.json({ error: "That Google calendar could not be found." }, { status: 404 });

    const { data: credentialRows, error: credentialsError } = await admin.rpc("get_google_calendar_credentials", { p_connection_id: connection.id });
    const credentials = credentialRows?.[0];
    if (credentialsError || !credentials) return NextResponse.json({ error: "Google Calendar credentials were not found." }, { status: 400 });

    let accessToken = credentials.access_token;
    if (!credentials.expires_at || new Date(credentials.expires_at).getTime() < Date.now() + 60_000) {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
          client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "",
          refresh_token: credentials.refresh_token,
          grant_type: "refresh_token",
        }),
      });
      const refreshed = await refreshResponse.json();
      if (!refreshResponse.ok) throw new Error(refreshed.error_description ?? "Google token refresh failed.");
      accessToken = refreshed.access_token;
    }

    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.google_calendar_id)}/events?singleEvents=true&timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&maxResults=2500`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const calendar = await eventsResponse.json();
    if (!eventsResponse.ok) throw new Error(calendar.error?.message ?? "Google Calendar could not be read.");
    const externalIds = (calendar.items ?? []).filter((event: { status?: string }) => event.status !== "cancelled").map((event: { id: string }) => event.id).filter(Boolean);

    const { error: trackedEventsError } = await admin.from("events").delete().eq("household_id", householdId).eq("source", "google").eq("google_calendar_connection_id", connection.id);
    if (trackedEventsError) throw trackedEventsError;

    if (externalIds.length) {
      const { error: eventsError } = await admin.from("events").delete().eq("household_id", householdId).eq("source", "google").is("google_calendar_connection_id", null).in("external_id", externalIds);
      if (eventsError) throw eventsError;
    }

    const { error: deleteError } = await admin.from("google_calendar_connections").delete().eq("id", connection.id);
    if (deleteError) throw deleteError;
    return NextResponse.json({ removed: externalIds.length });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Could not remove Google Calendar.") }, { status: 500 });
  }
}
