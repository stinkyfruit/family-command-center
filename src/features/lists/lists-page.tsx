"use client";

import { useState } from "react";
import { AppIcon, useAppNotifications } from "@/components/home/shared-ui";
import type { SharedList, SharedListItem } from "@/features/home/model";
import { supabase } from "@/lib/supabase";
import { listPreferenceKey, type ListKind } from "@/features/lists/model";

export type ListsPageProps = {
  lists: SharedList[];
  expandedListKeys: Record<string, boolean>;
  onToggleListExpanded: (kind: ListKind, listId: string | number) => void;
  onAddList: () => void;
  onAddItem: (listId: string | number) => void;
  onToggleItem: (listId: string | number, itemId: string | number) => void;
  onDeleteItem: (listId: string | number, itemId: string | number) => void;
  onDeleteList: (list: SharedList) => void;
};

export function ListsPage({ lists, expandedListKeys, onToggleListExpanded, onAddList, onAddItem, onToggleItem, onDeleteItem, onDeleteList }: ListsPageProps) {
  const { confirm, prompt } = useAppNotifications();
  const [pin, setPin] = useState("");
  const [privateLists, setPrivateLists] = useState<SharedList[] | null>(null);
  const [message, setMessage] = useState("");

  async function unlock() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("get_private_lists", { p_pin: pin });
    if (error) { setMessage(error.message); return; }
    setPrivateLists(data ?? []);
    setMessage("");
  }

  async function addPrivate() {
    const title = await prompt("What should this private list be called?", "", { title: "Add a private list", confirmLabel: "Add list" });
    if (!title?.trim() || !supabase) return;
    const { error } = await supabase.rpc("add_private_list", { p_pin: pin, p_title: title.trim() });
    if (error) { setMessage(error.message); return; }
    await unlock();
  }

  async function addPrivateItem(listId: string | number) {
    const title = await prompt("What should this private list item say?", "", { title: "Add a private item", confirmLabel: "Add item" });
    if (!title?.trim() || !supabase) return;
    const { error } = await supabase.rpc("add_private_list_item", { p_pin: pin, p_list_id: listId, p_title: title.trim() });
    if (error) { setMessage(error.message); return; }
    await unlock();
  }

  async function deletePrivate(list: SharedList) {
    if (!await confirm(`Delete “${list.title}” and all of its items?`, { title: "Delete private list?", destructive: true }) || !supabase) return;
    const { error } = await supabase.rpc("delete_private_list", { p_pin: pin, p_list_id: list.id });
    if (error) { setMessage(error.message); return; }
    await unlock();
  }

  async function updatePrivateItem(item: SharedListItem, remove = false) {
    if (!supabase) return;
    const { error } = await supabase.rpc("update_private_list_item", { p_pin: pin, p_item_id: item.id, p_completed: remove ? item.done : !item.done, p_delete: remove });
    if (error) { setMessage(error.message); return; }
    await unlock();
  }

  return <section className="mx-auto w-full min-w-0 max-w-[1800px] space-y-8 overflow-x-hidden px-5 pb-24 md:px-9 lg:pb-8"><div className="min-w-0"><div className="mb-5 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-violet-600">SHARED LISTS</p><h2 className="text-3xl font-bold leading-tight md:truncate">Keep the house moving</h2></div><button onClick={onAddList} className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white">+ New list</button></div>{lists.length ? <div className="grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">{lists.map((list, index) => <ListCard key={list.id} list={list} colorIndex={index} expanded={expandedListKeys[listPreferenceKey("shared", list.id)] ?? false} onToggleExpanded={() => onToggleListExpanded("shared", list.id)} onAddItem={onAddItem} onToggleItem={onToggleItem} onDeleteItem={onDeleteItem} onDeleteList={onDeleteList} />)}</div> : <p className="text-slate-500">No family lists yet.</p>}</div><div className="min-w-0 overflow-hidden rounded-[2rem] border border-violet-200 bg-violet-50 p-6 dark:border-violet-400/25 dark:bg-violet-500/10"><p className="text-sm font-bold text-violet-600">PRIVATE LISTS</p><h2 className="mt-1 text-2xl font-bold">🔒 Surprises stay private</h2>{privateLists === null ? <form onSubmit={(e) => { e.preventDefault(); void unlock(); }} className="mt-4 flex max-w-sm gap-2"><input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" type="password" placeholder="Enter family PIN" className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-slate-800"/><button className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">Unlock</button></form> : <><div className="mt-4 grid min-w-0 gap-5 md:grid-cols-2 xl:grid-cols-3">{privateLists.map((list, index) => <PrivateListCard key={list.id} list={list} colorIndex={index} expanded={expandedListKeys[listPreferenceKey("private", list.id)] ?? false} onToggleExpanded={() => onToggleListExpanded("private", list.id)} onAddItem={addPrivateItem} onDelete={deletePrivate} onToggleItem={(item) => void updatePrivateItem(item)} onDeleteItem={(item) => { void confirm(`Delete “${item.title}”?`, { title: "Delete private item?", destructive: true }).then((approved) => { if (approved) void updatePrivateItem(item, true); }); }} />)}</div><div className="mt-4 flex flex-wrap gap-3"><button onClick={() => void addPrivate()} className="rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">+ New private list</button><button onClick={() => { setPrivateLists(null); setPin(""); }} className="rounded-xl px-4 py-2 font-bold text-violet-700">Lock</button></div></>}{message && <p className="mt-3 text-sm font-bold text-rose-600">{message}</p>}</div></section>;
}

