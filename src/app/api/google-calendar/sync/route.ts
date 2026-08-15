import { NextRequest, NextResponse } from "next/server";
import { importGoogleEvents, requestUser, serverSupabase } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    const { householdId, force = false } = await request.json();
    if (!user || !householdId) return NextResponse.json({ error: "Sign in before syncing." }, { status: 401 });
    const admin = serverSupabase();
    const { data: connections } = await admin.from("google_calendar_connections").select("id, household_id, connected_by, google_calendar_id, last_synced_at").eq("household_id", householdId).eq("connected_by", user.id);
    if (!connections?.length) return NextResponse.json({ needsConnection: true, imported: 0 });
    const staleConnections = force ? connections : connections.filter((connection) => !connection.last_synced_at || Date.now() - new Date(connection.last_synced_at).getTime() > 10 * 60_000);
    const count = await Promise.all(staleConnections.map(importGoogleEvents));
    return NextResponse.json({ imported: count.reduce((total, value) => total + value, 0), skipped: staleConnections.length === 0 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not sync calendars." }, { status: 500 }); }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    const householdId = request.nextUrl.searchParams.get("householdId");
    if (!user || !householdId) return NextResponse.json({ error: "Sign in before checking calendar sync." }, { status: 401 });
    const admin = serverSupabase();
    const { data: connections } = await admin.from("google_calendar_connections").select("last_synced_at").eq("household_id", householdId).eq("connected_by", user.id);
    const lastSyncedAt = connections?.map((connection) => connection.last_synced_at).filter(Boolean).sort().at(-1) ?? null;
    return NextResponse.json({ connected: Boolean(connections?.length), lastSyncedAt });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not check calendar sync." }, { status: 500 }); }
}
