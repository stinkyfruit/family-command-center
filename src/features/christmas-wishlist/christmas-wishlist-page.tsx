"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lottie } from "lottie-react";
import { supabase } from "@/lib/supabase";
import { AppIcon, StyledSelect } from "@/components/home/shared-ui";
import { christmasAnimations } from "@/generated/animation-manifest";

type Kid = { id: string; name: string; color: string; emoji: string };
type WishItem = { id: string; title: string; note: string; category: string; priority: boolean; createdAt: string };
type WishlistByKid = Record<string, WishItem[]>;
export type WishlistVoiceDraft = { id: string; title: string; memberId: string | null };

const categories = ["Play", "Create", "Learn", "Cozy", "Surprise"] as const;
const christmasTreeAnimation = christmasAnimations.find((src) => src.includes("Christmas%20Tree")) ?? "/animations/holidays/christmas/Christmas%20Tree%20Animation.json";
const gingerbreadAnimation = christmasAnimations.find((src) => src.includes("Ginger%20bread")) ?? "/animations/holidays/christmas/Ginger%20bread%20socks%20Christmas.json";
const snowmanAnimation = christmasAnimations.find((src) => src.includes("snowman")) ?? "/animations/holidays/christmas/Happy%20snowman%20jumping%20and%20waving%20his%20hand.json";
const santaSleighAnimation = christmasAnimations.find((src) => src.includes("santa%20sleigh")) ?? "/animations/holidays/christmas/santa%20sleigh.json";

