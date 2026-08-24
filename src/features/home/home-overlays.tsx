"use client";

import type { FormEvent } from "react";
import type { Event, ChoreRewardMode, Member, SharedList, Todo } from "@/features/home/model";
import { EventDetails, EventEditor } from "@/components/home/calendar";
import { TaskEditor } from "@/components/home/task-components";
import { ChoreCelebration } from "@/features/chores/chores-page";
import { VoiceChoreEditor, VoiceListEditor, WeekendChoreEditor, type VoiceChoreDraft, type VoiceListDraft, type WeekendChoreDraft } from "@/features/voice/voice-command-editors";

type WeekendChoreResult = { memberId: string; title: string; reward: number };

type HomeOverlaysProps = {
  selectedEvent: Event | null;
  members: Member[];
  onCloseSelectedEvent: () => void;
  onEditSelectedEvent: () => void;
  editingEvent: Event | null;
  onCloseEditingEvent: () => void;
  onSaveEvent: (event: Event) => void;
  onApplySeries: (event: Event, memberIds: string[]) => void;
  onDeleteEvent: (event: Event) => void;
  showTodoForm: boolean;
  todoTitle: string;
  todoDueDate: string;
  todoAssigneeMemberId: string;
  editingTodo: Todo | null;
  onTodoTitleChange: (value: string) => void;
  onTodoDueDateChange: (value: string) => void;
  onTodoAssigneeChange: (value: string) => void;
  onCloseTodoForm: () => void;
  onSaveTodo: (event: FormEvent) => void;
  voiceChoreDraft: VoiceChoreDraft | null;
  onCloseVoiceChore: () => void;
  onSaveVoiceChore: (draft: VoiceChoreDraft) => Promise<void>;
  weekendChoreDraft: WeekendChoreDraft | null;
  choreRewardMode: ChoreRewardMode;
  onCloseWeekendChore: () => void;
  onSaveWeekendChore: (draft: WeekendChoreResult) => Promise<void>;
  voiceListDraft: VoiceListDraft | null;
  sharedLists: SharedList[];
  onCloseVoiceList: () => void;
  onSaveVoiceList: (draft: VoiceListDraft) => Promise<void>;
  celebratingTask: boolean;
  celebratingBirthday: boolean;
};

export function HomeOverlays({
  selectedEvent,
  members,
  onCloseSelectedEvent,
  onEditSelectedEvent,
  editingEvent,
  onCloseEditingEvent,
  onSaveEvent,
  onApplySeries,
  onDeleteEvent,
  showTodoForm,
  todoTitle,
  todoDueDate,
  todoAssigneeMemberId,
  editingTodo,
  onTodoTitleChange,
  onTodoDueDateChange,
  onTodoAssigneeChange,
  onCloseTodoForm,
  onSaveTodo,
  voiceChoreDraft,
  onCloseVoiceChore,
  onSaveVoiceChore,
  weekendChoreDraft,
  choreRewardMode,
  onCloseWeekendChore,
  onSaveWeekendChore,
  voiceListDraft,
  sharedLists,
  onCloseVoiceList,
  onSaveVoiceList,
  celebratingTask,
  celebratingBirthday,
}: HomeOverlaysProps) {
  return <>
    {selectedEvent && <EventDetails event={selectedEvent} members={members} onClose={onCloseSelectedEvent} onEdit={onEditSelectedEvent} />}
    {editingEvent && <EventEditor key={editingEvent.id} event={editingEvent} members={members} onClose={onCloseEditingEvent} onSave={onSaveEvent} onApplySeries={onApplySeries} onDelete={onDeleteEvent} />}
    {showTodoForm && <TaskEditor title={todoTitle} dueDate={todoDueDate} assigneeMemberId={todoAssigneeMemberId} members={members} editing={Boolean(editingTodo)} onTitleChange={onTodoTitleChange} onDueDateChange={onTodoDueDateChange} onAssigneeChange={onTodoAssigneeChange} onClose={onCloseTodoForm} onSave={onSaveTodo} />}
    {voiceChoreDraft && <VoiceChoreEditor draft={voiceChoreDraft} members={members} onClose={onCloseVoiceChore} onSave={onSaveVoiceChore} />}
    {weekendChoreDraft && <WeekendChoreEditor draft={weekendChoreDraft} mode={choreRewardMode} memberName={members.find((member) => String(member.id) === weekendChoreDraft.memberId)?.name ?? "Child"} onClose={onCloseWeekendChore} onSave={onSaveWeekendChore} />}
    {voiceListDraft && <VoiceListEditor draft={voiceListDraft} lists={sharedLists} onClose={onCloseVoiceList} onSave={onSaveVoiceList} />}
    {celebratingTask && <ChoreCelebration animationSrc="/animations/general/completions/Celebrations%20Begin.json" />}
    {celebratingBirthday && <ChoreCelebration animationSrc="/animations/holidays/birthday/birthday.json" />}
  </>;
}
