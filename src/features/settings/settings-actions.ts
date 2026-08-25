import type { Dispatch, SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { ChoreEntry, ChoreRewardMode, Event, Member, Todo } from "@/features/home/model";
import { isHexColor, memberColorOptions } from "@/features/home/model";

type NotificationOptions = { title?: string; destructive?: boolean };
type PromptOptions = { title?: string; confirmLabel?: string };

export type SettingsActionDependencies = {
  householdId: string | null;
  user: User | null;
  members: Member[];
  events: Event[];
  chores: ChoreEntry[];
  choreRewardMode: ChoreRewardMode;
  choreEarnedCentsByMember: Record<string, number>;
  chorePaidOutCentsByMember: Record<string, number>;
  showChoresTab: boolean;
  showWishlistTab: boolean;
  activeTab: string;
  notify: (message: string, tone?: "info" | "success" | "error" | "warning") => void;
  confirm: (message: string, options?: NotificationOptions) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, options?: PromptOptions) => Promise<string | null>;
  setMembers: Dispatch<SetStateAction<Member[]>>;
  setEvents: Dispatch<SetStateAction<Event[]>>;
  setTodos: Dispatch<SetStateAction<Todo[]>>;
  setChores: Dispatch<SetStateAction<ChoreEntry[]>>;
  setEventMemberIds: Dispatch<SetStateAction<string[]>>;
  setSelectedCalendarMemberIds: Dispatch<SetStateAction<string[]>>;
  setChoreRewardMode: Dispatch<SetStateAction<ChoreRewardMode>>;
  setChoreEarnedCentsByMember: Dispatch<SetStateAction<Record<string, number>>>;
  setChorePaidOutCentsByMember: Dispatch<SetStateAction<Record<string, number>>>;
  setShowChoresTab: Dispatch<SetStateAction<boolean>>;
  setShowWishlistTab: Dispatch<SetStateAction<boolean>>;
  setActiveTab: (tab: "home") => void;
  setHouseholdId: Dispatch<SetStateAction<string | null>>;
  setHouseholdName: Dispatch<SetStateAction<string>>;
};