function PrivateListCard({ list, colorIndex, expanded, onToggleExpanded, onAddItem, onDelete, onToggleItem, onDeleteItem }: { list: SharedList; colorIndex: number; expanded: boolean; onToggleExpanded: () => void; onAddItem: (id: string | number) => void; onDelete: (list: SharedList) => void; onToggleItem: (item: SharedListItem) => void; onDeleteItem: (item: SharedListItem) => void }) {
  const colors = ["bg-rose-100 dark:bg-rose-500/45", "bg-sky-100 dark:bg-sky-500/45", "bg-amber-100 dark:bg-amber-400/45", "bg-emerald-100 dark:bg-emerald-500/45", "bg-violet-100 dark:bg-violet-500/45", "bg-orange-100 dark:bg-orange-500/45"];
  const contentId = `private-list-content-${String(list.id)}`;
  return <article className={`self-start min-w-0 overflow-hidden rounded-[2rem] p-6 text-slate-800 shadow-sm ring-1 ring-white/70 dark:text-white dark:ring-white/10 ${colors[colorIndex % colors.length]}`}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xl font-bold"><button type="button" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls={contentId} className="flex min-w-0 max-w-full items-center gap-2 text-left"><span className="truncate">{list.title}</span><AppIcon name={expanded ? "chevronDown" : "chevronRight"} className="size-4 shrink-0" /></button></h3></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => onAddItem(list.id)} className="grid size-9 place-items-center rounded-xl bg-white/80 text-lg font-bold text-violet-700">+</button><button type="button" onClick={() => onDelete(list)} title={`Delete ${list.title}`} className="grid size-9 place-items-center rounded-xl bg-white/80 text-rose-600"><AppIcon name="trash" className="size-4"/></button></div></div>{expanded && <div id={contentId} className="mt-5 min-w-0 space-y-2">{list.items.map((item) => <div key={item.id} className="flex min-w-0 w-full items-center gap-3 overflow-hidden rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700"><button type="button" onClick={() => onToggleItem(item)} aria-label={`Complete ${item.title}`} className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 text-transparent"}`}>✓</button><span className={`min-w-0 flex-1 truncate ${item.done ? "line-through opacity-60" : ""}`}>{item.title}</span><button type="button" onClick={() => onDeleteItem(item)} title={`Delete ${item.title}`} aria-label={`Delete ${item.title}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-100"><AppIcon name="trash" className="size-4"/></button></div>)}{list.items.length === 0 && <p className="text-sm text-slate-600">Tap + to add an item.</p>}</div>}</article>;
}

function ListCard({ list, colorIndex, expanded, onToggleExpanded, onAddItem, onToggleItem, onDeleteItem, onDeleteList }: { list: SharedList; colorIndex: number; expanded: boolean; onToggleExpanded: () => void; onAddItem: (listId: string | number) => void; onToggleItem: (listId: string | number, itemId: string | number) => void; onDeleteItem: (listId: string | number, itemId: string | number) => void; onDeleteList: (list: SharedList) => void }) {
  const colors = ["bg-rose-100 dark:bg-rose-500/45", "bg-sky-100 dark:bg-sky-500/45", "bg-amber-100 dark:bg-amber-400/45", "bg-emerald-100 dark:bg-emerald-500/45", "bg-violet-100 dark:bg-violet-500/45", "bg-orange-100 dark:bg-orange-500/45"];
  const contentId = `shared-list-content-${String(list.id)}`;
  return <article className={`self-start min-w-0 overflow-hidden rounded-[2rem] p-6 shadow-sm ring-1 ring-white/70 dark:ring-white/10 ${colors[colorIndex % colors.length]}`}><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-bold"><button type="button" onClick={onToggleExpanded} aria-expanded={expanded} aria-controls={contentId} className="flex min-w-0 max-w-full items-center gap-2 text-left"><span className="truncate">{list.title}</span><AppIcon name={expanded ? "chevronDown" : "chevronRight"} className="size-4 shrink-0" /></button></h2></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => onAddItem(list.id)} className="grid size-9 place-items-center rounded-xl bg-white/80 text-lg font-bold text-violet-700 hover:bg-white">+</button><button type="button" onClick={() => onDeleteList(list)} title={`Delete ${list.title}`} aria-label={`Delete ${list.title}`} className="grid size-9 place-items-center rounded-xl bg-white/80 text-rose-600 hover:bg-rose-50"><AppIcon name="trash" className="size-4" /></button></div></div>{expanded && <div id={contentId} className="mt-5 min-w-0 space-y-2">{list.items.map((item) => <div key={item.id} className="flex min-w-0 w-full items-center gap-3 overflow-hidden rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700"><button type="button" onClick={() => onToggleItem(list.id, item.id)} aria-label={`Complete ${item.title}`} className={`grid size-5 shrink-0 place-items-center rounded-md border-2 ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-400 text-transparent"}`}>✓</button><span className={`min-w-0 flex-1 truncate ${item.done ? "line-through text-slate-400" : ""}`}>{item.title}</span><button type="button" onClick={() => onDeleteItem(list.id, item.id)} title={`Delete ${item.title}`} aria-label={`Delete ${item.title}`} className="grid size-8 place-items-center rounded-lg text-rose-600 hover:bg-rose-100"><AppIcon name="trash" className="size-4"/></button></div>)}{list.items.length === 0 && <p className="text-sm text-slate-500">Tap + to add an item.</p>}</div>}</article>;
}
