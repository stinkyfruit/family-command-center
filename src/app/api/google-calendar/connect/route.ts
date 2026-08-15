import { NextRequest, NextResponse } from "next/server";
import { createGoogleState, requestUser, serverSupabase } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    const { householdId } = await request.json();
    if (!user || !householdId) return NextResponse.json({ error: "Sign in before connecting a calendar." }, { status: 401 });
    const admin = serverSupabase();
    const { data: membership } = await admin.from("members").select("id").eq("household_id", householdId).eq("user_id", user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: "You do not have access to this household." }, { status: 403 });
    const state = createGoogleState({ householdId, userId: user.id, expiresAt: Date.now() + 10 * 60_000 });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({ client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID ?? "", redirect_uri: process.env.GOOGLE_CALENDAR_REDIRECT_URI ?? "", response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/calendar.readonly", state }).toString();
    if (!process.env.GOOGLE_CALENDAR_CLIENT_ID || !process.env.GOOGLE_CALENDAR_REDIRECT_URI) return NextResponse.json({ error: "Google Calendar has not been configured yet." }, { status: 503 });
    return NextResponse.json({ url: url.toString() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start Google Calendar connection." }, { status: 500 }); }
}
