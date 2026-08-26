import { NextRequest, NextResponse } from "next/server";
import { requestUser, serverSupabase } from "@/lib/google-calendar";
import { sendPushToMembers } from "@/lib/push-server";

export const runtime = "nodejs";

type NotificationBody =
  | { event: "test"; householdId: string }
  | { event: "task_assigned"; householdId: string; targetMemberId: string; taskTitle: string; dueDate?: string | null }
  | { event: "family_activity"; householdId: string; activity: "task_created" | "list_created" | "list_item_added"; title: string; listTitle?: string; assigneeMemberId?: string | null }
  | { event: "mood_changed"; householdId: string; memberId: string; mood: string };

const moodLabels: Record<string, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  tired: "Tired",
  low: "Low",
  excited: "Excited",
  calm: "Calm",
  frustrated: "Frustrated",
  worried: "Worried",
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request.headers.get("authorization"));
    if (!user) return NextResponse.json({ error: "Sign in before sending notifications." }, { status: 401 });
    const body = await request.json() as Partial<NotificationBody>;
    const householdId = text(body.householdId, 80);
    if (!householdId || !body.event) return NextResponse.json({ error: "A household and notification event are required." }, { status: 400 });

    const admin = serverSupabase();
    const { data: actor } = await admin.from("members").select("id, display_name").eq("household_id", householdId).eq("user_id", user.id).maybeSingle();
    if (!actor) return NextResponse.json({ error: "You do not have access to this household." }, { status: 403 });

    if (body.event === "test") {
      return NextResponse.json(await sendPushToMembers([actor.id], "Family Command Center", "Phone notifications are connected.", "push-test"));
    }

    if (body.event === "task_assigned") {
      const targetMemberId = text(body.targetMemberId, 80);
      const taskTitle = text(body.taskTitle, 200);
      if (!targetMemberId || !taskTitle) return NextResponse.json({ error: "The task recipient and title are required." }, { status: 400 });
      if (targetMemberId === actor.id) return NextResponse.json({ sent: 0, skipped: "self-assignment" });
      const { data: target } = await admin.from("members").select("id").eq("id", targetMemberId).eq("household_id", householdId).maybeSingle();
      if (!target) return NextResponse.json({ error: "The task recipient is not in this household." }, { status: 400 });
      const dueDate = text(body.dueDate, 40);
      const dueText = dueDate ? ` Due ${dueDate}.` : "";
      return NextResponse.json(await sendPushToMembers([target.id], "New task assigned", `${taskTitle}.${dueText}`, "task-assigned"));
    }

    if (body.event === "family_activity") {
      const title = text(body.title, 200);
      const listTitle = text(body.listTitle, 120);
      if (body.activity !== "task_created" && body.activity !== "list_created" && body.activity !== "list_item_added") return NextResponse.json({ error: "The family activity type is invalid." }, { status: 400 });
      if (!title) return NextResponse.json({ error: "The family activity title is required." }, { status: 400 });
      if ((body.activity === "list_created" || body.activity === "list_item_added") && !listTitle) return NextResponse.json({ error: "The shared list title is required." }, { status: 400 });
      const { data: adults } = await admin.from("members").select("id").eq("household_id", householdId).eq("role", "adult").neq("id", actor.id);
      const excludedMemberId = body.assigneeMemberId ? text(body.assigneeMemberId, 80) : null;
      const recipients = (adults ?? []).map((adult) => adult.id).filter((memberId) => memberId !== excludedMemberId);
      const actorName = actor.display_name ?? "A family member";
      if (body.activity === "task_created") return NextResponse.json(await sendPushToMembers(recipients, "New family task", `${actorName} added a task: ${title}.`, "family-task"));
      if (body.activity === "list_created") return NextResponse.json(await sendPushToMembers(recipients, "New shared list", `${actorName} created the ${listTitle} list.`, "family-list"));
      return NextResponse.json(await sendPushToMembers(recipients, "Shared list updated", `${actorName} added ${title} to ${listTitle}.`, "family-list-item"));
    }

    if (body.event === "mood_changed") {
      const memberId = text(body.memberId, 80);
      const mood = text(body.mood, 20);
      if (!memberId || !mood || !moodLabels[mood]) return NextResponse.json({ error: "The family member and mood are required." }, { status: 400 });
      const { data: subject } = await admin.from("members").select("id, display_name").eq("id", memberId).eq("household_id", householdId).maybeSingle();
      if (!subject) return NextResponse.json({ error: "The family member is not in this household." }, { status: 400 });
      const { data: adults } = await admin.from("members").select("id").eq("household_id", householdId).eq("role", "adult").neq("id", subject.id);
      return NextResponse.json(await sendPushToMembers((adults ?? []).map((adult) => adult.id), "Family mood updated", `${subject.display_name} checked in as ${moodLabels[mood]}.`, "family-mood"));
    }

    return NextResponse.json({ error: "Unsupported notification event." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send notification." }, { status: 500 });
  }
}
