import { NextRequest, NextResponse } from "next/server";
import { importGoogleEvents, requestUser, serverSupabase } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    const { householdId } = await request.json();
    if (!user || !householdId) return NextResponse.json({ error: "Sign in before syncing." }, { status: 401 });
    const admin = serverSupabase();
    const { data: connections } = await admin.from("google_calendar_connections").select("id, household_id, connected_by, google_calendar_id").eq("household_id", householdId).eq("connected_by", user.id);
    const count = await Promise.all((connections ?? []).map(importGoogleEvents));
    return NextResponse.json({ imported: count.reduce((total, value) => total + value, 0) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not sync calendars." }, { status: 500 }); }
}