export function createSettingsActions(dependencies: SettingsActionDependencies) {
  const {
    householdId,
    user,
    members,
    events,
    chores,
    choreRewardMode,
    choreEarnedCentsByMember,
    chorePaidOutCentsByMember,
    showChoresTab,
    showWishlistTab,
    activeTab,
    notify,
    confirm,
    prompt,
    setMembers,
    setEvents,
    setTodos,
    setChores,
    setEventMemberIds,
    setSelectedCalendarMemberIds,
    setChoreRewardMode,
    setChoreEarnedCentsByMember,
    setChorePaidOutCentsByMember,
    setShowChoresTab,
    setShowWishlistTab,
    setActiveTab,
    setHouseholdId,
    setHouseholdName,
  } = dependencies;

  async function addMember(name: string, role: Member["role"]): Promise<{ error?: string; member?: Member }> {
    const trimmedName = name.trim();
    if (!trimmedName) return { error: "Enter a name." };
    if (!householdId) return { error: "Open your family home before adding someone." };
    const color = memberColorOptions[members.length % memberColorOptions.length];
    if (supabase) {
      const { data, error } = await supabase.from("members").insert({ household_id: householdId, display_name: trimmedName, role, color }).select("id, user_id, display_name, role, color").single();
      if (error) return { error: error.message };
      if (data) {
        const member = { id: data.id, userId: data.user_id, name: data.display_name, role: data.role, color: data.color };
        setMembers((items) => [...items, member]);
        return { member };
      }
    } else {
      const member = { id: Date.now().toString(), name: trimmedName, role, color };
      setMembers((items) => [...items, member]);
      return { member };
    }
    return {};
  }

  async function updateCurrentMemberName(name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return { error: "Enter a nickname." };
    if (!householdId || !user) return { error: "Open your family home before changing your nickname." };
    const currentMember = members.find((member) => String(member.userId) === user.id);
    if (!currentMember) return { error: "Your family member profile could not be found." };
    if (supabase) {
      const { error } = await supabase.from("members").update({ display_name: trimmedName }).eq("id", currentMember.id).eq("household_id", householdId).eq("user_id", user.id);
      if (error) return { error: error.message };
    }
    setMembers((items) => items.map((member) => member.id === currentMember.id ? { ...member, name: trimmedName } : member));
    return {};
  }

  async function removeMember(member: Member) {
    if (!householdId) return { error: "Open your family home before removing someone." };
    if (member.userId && member.userId === user?.id) return { error: "You cannot remove the account you are currently using." };
    const memberId = String(member.id);
    const affectedEvents = events.filter((event) => event.memberIds?.some((id) => String(id) === memberId));
    const nextEvents = events.map((event) => affectedEvents.some((affected) => affected.id === event.id)
      ? { ...event, memberIds: event.memberIds?.filter((id) => String(id) !== memberId) }
      : event);

    if (supabase) {
      const [{ data: assignmentRows, error: assignmentLoadError }, { data: seriesRows, error: seriesLoadError }] = await Promise.all([
        supabase.from("calendar_event_member_assignments").select("source, external_id, member_ids").eq("household_id", householdId),
        supabase.from("calendar_series_member_assignments").select("source, series_external_id, member_ids").eq("household_id", householdId),
      ]);
      if (assignmentLoadError) return { error: `Could not load event assignments: ${assignmentLoadError.message}` };
      if (seriesLoadError) return { error: `Could not load recurring assignments: ${seriesLoadError.message}` };

      const eventUpdates = affectedEvents
        .filter((event) => !event.generatedHoliday)
        .map((event) => supabase!.from("events").update({ member_ids: event.memberIds?.filter((id) => String(id) !== memberId) ?? [] }).eq("id", event.id).eq("household_id", householdId));
      const assignmentUpdates = (assignmentRows ?? [])
        .filter((assignment) => assignment.member_ids.some((id: string) => String(id) === memberId))
        .map((assignment) => supabase!.from("calendar_event_member_assignments").update({ member_ids: assignment.member_ids.filter((id: string) => String(id) !== memberId) }).eq("household_id", householdId).eq("source", assignment.source).eq("external_id", assignment.external_id));
      const seriesUpdates = (seriesRows ?? [])
        .filter((assignment) => assignment.member_ids.some((id: string) => String(id) === memberId))
        .map((assignment) => supabase!.from("calendar_series_member_assignments").update({ member_ids: assignment.member_ids.filter((id: string) => String(id) !== memberId) }).eq("household_id", householdId).eq("source", assignment.source).eq("series_external_id", assignment.series_external_id));
      const updateResults = await Promise.all([...eventUpdates, ...assignmentUpdates, ...seriesUpdates]);
      const updateError = updateResults.find((result) => result.error)?.error;
      if (updateError) return { error: `Could not clear this person from calendar assignments: ${updateError.message}` };

      const { error: wishlistError } = await supabase
        .from("christmas_wishlist_items")
        .delete()
        .eq("household_id", householdId)
        .eq("member_id", member.id);
      if (wishlistError) return { error: `Could not remove ${member.name}'s wish list: ${wishlistError.message}` };

      const { error } = await supabase.from("members").delete().eq("id", member.id).eq("household_id", householdId);
      if (error) return { error: `Could not remove ${member.name}: ${error.message}` };
    }

    setMembers((items) => items.filter((item) => String(item.id) !== memberId));
    setEvents(nextEvents);
    setEventMemberIds((ids) => ids.filter((id) => String(id) !== memberId));
    setSelectedCalendarMemberIds((ids) => ids.filter((id) => String(id) !== memberId));
    setTodos((items) => items.map((todo) => String(todo.assigneeMemberId) === memberId ? { ...todo, assigneeMemberId: null } : todo));
    setChores((items) => items.map((chore) => String(chore.assigneeMemberId) === memberId ? { ...chore, assigneeMemberId: null } : chore));
    window.dispatchEvent(new CustomEvent("family-member-removed", { detail: memberId }));
    return {};
  }

  async function updateChore(chore: ChoreEntry, title: string, rewardValue: number): Promise<{ error?: string }> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return { error: "Enter a chore name." };
    const maximum = choreRewardMode === "money" ? 1000 : 100;
    if (!Number.isInteger(rewardValue) || rewardValue < 0 || rewardValue > maximum) return { error: `Enter a whole number from 0 to ${maximum}.` };
    if (choreRewardMode === "money" && rewardValue % 5 !== 0) return { error: "Money rewards must end in 0 or 5 cents, such as 10 or 15." };
    const previous = chore;
    const nextValues = choreRewardMode === "money" ? { title: trimmedTitle, reward_cents: rewardValue } : { title: trimmedTitle, reward_stars: rewardValue };
    const nextChore = choreRewardMode === "money" ? { ...chore, title: trimmedTitle, rewardCents: rewardValue } : { ...chore, title: trimmedTitle, rewardStars: rewardValue };
    setChores((items) => items.map((item) => item.id === chore.id ? nextChore : item));
    if (supabase && householdId) {
      const { error } = await supabase.from("chores").update(nextValues).eq("id", chore.id).eq("household_id", householdId);
      if (error) {
        setChores((items) => items.map((item) => item.id === chore.id ? previous : item));
        return { error: `Could not update this chore: ${error.message}` };
      }
    }
    notify("Chore updated.", "success");
    return {};
  }

  async function updateChoreEmoji(chore: ChoreEntry, emoji: string) {
    if (!emoji || emoji === chore.emoji) return;
    setChores((items) => items.map((item) => item.id === chore.id ? { ...item, emoji } : item));
    if (supabase && householdId) {
      const { error } = await supabase.from("chores").update({ emoji }).eq("id", chore.id).eq("household_id", householdId);
      if (error) {
        setChores((items) => items.map((item) => item.id === chore.id ? chore : item));
        notify(`Could not update this chore icon: ${error.message}`);
      }
    }
  }

  async function updateChoreRewardMode(mode: ChoreRewardMode) {
    const previous = choreRewardMode;
    setChoreRewardMode(mode);
    if (!supabase || !householdId) return;
    const { error } = await supabase.from("households").update({ chore_reward_mode: mode }).eq("id", householdId);
    if (error) {
      setChoreRewardMode(previous);
      notify(`Could not switch the incentive pool: ${error.message}`);
    }
  }

  async function recordChorePayout(childMemberId: string | number, amountCents: number): Promise<{ error?: string }> {
    const childKey = String(childMemberId);
    const earnedCents = choreEarnedCentsByMember[childKey] ?? 0;
    const paidOutCents = chorePaidOutCentsByMember[childKey] ?? 0;
    if (amountCents <= 0 || amountCents % 5 !== 0) return { error: "Payouts must be a positive amount ending in 0 or 5 cents." };
    if (amountCents > earnedCents - paidOutCents) return { error: "The payout cannot be greater than the child’s available balance." };
    if (!supabase || !householdId) {
      setChorePaidOutCentsByMember((items) => ({ ...items, [childKey]: (items[childKey] ?? 0) + amountCents }));
      return {};
    }
    const { error } = await supabase.from("chore_payouts").insert({ household_id: householdId, child_member_id: childMemberId, amount_cents: amountCents });
    if (error) return { error: error.message };
    setChorePaidOutCentsByMember((items) => ({ ...items, [childKey]: (items[childKey] ?? 0) + amountCents }));
    return {};
  }

  async function resetTodayChoreCompletions(): Promise<{ error?: string; deleted?: number }> {
    let deleted = chores.filter((chore) => chore.isDaily && Boolean(chore.completionId)).length;
    if (supabase && householdId) {
      const { data, error } = await supabase.rpc("reset_today_chore_completions", { target_household_id: householdId });
      if (error) return { error: error.message };
      deleted = typeof data === "number" ? data : deleted;
    }

    const todayEarnedByMember: Record<string, number> = {};
    for (const chore of chores) {
      if (chore.isDaily && chore.completionId && chore.assigneeMemberId !== null) {
        const childKey = String(chore.assigneeMemberId);
        todayEarnedByMember[childKey] = (todayEarnedByMember[childKey] ?? 0) + (chore.completedRewardCents ?? chore.rewardCents);
      }
    }
    setChores((items) => items.map((chore) => chore.isDaily ? { ...chore, completionId: undefined, completedRewardCents: undefined, completedRewardStars: undefined } : chore));
    setChoreEarnedCentsByMember((items) => Object.fromEntries(Object.entries(items).map(([memberId, amount]) => [memberId, Math.max(0, amount - (todayEarnedByMember[memberId] ?? 0))])));
    return { deleted };
  }

  async function clearAllChoreIncentiveTotals(): Promise<{ error?: string; deleted?: number }> {
    if (supabase && householdId) {
      const { data, error } = await supabase.rpc("clear_all_chore_incentive_totals", { target_household_id: householdId });
      if (error) return { error: error.message };
      setChores((items) => items.map((chore) => chore.isDaily || !String(chore.completionId ?? "").startsWith("legacy-completed-") ? { ...chore, completionId: undefined, completedRewardCents: undefined, completedRewardStars: undefined } : chore));
      setChoreEarnedCentsByMember({});
      setChorePaidOutCentsByMember({});
      return { deleted: typeof data === "number" ? data : undefined };
    }
    setChores((items) => items.map((chore) => chore.isDaily || !String(chore.completionId ?? "").startsWith("legacy-completed-") ? { ...chore, completionId: undefined, completedRewardCents: undefined, completedRewardStars: undefined } : chore));
    setChoreEarnedCentsByMember({});
    setChorePaidOutCentsByMember({});
    return {};
  }

  async function deleteChore(chore: ChoreEntry) {
    if (!await confirm(`Delete “${chore.title}”?`, { title: "Delete chore?", destructive: true })) return;
    setChores((items) => items.filter((item) => item.id !== chore.id));
    if (supabase) {
      const { error } = await supabase.from("chores").delete().eq("id", chore.id);
      if (error) { setChores((items) => [...items, chore]); notify(`Could not delete this chore: ${error.message}`); }
    }
  }

  async function updateTabVisibility(tab: "chores" | "wishlist", visible: boolean) {
    const previous = tab === "chores" ? showChoresTab : showWishlistTab;
    if (previous === visible) return;
    if (tab === "chores") setShowChoresTab(visible);
    else setShowWishlistTab(visible);
    if (!visible && activeTab === tab) setActiveTab("home");
    if (!supabase || !householdId) return;

    const column = tab === "chores" ? "show_chores_tab" : "show_wishlist_tab";
    const { error } = await supabase.from("households").update({ [column]: visible }).eq("id", householdId);
    if (error) {
      if (tab === "chores") setShowChoresTab(previous);
      else setShowWishlistTab(previous);
      notify(`Could not update the ${tab} tab: ${error.message}`);
    }
  }

  async function updateMemberColor(memberId: string | number, color: string) {
    if (!isHexColor(color)) return;
    const previousColor = members.find((member) => String(member.id) === String(memberId))?.color;
    setMembers((items) => items.map((member) => String(member.id) === String(memberId) ? { ...member, color } : member));
    if (!supabase || !householdId) return;
    const { error } = await supabase.from("members").update({ color }).eq("id", memberId).eq("household_id", householdId);
    if (error) {
      setMembers((items) => items.map((member) => String(member.id) === String(memberId) ? { ...member, color: previousColor } : member));
      notify(`Could not save this color: ${error.message}`);
    }
  }

  async function createHousehold() {
    if (!supabase || !user) return;
    const name = await prompt("What should we call your household?", "The Vulpetti Family", { title: "Create your family home", confirmLabel: "Create home" });
    if (!name?.trim()) return;
    const { error } = await supabase.from("households").insert({ name: name.trim(), created_by: user.id });
    if (error) { notify(error.message); return; }
    const { data: membership, error: membershipError } = await supabase
      .from("members")
      .select("household_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (membershipError || !membership) {
      notify("Your household was created, but could not be loaded. Refresh the page once.");
      return;
    }
    setHouseholdId(membership.household_id);
    setHouseholdName(name.trim());
  }

  async function inviteAdult(email: string, displayName: string) {
    if (!supabase || !user || !householdId) return { error: "Open your family home before inviting someone." };
    const { data, error } = await supabase.from("household_invites").insert({ household_id: householdId, created_by: user.id, email: email.trim().toLowerCase(), display_name: displayName.trim() || null }).select("token").single();
    if (error || !data) return { error: error?.message ?? "Could not create the invitation." };
    const link = `${window.location.origin}${window.location.pathname}?invite=${data.token}`;
    try { await navigator.clipboard.writeText(link); } catch { /* The visible copy field is a fallback. */ }
    return { link };
  }

  async function signOut() {
    if (!supabase) return {};
    const { error } = await supabase.auth.signOut();
    return error ? { error: error.message } : {};
  }

  return { addMember, updateCurrentMemberName, removeMember, updateChore, updateChoreEmoji, updateChoreRewardMode, recordChorePayout, resetTodayChoreCompletions, clearAllChoreIncentiveTotals, deleteChore, updateTabVisibility, updateMemberColor, createHousehold, inviteAdult, signOut };
}