export default function ChristmasWishlistPage({ voiceDraft = null }: { voiceDraft?: WishlistVoiceDraft | null } = {}) {
  const [kids, setKids] = useState<Kid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [wishlists, setWishlists] = useState<WishlistByKid>({});
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);
  const [newWish, setNewWish] = useState("");
  const [newNote, setNewNote] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Play");
  const [showForm, setShowForm] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [backgroundSleighVisible, setBackgroundSleighVisible] = useState(false);

  const selectedKid = kids.find((kid) => kid.id === selectedKidId) ?? kids[0];
  const selectedWishes = useMemo(() => wishlists[selectedKid?.id ?? ""] ?? [], [selectedKid?.id, wishlists]);
  const totalWishes = Object.values(wishlists).reduce((total, list) => total + list.length, 0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!voiceDraft) return;
    const targetKid = kids.find((kid) => kid.id === voiceDraft.memberId);
    if (targetKid) setSelectedKidId(targetKid.id);
    setNewWish(voiceDraft.title);
    setNewNote("");
    setShowForm(true);
  }, [kids, voiceDraft]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    let cancelled = false;

    async function loadFamilyWishlist() {
      try {
        if (!supabase) return;
        const { data: userResult } = await supabase.auth.getUser();
        if (!userResult.user) {
          setKids([]);
          setWishlists({});
          setSelectedKidId(null);
          return;
        }
        const { data: membership } = await supabase.from("members").select("household_id").eq("user_id", userResult.user.id).limit(1).maybeSingle();
        if (!membership?.household_id) {
          setHouseholdId(null);
          setKids([]);
          setWishlists({});
          setSelectedKidId(null);
          return;
        }

        const [{ data: memberRows }, { data: wishRows }] = await Promise.all([
          supabase.from("members").select("id, display_name, role, color").eq("household_id", membership.household_id).eq("role", "child").order("created_at"),
          supabase.from("christmas_wishlist_items").select("id, member_id, title, note, category, priority, created_at").eq("household_id", membership.household_id).order("created_at"),
        ]);
        if (cancelled) return;

        const loadedKids = (memberRows ?? []).map((member, index) => ({
          id: String(member.id),
          name: member.display_name,
          color: member.color ?? ["#e85d75", "#2d9a79", "#7c65d8", "#e39b3d"][index % 4],
          emoji: ["🦌", "⛄", "🧸", "🛷"][index % 4],
        }));
        const loadedWishlists = Object.fromEntries(loadedKids.map((kid) => [kid.id, [] as WishItem[]])) as WishlistByKid;
        for (const wish of wishRows ?? []) {
          const memberId = String(wish.member_id);
          if (loadedWishlists[memberId]) loadedWishlists[memberId].push({ id: wish.id, title: wish.title, note: wish.note ?? "", category: wish.category ?? "Surprise", priority: Boolean(wish.priority), createdAt: wish.created_at });
        }
        setHouseholdId(membership.household_id);
        setKids(loadedKids);
        setWishlists(loadedWishlists);
        setSelectedKidId((current) => loadedKids.some((kid) => kid.id === current) ? current : loadedKids[0]?.id ?? null);
        setSyncMessage(loadedKids.length ? "Synced with your family home" : "Add a child in Settings to start a wish list");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadFamilyWishlist();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleMemberRemoved = (event: Event) => {
      const removedMemberId = String((event as CustomEvent<string>).detail);
      setKids((current) => current.filter((kid) => kid.id !== removedMemberId));
      setWishlists((current) => {
        const next = { ...current };
        delete next[removedMemberId];
        return next;
      });
      setSelectedKidId((current) => current === removedMemberId ? null : current);
    };
    window.addEventListener("family-member-removed", handleMemberRemoved);
    return () => window.removeEventListener("family-member-removed", handleMemberRemoved);
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return;
    let hideTimer: number | undefined;
    const showSleigh = () => {
      setBackgroundSleighVisible(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setBackgroundSleighVisible(false), 3_400);
    };
    const firstPass = window.setTimeout(showSleigh, 4_000);
    const recurringPass = window.setInterval(showSleigh, 11_000);
    return () => {
      window.clearTimeout(firstPass);
      window.clearInterval(recurringPass);
      window.clearTimeout(hideTimer);
    };
  }, []);

  function addWish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newWish.trim();
    if (!title || !selectedKid) return;
    const note = newNote.trim();
    const optimisticWish: WishItem = { id: `local-${Date.now()}`, title, note, category, priority: false, createdAt: new Date().toISOString() };
    setWishlists((current) => ({ ...current, [selectedKid.id]: [...(current[selectedKid.id] ?? []), optimisticWish] }));
    setNewWish("");
    setNewNote("");
    setCategory("Play");
    setShowForm(false);
    setCelebrating(true);
    window.setTimeout(() => setCelebrating(false), 2200);

    if (supabase && householdId) {
      void supabase.from("christmas_wishlist_items").insert({ household_id: householdId, member_id: selectedKid.id, title, note: note || null, category, priority: false }).select("id, created_at").single().then(({ data, error }) => {
        if (error) {
          setSyncMessage("Saved on this device · sync will retry later");
          return;
        }
        if (data) setWishlists((current) => ({ ...current, [selectedKid.id]: (current[selectedKid.id] ?? []).map((wish) => wish.id === optimisticWish.id ? { ...wish, id: data.id, createdAt: data.created_at } : wish) }));
      });
    }
  }

  function togglePriority(wish: WishItem) {
    if (!selectedKid) return;
    const priority = !wish.priority;
    setWishlists((current) => ({ ...current, [selectedKid.id]: (current[selectedKid.id] ?? []).map((item) => item.id === wish.id ? { ...item, priority } : item) }));
    if (supabase && householdId && !wish.id.startsWith("local-")) void supabase.from("christmas_wishlist_items").update({ priority }).eq("id", wish.id);
  }

  function removeWish(wish: WishItem) {
    if (!selectedKid) return;
    setWishlists((current) => ({ ...current, [selectedKid.id]: (current[selectedKid.id] ?? []).filter((item) => item.id !== wish.id) }));
    if (supabase && householdId && !wish.id.startsWith("local-")) {
      void supabase.from("christmas_wishlist_items").delete().eq("id", wish.id).then(({ error }) => {
        if (error) setSyncMessage("Removed here · the family copy could not be deleted yet");
      });
    }
  }

  if (isLoading) {
    return <section className="relative mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="christmas-wishlist-shell relative z-10 rounded-[1.75rem] bg-white/85 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur-sm dark:bg-slate-950/55 dark:ring-white/10 md:p-7"><div className="rounded-[1.5rem] bg-gradient-to-r from-[#1d6658] to-[#2f806e] p-6 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6f0dd]">Christmas wishes</p><h1 className="mt-1 font-serif text-3xl font-black sm:text-4xl">What&apos;s on your list?</h1><p className="mt-2 text-sm font-semibold text-white/80">Your family wish lists will appear here.</p></div><div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 px-5 py-10 text-center dark:border-white/10" role="status" aria-live="polite"><p className="font-black text-slate-700 dark:text-slate-200">Loading your family wish lists…</p><p className="mt-1 text-sm font-semibold text-slate-400">Checking for children and saved wishes.</p></div></div></section>;
  }

  if (!selectedKid) {
    return <section className="relative mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8"><div className="christmas-wishlist-shell relative z-10 rounded-[1.75rem] bg-white/85 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur-sm dark:bg-slate-950/55 dark:ring-white/10 md:p-7"><div className="rounded-[1.5rem] bg-gradient-to-r from-[#1d6658] to-[#2f806e] p-6 text-white shadow-sm"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6f0dd]">Christmas wishes</p><h1 className="mt-1 font-serif text-3xl font-black sm:text-4xl">What&apos;s on your list?</h1><p className="mt-2 text-sm font-semibold text-white/80">Your family wish lists will appear here.</p></div><div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 px-5 py-10 text-center dark:border-white/10"><p className="font-black text-slate-700 dark:text-slate-200">No children added yet</p><p className="mt-1 text-sm font-semibold text-slate-400">Add a child in Settings to start a Christmas wish list.</p></div></div></section>;
  }

  return (
    <section className="relative mx-auto max-w-[1800px] px-5 pb-24 md:px-9 lg:pb-8">
      {backgroundSleighVisible && <div className="christmas-sleigh-pass pointer-events-none fixed inset-x-0 top-20 z-20 flex justify-center opacity-35" aria-hidden="true"><ChristmasLottie src={santaSleighAnimation} fallback="🎅" className="size-56 sm:size-72" loop={false} label="Animated Santa sleigh" /></div>}
      <div className="christmas-wishlist-shell relative z-10 rounded-[1.75rem] bg-white/85 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur-sm dark:bg-slate-950/55 dark:ring-white/10 md:p-7">
        <header className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-[#1d6658] to-[#2f806e] p-5 text-white shadow-sm sm:p-6">
          <div className="christmas-snow pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
          <div className="relative flex items-center justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6f0dd]">Christmas wishes</p><h1 className="mt-1 font-serif text-3xl font-black sm:text-4xl">What&apos;s on your list?</h1><p className="mt-2 text-sm font-semibold text-white/80">{totalWishes} {totalWishes === 1 ? "wish" : "wishes"} across the family</p></div>
            <ChristmasLottie src={christmasTreeAnimation} fallback="🎄" className="size-20 shrink-0 sm:size-24" label="Animated Christmas tree" />
          </div>
        </header>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside>
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">Family lists</p><h2 className="mt-1 text-lg font-black text-slate-800 dark:text-slate-100">Choose a kid</h2></div><ChristmasLottie src={gingerbreadAnimation} fallback="🎁" className="size-14" label="Animated gingerbread socks" /></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {kids.map((kid) => {
                const selected = kid.id === selectedKid.id;
                const count = wishlists[kid.id]?.length ?? 0;
                return <button key={kid.id} onClick={() => setSelectedKidId(kid.id)} className={`flex items-center gap-3 rounded-2xl p-3 text-left transition ${selected ? "bg-emerald-700 text-white shadow-md shadow-emerald-900/20" : "text-slate-600 hover:bg-rose-50 dark:text-slate-300 dark:hover:bg-white/10"}`}><span className="grid size-10 shrink-0 place-items-center rounded-xl text-xl" style={{ backgroundColor: selected ? "rgb(255 255 255 / .16)" : `${kid.color}22` }}>{kid.emoji}</span><span className="min-w-0 flex-1"><span className="block truncate font-black">{kid.name}</span><span className={`text-xs font-semibold ${selected ? "text-emerald-100" : "text-slate-400"}`}>{count} {count === 1 ? "wish" : "wishes"}</span></span></button>;
              })}
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl text-2xl" style={{ backgroundColor: `${selectedKid.color}22` }}>{selectedKid.emoji}</span><div><p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">{selectedKid.name}&apos;s list</p><h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">Christmas wishes</h2></div></div><button onClick={() => setShowForm((current) => !current)} className="rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-rose-600">{showForm ? "Close" : "+ Add a wish"}</button></div>

            {showForm && <form onSubmit={addWish} className="mt-5 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:ring-emerald-300/20"><div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr]"><label className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-100">I would love…<input autoFocus required value={newWish} onChange={(event) => setNewWish(event.target.value)} placeholder="A telescope, a puppy book…" className="mt-2 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-base font-semibold text-slate-800 shadow-sm ring-1 ring-emerald-100" /></label><label className="text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-100">It&apos;s a…<StyledSelect value={category} onChange={(event) => setCategory(event.target.value as (typeof categories)[number])}>{categories.map((item) => <option key={item}>{item}</option>)}</StyledSelect></label></div><label className="mt-3 block text-xs font-black uppercase tracking-wide text-emerald-800 dark:text-emerald-100">A little more detail <span className="font-semibold normal-case tracking-normal text-emerald-600/70">(optional)</span><input value={newNote} onChange={(event) => setNewNote(event.target.value)} placeholder="Color, size, or why I like it…" className="mt-2 w-full rounded-xl border-0 bg-white px-3 py-2.5 text-base font-semibold text-slate-800 shadow-sm ring-1 ring-emerald-100" /></label><div className="mt-3 flex items-center justify-between gap-3"><ChristmasLottie src={gingerbreadAnimation} fallback="🍪" className="size-12" label="Animated gingerbread socks" /><button className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-800">Put it on my list</button></div></form>}

            <div className="mt-5 space-y-3">
              {selectedWishes.map((wish, index) => <WishRow key={wish.id} wish={wish} index={index} onTogglePriority={() => togglePriority(wish)} onRemove={() => removeWish(wish)} />)}
              {!selectedWishes.length && <div className="rounded-2xl border-2 border-dashed border-slate-200 px-5 py-8 text-center dark:border-white/10"><ChristmasLottie src={snowmanAnimation} fallback="⛄" className="mx-auto size-32" label="Animated waving snowman" /><p className="mt-1 font-black text-slate-700 dark:text-slate-200">Start dreaming!</p><p className="mt-1 text-sm font-semibold text-slate-400">Add something {selectedKid.name} would love.</p></div>}
            </div>
            {syncMessage && <p className="mt-4 text-xs font-bold text-slate-400">{syncMessage}</p>}
          </div>
        </div>
      </div>
      {celebrating && <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-violet-950/10 p-6" role="status" aria-label="Wish added"><ChristmasLottie src={santaSleighAnimation} fallback="🎅" className="size-64" loop={false} label="Animated Santa sleigh" /><p className="absolute mt-64 rounded-full bg-white/95 px-4 py-2 font-black text-emerald-700 shadow-xl">Wish added! 🎁</p></div>}
    </section>
  );
}

