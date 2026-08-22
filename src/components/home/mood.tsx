import { useEffect, useState } from "react";
import { Lottie } from "lottie-react";
import type { Member, MoodCheckin, MoodKey } from "@/features/home/model";
import { moodOption, moodOptions } from "@/features/home/model";
import { memberCalendarColor } from "@/components/home/calendar";
import { AppIcon, StyledSelect } from "@/components/home/shared-ui";

export function MoodAnimation({ mood, className = "size-full" }: { mood: MoodKey; className?: string }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const option = moodOption(mood);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduceMotion ? <span className="grid size-full place-items-center text-3xl" aria-label={option.label}>{option.emoji}</span> : <Lottie src={option.animation} autoplay loop className={className} aria-label={option.label} />;
}

export function FamilyMoodCard({
  members,
  checkins,
  selectedMemberId,
  selectedMood,
  saving,
  message,
  onMemberChange,
  onMoodChange,
  onSave,
}: {
  members: Member[];
  checkins: MoodCheckin[];
  selectedMemberId: string;
  selectedMood: MoodKey;
  saving: boolean;
  message: string;
  onMemberChange: (memberId: string) => void;
  onMoodChange: (mood: MoodKey) => void;
  onSave: () => Promise<boolean>;
}) {
  const [showMoodModal, setShowMoodModal] = useState(false);
  const selectedMember = members.find((member) => String(member.id) === selectedMemberId);
  const selectedMoodOption = moodOption(selectedMood);

  async function handleSave() {
    if (await onSave()) setShowMoodModal(false);
  }

  return <article className="min-w-0 overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-violet-100 via-fuchsia-50 to-sky-100 p-4 text-slate-900 shadow-sm ring-1 ring-violet-100 dark:from-violet-500/20 dark:via-fuchsia-500/10 dark:to-sky-500/10 dark:text-slate-100 dark:ring-white/10">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-black tracking-wide text-violet-700 dark:text-violet-200">FAMILY CHECK-IN</p><h2 className="mt-1 text-lg font-black">How&apos;s everyone feeling?</h2><p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">A little pulse for today.</p></div>
      <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700 dark:bg-white/10 dark:text-violet-100">Today</span>
    </div>
    {members.length === 0 ? <p className="mt-5 rounded-2xl bg-white/60 p-4 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">Add family members to start checking in.</p> : <>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {members.map((member) => {
          const checkin = checkins.find((item) => String(item.memberId) === String(member.id));
          const mood = checkin ? moodOption(checkin.mood) : null;
          const memberColor = memberCalendarColor(member, members.indexOf(member));
          return <div key={member.id} style={mood ? { backgroundColor: memberColor } : undefined} className={`flex min-w-0 items-center gap-2 rounded-2xl p-2 ${mood ? "shadow-sm" : "bg-white/65 dark:bg-white/10"}`}>
            <div className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl ${mood ? "" : "border border-dashed border-violet-300/80 text-xl text-violet-400 dark:border-violet-300/30"}`}>
              {mood ? <MoodAnimation mood={mood.key} /> : <span aria-hidden="true">?</span>}
            </div>
            <div className="min-w-0"><p className="truncate text-xs font-black">{member.name}</p><p className={`truncate text-[11px] font-semibold ${mood ? "text-white/90" : "text-slate-500 dark:text-slate-300"}`}>{mood?.label ?? "Not checked in"}</p></div>
          </div>;
        })}
      </div>
      <button type="button" onClick={() => setShowMoodModal(true)} aria-haspopup="dialog" className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl bg-white/75 px-4 py-3 text-left shadow-sm ring-1 ring-violet-200 transition hover:bg-white dark:bg-white/10 dark:ring-white/10">
        <span className="min-w-0"><span className="block text-sm font-black text-violet-900 dark:text-violet-100">How are you feeling?</span><span className="mt-0.5 block truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{selectedMember?.name ?? "Choose a person"} · {selectedMoodOption.emoji} {selectedMoodOption.label}</span></span>
        <span className="shrink-0 text-xs font-black text-violet-700 dark:text-violet-200">Check in →</span>
      </button>
      {showMoodModal && <div className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="mood-dialog-title" className="w-full max-w-md rounded-[2rem] bg-white p-5 text-slate-900 shadow-2xl dark:bg-[#242435] dark:text-slate-100">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black tracking-wide text-violet-600 dark:text-violet-200">FAMILY CHECK-IN</p><h2 id="mood-dialog-title" className="mt-1 text-2xl font-black">How are you feeling?</h2><p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-300">Choose who you are and check in for today.</p></div><button type="button" onClick={() => setShowMoodModal(false)} aria-label="Close mood check-in" className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button></div>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">Who are you checking in for?
              <StyledSelect value={selectedMemberId} onChange={(event) => onMemberChange(event.target.value)}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </StyledSelect>
            </label>
            <div><p id="mood-options-label" className="text-xs font-black uppercase tracking-wide text-violet-800 dark:text-violet-200">How are you feeling?</p><div role="group" aria-labelledby="mood-options-label" className="mt-2 grid grid-cols-5 gap-2">
              {moodOptions.map((mood) => <button key={mood.key} type="button" aria-pressed={selectedMood === mood.key} onClick={() => onMoodChange(mood.key)} className={`grid min-w-0 place-items-center gap-1 rounded-2xl px-1 py-3 text-center transition ${selectedMood === mood.key ? `${mood.color} ring-2` : "bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15"}`}><span className="text-2xl leading-none">{mood.emoji}</span><span className="truncate text-[11px] font-black">{mood.label}</span></button>)}
            </div></div>
            {message && <p role="status" className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">{message}</p>}
            <div className="flex items-center justify-end gap-2"><button type="button" onClick={() => setShowMoodModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button type="button" onClick={() => void handleSave()} disabled={!selectedMember || saving} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">{saving ? "Saving…" : "Save check-in"}</button></div>
          </div>
        </section>
      </div>}
    </>}
  </article>;
}
