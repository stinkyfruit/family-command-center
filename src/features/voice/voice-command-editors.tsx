"use client";

import { FormEvent, useState } from "react";
import { StyledSelect } from "@/components/home/shared-ui";
import type { ChoreRewardMode, Member, SharedList } from "@/features/home/model";

export type VoiceChoreDraft = { title: string; memberId: string; routine: string; scheduledFor: string };
export type WeekendChoreDraft = { memberId: string; title: string; reward: string };
export type VoiceListDraft = { title: string; listId: string };

export function VoiceChoreEditor({ draft, members, onClose, onSave }: { draft: VoiceChoreDraft; members: Member[]; onClose: () => void; onSave: (draft: VoiceChoreDraft) => Promise<void> }) {
  const [title, setTitle] = useState(draft.title);
  const [memberId, setMemberId] = useState(draft.memberId);
  const [routine, setRoutine] = useState(draft.routine);
  const [scheduledFor, setScheduledFor] = useState(draft.scheduledFor);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); void onSave({ title, memberId, routine, scheduledFor }); }} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-violet-600">VOICE ADD</p><h2 className="text-2xl font-bold">Review chore</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button></div><label className="mt-5 block text-sm font-bold">Chore<input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-violet-500"/></label><label className="mt-4 block text-sm font-bold">Assign to<StyledSelect value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.filter((member) => member.role === "child").map((member) => <option key={member.id} value={String(member.id)}>{member.name}</option>)}</StyledSelect></label><label className="mt-4 block text-sm font-bold">Routine<StyledSelect value={routine} onChange={(event) => setRoutine(event.target.value)}><option>Before school</option><option>After school</option><option>To-do</option></StyledSelect></label><label className="mt-4 block text-sm font-bold">Date<input type="date" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-violet-500"/></label><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Save chore</button></div></form></div>;
}

export function WeekendChoreEditor({ draft, mode, memberName, onClose, onSave }: { draft: WeekendChoreDraft; mode: ChoreRewardMode; memberName: string; onClose: () => void; onSave: (draft: { memberId: string; title: string; reward: number }) => Promise<void> }) {
  const [title, setTitle] = useState(draft.title);
  const [reward, setReward] = useState(draft.reward);
  const unit = mode === "money" ? "cents" : "stars";
  const maximum = mode === "money" ? 1000 : 100;
  async function save(event: FormEvent) {
    event.preventDefault();
    const value = Number(reward);
    if (!title.trim()) return;
    if (!Number.isInteger(value) || value < 0 || value > maximum || (mode === "money" && value % 5 !== 0)) return;
    await onSave({ memberId: draft.memberId, title: title.trim(), reward: value });
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><form onSubmit={save} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-violet-600">WEEKEND CHORE</p><h2 className="text-2xl font-bold">Add for {memberName}</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button></div><label className="mt-5 block text-sm font-bold">Chore<input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-3 text-slate-800 outline-violet-500" placeholder="e.g. Clean up toys" /></label><label className="mt-4 block text-sm font-bold">Reward ({unit})<input required type="number" min="0" max={maximum} step={mode === "money" ? 5 : 1} value={reward} onChange={(event) => setReward(event.target.value)} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-3 text-slate-800 outline-violet-500" />{mode === "money" && <span className="mt-1 block text-xs font-medium text-slate-500">Enter cents, such as 10 for $0.10. Rewards must end in 0 or 5.</span>}</label><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Add chore</button></div></form></div>;
}

export function VoiceListEditor({ draft, lists, onClose, onSave }: { draft: VoiceListDraft; lists: SharedList[]; onClose: () => void; onSave: (draft: VoiceListDraft) => Promise<void> }) {
  const [title, setTitle] = useState(draft.title);
  const [listId, setListId] = useState(draft.listId);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><form onSubmit={(event) => { event.preventDefault(); void onSave({ title, listId }); }} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-violet-600">VOICE ADD</p><h2 className="text-2xl font-bold">Review list item</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button></div><label className="mt-5 block text-sm font-bold">Item<input required autoFocus value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-violet-500"/></label><label className="mt-4 block text-sm font-bold">Add to<StyledSelect value={listId} onChange={(event) => setListId(event.target.value)}>{lists.map((list) => <option key={list.id} value={String(list.id)}>{list.title}</option>)}</StyledSelect></label><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">Save item</button></div></form></div>;
}