function ChristmasLottie({ src, fallback, className, label, loop = true }: { src: string; fallback: string; className: string; label: string; loop?: boolean }) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduceMotion ? <span className={`grid place-items-center text-4xl ${className}`} aria-label={label}>{fallback}</span> : <div className={`relative overflow-hidden ${className}`}><Lottie src={src} autoplay loop={loop} className="size-full" aria-label={label} /></div>;
}

function WishRow({ wish, index, onTogglePriority, onRemove }: { wish: WishItem; index: number; onTogglePriority: () => void; onRemove: () => void }) {
  return <article className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-white/10 dark:bg-white/5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-xs font-black text-amber-700">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-800 dark:text-slate-100">{wish.title}</h3>{wish.priority && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">Top dream</span>}</div>{wish.note && <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{wish.note}</p>}<span className="mt-1.5 inline-block text-[10px] font-black uppercase tracking-wide text-slate-400">{wish.category}</span></div><div className="flex shrink-0 gap-1"><button type="button" onClick={onTogglePriority} aria-label={wish.priority ? "Remove top dream" : "Make top dream"} className={`grid size-8 place-items-center rounded-lg text-lg hover:bg-amber-50 ${wish.priority ? "text-amber-500" : "text-slate-300"}`}>★</button><button type="button" onClick={onRemove} title={`Delete ${wish.title}`} aria-label={`Delete ${wish.title}`} className="grid size-8 place-items-center rounded-lg text-rose-600 opacity-0 hover:bg-rose-100 group-hover:opacity-100 focus:opacity-100"><AppIcon name="trash" className="size-4" /></button></div></article>;
}
