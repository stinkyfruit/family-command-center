"use client";

import { memo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ChoreCreationOptions, ChoreEntry, ChoreRewardMode } from "@/features/home/model";
import { AccountSettings, ChoreSettingsSection, type ChoreSettingsTab } from "@/features/settings/chore-settings";
import { SettingsPageContent, type SettingsPageContentProps } from "@/features/settings/settings-content";
import { SettingsNavigation } from "@/features/settings/settings-navigation";

export type SettingsPageProps = SettingsPageContentProps & {
  choreRewardMode: ChoreRewardMode;
  earnedCentsByMember: Record<string, number>;
  paidOutCentsByMember: Record<string, number>;
  onPayOut: (childMemberId: string | number, amountCents: number) => Promise<{ error?: string }>;
  onResetToday: () => Promise<{ error?: string; deleted?: number }>;
  onClearAll: () => Promise<{ error?: string; deleted?: number }>;
  onAddChore: (memberId: string | number, routine: string, titleOverride?: string, scheduledForOverride?: string | null, rewardOverride?: number, options?: ChoreCreationOptions) => void;
  onDeleteChore: (chore: ChoreEntry) => void;
  onRewardModeChange: (mode: ChoreRewardMode) => void;
  chores: ChoreEntry[];
  onUpdateChore: (chore: ChoreEntry, title: string, rewardValue: number) => Promise<{ error?: string }>;
  onReorderChores: (choreIds: Array<string | number>) => void;
  onEmojiChange?: (chore: ChoreEntry, emoji: string) => void;
};

export const SettingsPage = memo(function SettingsPage({ choreRewardMode, earnedCentsByMember, paidOutCentsByMember, onPayOut, onResetToday, onClearAll, onAddChore, onDeleteChore, onRewardModeChange, chores, onUpdateChore, onReorderChores, onEmojiChange, ...props }: SettingsPageProps) {
  const [settingsUnlocked, setSettingsUnlocked] = useState(!supabase);
  const [choreSettingsTab, setChoreSettingsTab] = useState<ChoreSettingsTab>("rewards");
  const currentMember = props.members.find((member) => props.currentUserId && String(member.userId) === props.currentUserId);

  return <div className="w-full min-w-0 space-y-5">
    {settingsUnlocked && <SettingsNavigation showChores={props.showChoresTab} showAccount={Boolean(supabase)} />}
    <div className="px-5 md:px-9"><SettingsPageContent {...props} onUnlocked={() => setSettingsUnlocked(true)} /></div>
    {settingsUnlocked && <>
      {props.showChoresTab && <ChoreSettingsSection activeTab={choreSettingsTab} onTabChange={setChoreSettingsTab} choreRewardMode={choreRewardMode} earnedCentsByMember={earnedCentsByMember} paidOutCentsByMember={paidOutCentsByMember} onPayOut={onPayOut} onResetToday={onResetToday} onClearAll={onClearAll} onAddChore={onAddChore} onDeleteChore={onDeleteChore} onRewardModeChange={onRewardModeChange} chores={chores} onUpdateChore={onUpdateChore} onReorderChores={onReorderChores} onEmojiChange={onEmojiChange} members={props.members} currentMember={currentMember} />}
      {supabase && <AccountSettings onSignOut={props.onSignOut} />}
    </>}
  </div>;
});
