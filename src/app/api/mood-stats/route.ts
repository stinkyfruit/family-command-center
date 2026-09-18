import { NextRequest, NextResponse } from "next/server";
import { requestUser, serverSupabase } from "@/lib/google-calendar";

export const runtime = "nodejs";

type MoodSelectionRow = { member_id: string; mood: string; selected_at: string };
type MoodCheckinRow = { member_id: string; mood: string; checked_in_at: string };

function identifier(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in to view mood stats." }, { status: 401 });

    const body = await request.json() as { householdId?: unknown };
    const householdId = identifier(body.householdId);
    if (!householdId) return NextResponse.json({ error: "A valid household is required." }, { status: 400 });

    const admin = serverSupabase();
    const { data: membership, error: membershipError } = await admin.from("members").select("id").eq("household_id", householdId).eq("user_id", user.id).maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return NextResponse.json({ error: "You do not have access to this household." }, { status: 403 });

    const [historyResult, checkinResult] = await Promise.all([
      admin.from("mood_checkin_selections").select("member_id, mood, selected_at").eq("household_id", householdId),
      admin.from("mood_checkins").select("member_id, mood, checked_in_at").eq("household_id", householdId),
    ]);
    if (checkinResult.error) throw checkinResult.error;

    const counts = new Map<string, { memberId: string; mood: string; count: number }>();
    const seenEvents = new Set<string>();
    const recordSelection = (memberId: string, mood: string, selectedAt: string) => {
      const eventKey = `${memberId}|${mood}|${selectedAt}`;
      if (seenEvents.has(eventKey)) return;
      seenEvents.add(eventKey);
      const countKey = `${memberId}|${mood}`;
      const current = counts.get(countKey);
      counts.set(countKey, { memberId, mood, count: (current?.count ?? 0) + 1 });
    };

    for (const row of (checkinResult.data ?? []) as MoodCheckinRow[]) recordSelection(row.member_id, row.mood, row.checked_in_at);
    for (const row of (historyResult.data ?? []) as MoodSelectionRow[]) recordSelection(row.member_id, row.mood, row.selected_at);

    return NextResponse.json({ counts: Array.from(counts.values()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load mood stats." }, { status: 500 });
  }
}
