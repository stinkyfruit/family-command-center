import { NextRequest, NextResponse } from "next/server";
import { requestUser, serverSupabase } from "@/lib/google-calendar";
import { publishNtfy } from "@/lib/ntfy";

type NotificationBody =
  | { event: "test"; householdId: string }
  | { event: "task_assigned"; householdId: string; targetMemberId: string; taskTitle: string; dueDate?: string | null }
  | { event: "child_mood_changed"; householdId: string; childMemberId: string; mood: string };

const moodLabels: Record<string, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  tired: "Tired",
  low: "Low",
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

async function sendToMembers(admin: ReturnType<typeof serverSupabase>, memberIds: string[], title: string, message: string, tags: string) {
  if (!memberIds.length) return { sent: 0, failed: 0 };
  const { data: subscriptions, error } = await admin
    .from("notification_subscriptions")
    .select("member_id, topic")
    .eq("provider", "ntfy")
    .eq("enabled", true)
    .in("member_id", memberIds);
  if (error) throw error;

  const results = await Promise.allSettled((subscriptions ?? []).map((subscription) => publishNtfy({
    topic: subscription.topic,
    title,
    message,
    tags,
  })));
  return {
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in before sending notifications." }, { status: 401 });
    const body = await request.json() as Partial<NotificationBody>;
    const householdId = text(body.householdId, 80);
    if (!householdId || !body.event) return NextResponse.json({ error: "A household and notification event are required." }, { status: 400 });

    const admin = serverSupabase();
    const { data: actor } = await admin.from("members").select("id").eq("household_id", householdId).eq("user_id", user.id).maybeSingle();
    if (!actor) return NextResponse.json({ error: "You do not have access to this household." }, { status: 403 });

    if (body.event === "test") {
      const result = await sendToMembers(admin, [actor.id], "Family Command Center", "Your ntfy notifications are connected.", "white_check_mark");
      return NextResponse.json(result);
    }

    if (body.event === "task_assigned") {
      const targetMemberId = text(body.targetMemberId, 80);
      const taskTitle = text(body.taskTitle, 200);
      if (!targetMemberId || !taskTitle) return NextResponse.json({ error: "The task recipient and title are required." }, { status: 400 });
      if (targetMemberId === actor.id) return NextResponse.json({ sent: 0, skipped: "self-assignment" });

      const { data: target } = await admin.from("members").select("id, display_name").eq("id", targetMemberId).eq("household_id", householdId).maybeSingle();
      if (!target) return NextResponse.json({ error: "The task recipient is not in this household." }, { status: 400 });
      const dueDate = text(body.dueDate, 40);
      const dueText = dueDate ? ` Due ${dueDate}.` : "";
      const result = await sendToMembers(admin, [target.id], "New task assigned", `${taskTitle}.${dueText}`, "clipboard");
      return NextResponse.json(result);
    }

    if (body.event === "child_mood_changed") {
      const childMemberId = text(body.childMemberId, 80);
      const mood = text(body.mood, 20);
      if (!childMemberId || !mood || !moodLabels[mood]) return NextResponse.json({ error: "The child and mood are required." }, { status: 400 });
      const { data: child } = await admin.from("members").select("id, display_name, role").eq("id", childMemberId).eq("household_id", householdId).maybeSingle();
      if (!child || child.role !== "child") return NextResponse.json({ error: "Mood notifications are only for child check-ins." }, { status: 400 });
      const { data: adults } = await admin.from("members").select("id").eq("household_id", householdId).eq("role", "adult");
      const result = await sendToMembers(admin, (adults ?? []).map((adult) => adult.id), "Family mood updated", `${child.display_name} checked in as ${moodLabels[mood]}.`, mood === "low" ? "cry" : "speech_balloon");
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unsupported notification event." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send notification." }, { status: 500 });
  }
}
