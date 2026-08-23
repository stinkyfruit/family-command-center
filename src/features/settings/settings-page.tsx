"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChoreEntry, ChoreRewardMode } from "@/features/home/model";
import { AccountSettings, ChoreSettingsSection, type ChoreSettingsTab } from "@/features/settings/chore-settings";
import { SettingsPageContent, type SettingsPageContentProps } from "@/features/settings/settings-content";
import { SettingsNavigation } from "@/features/settings/settings-navigation";

export type SettingsPageProps = SettingsPageContentProps & {
  choreRewardMode: ChoreRewardMode;
  choreRewardTargetCents: number;
  choreRewardTargetStars: number;
  earnedCentsByMember: Record<string, number>;
  paidOutCentsByMember: Record<string, number>;
  onPayOut: (childMemberId: string | number, amountCents: number) => Promise<{ error?: string }>;
  onResetToday: () => Promise<{ error?: string; deleted?: number }>;
  onClearAll: () => Promise<{ error?: string; deleted?: number }>;
  onAddChore: (memberId: string | number, routine: string) => void;
  onDeleteChore: (chore: ChoreEntry) => void;
  onRewardModeChange: (mode: ChoreRewardMode) => void;
  chores: ChoreEntry[];
  onEditReward: (chore: ChoreEntry) => void;
};

export function SettingsPage({ choreRewardMode, choreRewardTargetCents, choreRewardTargetStars, earnedCentsByMember, paidOutCentsByMember, onPayOut, onResetToday, onClearAll, onAddChore, onDeleteChore, onRewardModeChange, chores, onEditReward, ...props }: SettingsPageProps) {
  const [settingsUnlocked, setSettingsUnlocked] = useState(!supabase);
  const [choreSettingsTab, setChoreSettingsTab] = useState<ChoreSettingsTab>("rewards");
  const currentMember = props.members.find((member) => props.currentUserId && String(member.userId) === props.currentUserId);

  return <>
    {settingsUnlocked && <SettingsNavigation showChores={props.showChoresTab} showAccount={Boolean(supabase)} />}
    <SettingsPageContent {...props} onUnlocked={() => setSettingsUnlocked(true)} />
    {settingsUnlocked && <>
      {props.showChoresTab && <ChoreSettingsSection activeTab={choreSettingsTab} onTabChange={setChoreSettingsTab} choreRewardMode={choreRewardMode} choreRewardTargetCents={choreRewardTargetCents} choreRewardTargetStars={choreRewardTargetStars} earnedCentsByMember={earnedCentsByMember} paidOutCentsByMember={paidOutCentsByMember} onPayOut={onPayOut} onResetToday={onResetToday} onClearAll={onClearAll} onAddChore={onAddChore} onDeleteChore={onDeleteChore} onRewardModeChange={onRewardModeChange} chores={chores} onEditReward={onEditReward} members={props.members} currentMember={currentMember} />}
      {supabase && <AccountSettings onSignOut={props.onSignOut} />}
    </>}
  </>;
}
