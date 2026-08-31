"use client";

/* Photos are resized in the browser before they reach Supabase Storage. */
/* eslint-disable @next/next/no-img-element */

import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AppIcon, StyledSelect, useAppNotifications } from "@/components/home/shared-ui";
import type { Member, SharedList } from "@/features/home/model";
import { supabase } from "@/lib/supabase";

const PHOTO_BUCKET = "family-dinner-photos";
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const MAX_PHOTO_DIMENSION = 1600;
const categories = [
  { value: "main", label: "Main dish" },
  { value: "side", label: "Side" },
  { value: "bread", label: "Bread" },
  { value: "snacks", label: "Snacks" },
  { value: "dessert", label: "Dessert" },
] as const;
type DinnerCategory = (typeof categories)[number]["value"];
type DinnerRating = { id: string; memberId: string | null; memberName: string; rating: number };
type DinnerDish = { id: string; position: number; title: string; category: DinnerCategory; madeByMemberId: string | null; madeByMemberName: string | null; photoPath: string | null; photoUrl: string | null; ratings: DinnerRating[] };
type Dinner = { id: string; eatenOn: string | null; createdAt: string; notes: string | null; dishes: DinnerDish[] };
type DishDraft = { id: string | null; title: string; category: DinnerCategory; madeByMemberId: string; madeByMemberName: string | null; photoFile: File | null; photoPath: string | null; photoUrl: string | null; photoRemoved: boolean; ratings: Record<string, string> };
type RatedDish = DinnerDish & { dinnerId: string; dinnerDate: string | null; average: number };
type FamilyDinnersPageProps = {
  householdId: string | null;
  members: Member[];
  currentUserId: string | null;
  sharedLists: SharedList[];
  onAddListItem: (listId: string | number) => void;
  onToggleListItem: (listId: string | number, itemId: string | number) => void;
  onDeleteListItem: (listId: string | number, itemId: string | number) => void;
  onOpenSharedLists: () => void;
};

function blankDish(): DishDraft {
  return { id: null, title: "", category: "main", madeByMemberId: "", madeByMemberName: null, photoFile: null, photoPath: null, photoUrl: null, photoRemoved: false, ratings: {} };
}

function draftFromDish(dish: DinnerDish): DishDraft {
  return { id: dish.id, title: dish.title, category: dish.category, madeByMemberId: dish.madeByMemberId ?? "", madeByMemberName: dish.madeByMemberName, photoFile: null, photoPath: dish.photoPath, photoUrl: dish.photoUrl, photoRemoved: false, ratings: Object.fromEntries(dish.ratings.map((rating) => [String(rating.memberId), String(rating.rating)])) };
}

function formatDate(date: string | null) {
  if (!date) return "Date not recorded";
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function shortDate(date: string | null) {
  if (!date) return "No date";
  return new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function categoryLabel(category: DinnerCategory) {
  return categories.find((option) => option.value === category)?.label ?? category;
}

function averageRating(dish: DinnerDish) {
  return dish.ratings.length ? dish.ratings.reduce((total, rating) => total + rating.rating, 0) / dish.ratings.length : 0;
}

function sortDinners(dinners: Dinner[]) {
  return [...dinners].sort((first, second) => (second.eatenOn ?? "").localeCompare(first.eatenOn ?? "") || second.createdAt.localeCompare(first.createdAt));
}

function topRatedDishesForFilter(dinners: Dinner[], ratingFilter: "all" | DinnerCategory) {
  const grouped = new Map<string, RatedDish>();
  for (const dinner of dinners) {
    for (const dish of dinner.dishes) {
      if (!dish.ratings.length || (ratingFilter !== "all" && dish.category !== ratingFilter)) continue;
      const key = `${dish.category}:${dish.title.trim().toLowerCase()}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, { ...dish, dinnerId: dinner.id, dinnerDate: dinner.eatenOn, average: averageRating(dish) });
        continue;
      }
      const ratings = [...existing.ratings, ...dish.ratings];
      const newer = (dinner.eatenOn ?? "") >= (existing.dinnerDate ?? "");
      grouped.set(key, { ...existing, ...(newer ? { id: dish.id, dinnerId: dinner.id, dinnerDate: dinner.eatenOn, photoPath: dish.photoPath, photoUrl: dish.photoUrl } : {}), ratings, average: ratings.reduce((total, rating) => total + rating.rating, 0) / ratings.length });
    }
  }
  return [...grouped.values()].sort((first, second) => second.average - first.average || second.ratings.length - first.ratings.length || (second.dinnerDate ?? "").localeCompare(first.dinnerDate ?? "")).slice(0, 8);
}

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > MAX_PHOTO_BYTES && file.type === "image/webp") throw new Error("That photo is over 3 MB. Choose a smaller photo.");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("This phone could not prepare the photo."); }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size > MAX_PHOTO_BYTES) throw new Error("That photo is still over 3 MB after preparation. Choose a smaller photo.");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "dinner-photo"}.jpg`, { type: "image/jpeg" });
}

function DinnerPhoto({ url, title, className = "h-44 w-full", fit = "cover" }: { url: string | null; title: string; className?: string; fit?: "cover" | "contain" | "natural" }) {
  return <div className={`flex items-center justify-center overflow-hidden rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-400/20 dark:text-orange-200 ${className}`}>{url ? <img src={url} alt={`${title} photo`} className={fit === "natural" ? "block max-h-80 max-w-[92%] object-contain" : fit === "contain" ? "block max-h-full max-w-full object-contain" : "size-full object-cover object-center"} loading="lazy" /> : <AppIcon name="familyDinners" className="size-10" />}</div>;
}

export const FamilyDinnersPage = memo(function FamilyDinnersPage({ householdId, members, currentUserId, sharedLists, onAddListItem, onToggleListItem, onDeleteListItem, onOpenSharedLists }: FamilyDinnersPageProps) {
  const { notify, confirm } = useAppNotifications();
  const [dinners, setDinners] = useState<Dinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDinnerId, setEditingDinnerId] = useState<string | null>(null);
  const [selectedDinner, setSelectedDinner] = useState<Dinner | null>(null);
  const [eatenOn, setEatenOn] = useState("");
  const [notes, setNotes] = useState("");
  const [dishDrafts, setDishDrafts] = useState<DishDraft[]>([blankDish()]);
  const [ratingFilter, setRatingFilter] = useState<"all" | DinnerCategory>("all");

  useEffect(() => {
    if (!selectedDinner) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedDinner(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedDinner]);

  const resetForm = useCallback(() => {
    setEatenOn("");
    setNotes("");
    setDishDrafts([blankDish()]);
    setEditingDinnerId(null);
    setShowForm(false);
    setMessage("");
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) resetForm();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [resetForm, saving, showForm]);

  useEffect(() => {
    let cancelled = false;
    async function loadDinners() {
      setLoading(true);
      setMessage("");
      if (!supabase || !householdId) { setDinners([]); setLoading(false); return; }
      const dinnerResult = await supabase.from("family_dinners").select("id, eaten_on, notes, created_at").eq("household_id", householdId).order("eaten_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
      if (cancelled) return;
      if (dinnerResult.error) { setMessage(dinnerResult.error.code === "42P01" ? "Run the Family Dinners migration in Supabase first." : `Could not load family dinners: ${dinnerResult.error.message}`); setLoading(false); return; }
      const dinnerRows = (dinnerResult.data ?? []) as Array<{ id: string; eaten_on: string | null; notes: string | null; created_at: string }>;
      if (!dinnerRows.length) { setDinners([]); setLoading(false); return; }
      const dinnerIds = dinnerRows.map((dinner) => dinner.id);
      const dishResult = await supabase.from("family_dinner_dishes").select("id, dinner_id, position, title, category, made_by_member_id, made_by_member_name, photo_path").in("dinner_id", dinnerIds);
      if (dishResult.error) { setMessage(`Could not load dinner dishes: ${dishResult.error.message}`); setLoading(false); return; }
      const dishRows = (dishResult.data ?? []) as Array<{ id: string; dinner_id: string; position: number; title: string; category: string; made_by_member_id: string | null; made_by_member_name: string | null; photo_path: string | null }>;
      const dishIds = dishRows.map((dish) => dish.id);
      const ratingResult = dishIds.length ? await supabase.from("family_dinner_ratings").select("id, dish_id, member_id, member_name, rating").in("dish_id", dishIds) : { data: [], error: null };
      if (ratingResult.error) { setMessage(`Could not load dinner ratings: ${ratingResult.error.message}`); setLoading(false); return; }
      const photoUrls = await Promise.all(dishRows.filter((dish) => dish.photo_path).map(async (dish) => {
        const result = await supabase!.storage.from(PHOTO_BUCKET).createSignedUrl(dish.photo_path!, 60 * 60);
        return [dish.id, result.data?.signedUrl ?? null] as const;
      }));
      const photoUrlByDish = new Map(photoUrls);
      const ratingRows = (ratingResult.data ?? []) as Array<{ id: string; dish_id: string; member_id: string | null; member_name: string; rating: number }>;
      const loaded = dinnerRows.map((dinner) => ({
        id: dinner.id,
        eatenOn: dinner.eaten_on,
        createdAt: dinner.created_at,
        notes: dinner.notes,
        dishes: dishRows.filter((dish) => dish.dinner_id === dinner.id).sort((first, second) => first.position - second.position).map((dish) => ({ id: dish.id, position: dish.position, title: dish.title, category: categories.some((option) => option.value === dish.category) ? dish.category as DinnerCategory : "main", madeByMemberId: dish.made_by_member_id, madeByMemberName: dish.made_by_member_name, photoPath: dish.photo_path, photoUrl: photoUrlByDish.get(dish.id) ?? null, ratings: ratingRows.filter((rating) => rating.dish_id === dish.id).map((rating) => ({ id: rating.id, memberId: rating.member_id, memberName: rating.member_name, rating: rating.rating })) })),
      }));
      if (!cancelled) { setDinners(sortDinners(loaded)); setLoading(false); }
    }
    void loadDinners();
    return () => { cancelled = true; };
  }, [householdId]);

  const totalDishes = useMemo(() => dinners.reduce((total, dinner) => total + dinner.dishes.length, 0), [dinners]);
  const totalRatings = useMemo(() => dinners.reduce((total, dinner) => total + dinner.dishes.reduce((dishTotal, dish) => dishTotal + dish.ratings.length, 0), 0), [dinners]);
  const topRatedDishes = useMemo(() => topRatedDishesForFilter(dinners, ratingFilter), [dinners, ratingFilter]);
  const dinnerIdeasList = sharedLists.find((list) => list.title.trim().toLowerCase() === "dinner ideas") ?? null;

  function updateDish(index: number, update: Partial<DishDraft>) {
    setDishDrafts((current) => current.map((dish, dishIndex) => dishIndex === index ? { ...dish, ...update } : dish));
  }

  function updateRating(dishIndex: number, memberId: string, rating: string) {
    setDishDrafts((current) => current.map((dish, index) => index === dishIndex ? { ...dish, ratings: { ...dish.ratings, [memberId]: rating } } : dish));
  }

  async function choosePhoto(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const prepared = await preparePhoto(file);
      updateDish(index, { photoFile: prepared, photoPath: null, photoUrl: URL.createObjectURL(prepared), photoRemoved: false });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That photo could not be prepared.");
    }
  }

  function beginEditingDinner(dinner: Dinner) {
    setEditingDinnerId(dinner.id);
    setEatenOn(dinner.eatenOn ?? "");
    setNotes(dinner.notes ?? "");
    setDishDrafts(dinner.dishes[0] ? [draftFromDish(dinner.dishes[0])] : [blankDish()]);
    setSelectedDinner(null);
    setMessage("");
    setShowForm(true);
  }

  async function saveDinner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!members.length) { setMessage("Add family members before recording ratings."); return; }
    const preparedDishes = dishDrafts.slice(0, 1).map((dish) => ({ ...dish, position: 1, title: dish.title.trim(), madeByMemberId: dish.madeByMemberId || null, madeByMemberName: members.find((member) => String(member.id) === dish.madeByMemberId)?.name ?? null, ratings: members.map((member) => ({ memberId: member.id, memberName: member.name, rating: Number(dish.ratings[String(member.id)] ?? "") })) }));
    if (preparedDishes.some((dish) => !dish.title)) { setMessage("Give each dish a title."); return; }
    if (preparedDishes.some((dish) => dish.ratings.some((rating) => !Number.isInteger(rating.rating) || rating.rating < 1 || rating.rating > 10))) { setMessage("Choose a rating from 1 to 10 for everyone and every dish."); return; }
    setSaving(true);
    setMessage("");
    const existingDinner = editingDinnerId ? dinners.find((dinner) => dinner.id === editingDinnerId) : null;
    let createdDinnerId: string | null = null;
    try {
      if (!supabase || !householdId) {
        const localDinner: Dinner = { id: editingDinnerId ?? `local-${Date.now()}`, eatenOn: eatenOn || null, createdAt: existingDinner?.createdAt ?? new Date().toISOString(), notes: notes.trim() || null, dishes: preparedDishes.map((dish) => ({ id: dish.id ?? `local-dish-${Date.now()}-${dish.position}`, position: dish.position, title: dish.title, category: dish.category, madeByMemberId: dish.madeByMemberId, madeByMemberName: dish.madeByMemberName, photoPath: null, photoUrl: dish.photoUrl, ratings: dish.ratings.map((rating, ratingIndex) => ({ id: `local-rating-${Date.now()}-${ratingIndex}`, memberId: String(rating.memberId), memberName: rating.memberName, rating: rating.rating })) })) };
        setDinners((current) => sortDinners(editingDinnerId ? current.map((item) => item.id === editingDinnerId ? localDinner : item) : [localDinner, ...current]));
        notify(editingDinnerId ? "Dish updated." : "Dish saved.", "success");
        resetForm();
        return;
      }
      const dinnerResult = editingDinnerId
        ? await supabase.from("family_dinners").update({ eaten_on: eatenOn || null, notes: notes.trim() || null }).eq("id", editingDinnerId).eq("household_id", householdId).select("id, eaten_on, notes, created_at").single()
        : await supabase.from("family_dinners").insert({ household_id: householdId, eaten_on: eatenOn || null, notes: notes.trim() || null, created_by: currentUserId }).select("id, eaten_on, notes, created_at").single();
      if (dinnerResult.error || !dinnerResult.data) throw new Error(dinnerResult.error?.message ?? "The family dinner could not be saved.");
      const dinner = dinnerResult.data as { id: string; eaten_on: string | null; notes: string | null; created_at: string };
      if (!editingDinnerId) createdDinnerId = dinner.id;
      const persistedDishes: Array<{ id: string; position: number; title: string; category: DinnerCategory; made_by_member_id: string | null; made_by_member_name: string | null; photo_path: string | null }> = [];
      for (const dish of preparedDishes) {
        const dishData = { dinner_id: dinner.id, position: dish.position, title: dish.title, category: dish.category, made_by_member_id: dish.madeByMemberId, made_by_member_name: dish.madeByMemberName, photo_path: dish.photoRemoved ? null : dish.photoPath };
        const dishResult = dish.id
          ? await supabase.from("family_dinner_dishes").update(dishData).eq("id", dish.id).eq("dinner_id", dinner.id).select("id, position, title, category, made_by_member_id, made_by_member_name, photo_path").single()
          : await supabase.from("family_dinner_dishes").insert(dishData).select("id, position, title, category, made_by_member_id, made_by_member_name, photo_path").single();
        if (dishResult.error || !dishResult.data) throw new Error(dishResult.error?.message ?? "The dinner dishes could not be saved.");
        let persisted = dishResult.data as typeof persistedDishes[number];
        const oldPath = existingDinner?.dishes.find((item) => item.id === dish.id)?.photoPath ?? null;
        if (dish.photoFile) {
          const path = `${householdId}/${dinner.id}/${persisted.id}.jpg`;
          const uploadResult = await supabase.storage.from(PHOTO_BUCKET).upload(path, dish.photoFile, { contentType: "image/jpeg", upsert: true });
          if (uploadResult.error) throw new Error(`Could not upload ${dish.title}'s photo: ${uploadResult.error.message}`);
          const photoUpdate = await supabase.from("family_dinner_dishes").update({ photo_path: path }).eq("id", persisted.id).select("id, position, title, category, made_by_member_id, made_by_member_name, photo_path").single();
          if (photoUpdate.error || !photoUpdate.data) throw new Error(photoUpdate.error?.message ?? "The dinner photo could not be linked.");
          persisted = photoUpdate.data as typeof persisted;
          if (oldPath && oldPath !== path) await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
        } else if ((dish.photoRemoved || (!dish.photoPath && oldPath)) && oldPath) {
          await supabase.storage.from(PHOTO_BUCKET).remove([oldPath]);
        }
        persistedDishes.push(persisted);
      }
      const existingDishIds = existingDinner?.dishes.map((dish) => dish.id) ?? [];
      const persistedDishIds = persistedDishes.map((dish) => dish.id);
      const removedDishIds = existingDishIds.filter((id) => !persistedDishIds.includes(id));
      if (removedDishIds.length) {
        const oldPaths = existingDinner?.dishes.filter((dish) => removedDishIds.includes(dish.id)).map((dish) => dish.photoPath).filter((path): path is string => Boolean(path)) ?? [];
        if (oldPaths.length) await supabase.storage.from(PHOTO_BUCKET).remove(oldPaths);
        const removedResult = await supabase.from("family_dinner_dishes").delete().in("id", removedDishIds).eq("dinner_id", dinner.id);
        if (removedResult.error) throw new Error(removedResult.error.message);
      }
      const clearRatingsResult = persistedDishIds.length ? await supabase.from("family_dinner_ratings").delete().in("dish_id", persistedDishIds) : { error: null };
      if (clearRatingsResult.error) throw new Error(clearRatingsResult.error.message);
      const ratingRows = preparedDishes.flatMap((dish) => { const persisted = persistedDishes.find((item) => item.position === dish.position); return persisted ? dish.ratings.map((rating) => ({ dish_id: persisted.id, member_id: rating.memberId, member_name: rating.memberName, rating: rating.rating })) : []; });
      const ratingResult = await supabase.from("family_dinner_ratings").insert(ratingRows).select("id, dish_id, member_id, member_name, rating");
      if (ratingResult.error || !ratingResult.data) throw new Error(ratingResult.error?.message ?? "The dinner ratings could not be saved.");
      const photoUrls = await Promise.all(persistedDishes.filter((dish) => dish.photo_path).map(async (dish) => [dish.id, (await supabase!.storage.from(PHOTO_BUCKET).createSignedUrl(dish.photo_path!, 60 * 60)).data?.signedUrl ?? null] as const));
      const photoUrlByDish = new Map(photoUrls);
      const savedDinner: Dinner = { id: dinner.id, eatenOn: dinner.eaten_on, createdAt: dinner.created_at, notes: dinner.notes, dishes: persistedDishes.map((dish) => ({ id: dish.id, position: dish.position, title: dish.title, category: dish.category, madeByMemberId: dish.made_by_member_id, madeByMemberName: dish.made_by_member_name, photoPath: dish.photo_path, photoUrl: photoUrlByDish.get(dish.id) ?? null, ratings: (ratingResult.data ?? []).filter((rating) => rating.dish_id === dish.id).map((rating) => ({ id: rating.id, memberId: rating.member_id, memberName: rating.member_name, rating: rating.rating })) })) };
      setDinners((current) => sortDinners(editingDinnerId ? current.map((item) => item.id === editingDinnerId ? savedDinner : item) : [savedDinner, ...current]));
      notify(editingDinnerId ? "Dish updated." : "Dish saved.", "success");
      resetForm();
    } catch (error) {
      if (supabase && householdId && createdDinnerId) void supabase.from("family_dinners").delete().eq("id", createdDinnerId).eq("household_id", householdId);
      setMessage(error instanceof Error ? error.message : "The family dinner could not be saved.");
    } finally { setSaving(false); }
  }

  async function deleteDinner(dinner: Dinner) {
    if (!await confirm(`Permanently delete the family dinner from ${formatDate(dinner.eatenOn)}?`, { title: "Delete family dinner?", destructive: true })) return;
    setDeletingId(dinner.id);
    try {
      let photoCleanupFailed = false;
      if (supabase && householdId && !dinner.id.startsWith("local-")) {
        const { error } = await supabase.from("family_dinners").delete().eq("id", dinner.id).eq("household_id", householdId);
        if (error) { notify(`Could not delete this family dinner: ${error.message}`); return; }
        const photoPaths = dinner.dishes.map((dish) => dish.photoPath).filter((path): path is string => Boolean(path));
        if (photoPaths.length) photoCleanupFailed = Boolean((await supabase.storage.from(PHOTO_BUCKET).remove(photoPaths)).error);
      }
      setDinners((current) => current.filter((item) => item.id !== dinner.id));
      if (selectedDinner?.id === dinner.id) setSelectedDinner(null);
      notify(photoCleanupFailed ? "Family dinner deleted, but an attached photo could not be removed." : "Family dinner deleted.", photoCleanupFailed ? "error" : "success");
    } finally {
      setDeletingId(null);
    }
  }

  return <section className="w-full min-w-0">
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-950 via-orange-800 to-amber-600 p-6 text-white shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-100">Family dishes</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Pass the memories</h1><p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-orange-50">Keep the dishes, recipes, and family opinions worth remembering.</p></div><button type="button" onClick={() => { if (showForm) resetForm(); else { setEditingDinnerId(null); setMessage(""); setShowForm(true); } }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-orange-900 shadow-sm hover:bg-orange-50"><AppIcon name="plus" className="size-4" />{showForm ? "Close form" : "Record a dish"}</button></div>
        <div className="mt-7 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-2xl font-black">{totalDishes}</p><p className="text-xs font-bold text-orange-100">Dishes recorded</p></div><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10"><p className="text-2xl font-black">{totalRatings}</p><p className="text-xs font-bold text-orange-100">Family ratings</p></div><div className="hidden rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 sm:block"><p className="text-2xl font-black">{members.length}</p><p className="text-xs font-bold text-orange-100">Family tasters</p></div></div>
      </section>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section className="min-w-0 rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-orange-100 dark:bg-white/5 dark:ring-white/10 md:p-6" aria-labelledby="top-rated-dishes-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">Family favorites</p><h2 id="top-rated-dishes-title" className="mt-1 text-2xl font-black">Highest rated dishes</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">The dishes your family has loved most so far.</p></div><StyledSelect value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value as "all" | DinnerCategory)} className="mt-0 w-40" aria-label="Filter highest rated dishes by category"><option value="all">All types</option>{categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</StyledSelect></div>
          {loading ? <p role="status" className="mt-6 text-sm font-semibold text-slate-400">Calculating family favorites…</p> : topRatedDishes.length ? <div className="mt-5 space-y-3">{topRatedDishes.map((dish, index) => <article key={`${dish.id}-${dish.dinnerId}`} className="flex min-w-0 items-center gap-3 rounded-2xl bg-orange-50 p-3 dark:bg-orange-400/10"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-orange-700 shadow-sm dark:bg-white/10 dark:text-orange-200">{index + 1}</span><DinnerPhoto url={dish.photoUrl} title={dish.title} className="size-14 shrink-0" /><div className="min-w-0 flex-1"><h3 className="truncate font-black">{dish.title}</h3><p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-300">{categoryLabel(dish.category)}{dish.dinnerDate ? ` · ${shortDate(dish.dinnerDate)}` : ""}{dish.madeByMemberName ? ` · Made by ${dish.madeByMemberName}` : ""}</p></div><div className="shrink-0 text-right"><p className="text-lg font-black text-orange-700 dark:text-orange-200">{dish.average.toFixed(1)}</p><p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{dish.ratings.length} {dish.ratings.length === 1 ? "rating" : "ratings"}</p></div></article>)}</div> : <div className="mt-5 rounded-2xl border-2 border-dashed border-orange-200 px-4 py-7 text-center dark:border-orange-300/20"><p className="text-sm font-black">No rated dishes in this category yet.</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Record a dish and add everyone&apos;s ratings to build this list.</p></div>}
        </section>

        <section className="min-w-0 rounded-[2rem] bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 p-5 shadow-sm ring-1 ring-orange-100 dark:from-amber-400/15 dark:via-orange-400/10 dark:to-yellow-400/10 dark:ring-white/10 md:p-6" aria-labelledby="dinner-ideas-title">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-200">Keep for later</p><h2 id="dinner-ideas-title" className="mt-1 text-2xl font-black">Dinner Ideas</h2><p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">The same shared list, shaped for meal planning.</p></div>{dinnerIdeasList && <button type="button" onClick={() => onAddListItem(dinnerIdeasList.id)} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-700"><AppIcon name="plus" className="size-4" />Add idea</button>}</div>
          {dinnerIdeasList ? <div className="mt-5 space-y-2">{dinnerIdeasList.items.length ? dinnerIdeasList.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white/80 px-3 py-3 text-sm font-bold text-slate-700 dark:bg-white/10 dark:text-slate-100"><button type="button" onClick={() => onToggleListItem(dinnerIdeasList.id, item.id)} aria-label={`${item.done ? "Mark" : "Complete"} ${item.title}`} className={`grid size-6 shrink-0 place-items-center rounded-lg border-2 ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-orange-300 text-transparent dark:border-orange-200/60"}`}><AppIcon name="check" className="size-4" /></button><span className={`min-w-0 flex-1 truncate ${item.done ? "line-through opacity-50" : ""}`}>{item.title}</span><button type="button" onClick={() => onDeleteListItem(dinnerIdeasList.id, item.id)} aria-label={`Delete ${item.title}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-400/10"><AppIcon name="trash" className="size-4" /></button></div>) : <div className="rounded-2xl border-2 border-dashed border-orange-200 px-4 py-7 text-center dark:border-orange-300/20"><p className="text-sm font-black">Your Dinner Ideas list is empty.</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Add ideas here and they&apos;ll also appear in Shared Lists.</p></div>}{dinnerIdeasList.items.length > 0 && <button type="button" onClick={onOpenSharedLists} className="mt-3 text-xs font-black text-orange-700 underline underline-offset-2 hover:text-orange-900 dark:text-orange-200">Open in Shared Lists</button>}</div> : <div className="mt-5 rounded-2xl border-2 border-dashed border-orange-200 px-4 py-7 text-center dark:border-orange-300/20"><p className="text-sm font-black">Create a shared list called &quot;Dinner Ideas&quot;.</p><p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Once it exists, it will appear here automatically.</p><button type="button" onClick={onOpenSharedLists} className="mt-3 rounded-xl bg-orange-600 px-3 py-2 text-xs font-black text-white hover:bg-orange-700">Open Shared Lists</button></div>}
        </section>
      </div>

      {showForm && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) resetForm(); }}><form onSubmit={saveDinner} role="dialog" aria-modal="true" aria-labelledby="dinner-form-title" className="my-4 max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-orange-100 dark:bg-white/5 dark:ring-white/10 md:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">{editingDinnerId ? "Edit memory" : "New memory"}</p><h2 id="dinner-form-title" className="mt-1 text-2xl font-black">{editingDinnerId ? "Edit family dish" : "What did you make?"}</h2><p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">Add the dish, a date if you remember it, and everyone&apos;s rating.</p></div><label className="text-sm font-black">Date <span className="font-medium text-slate-500 dark:text-slate-300">(optional)</span><input type="date" value={eatenOn} onChange={(event) => setEatenOn(event.target.value)} className="mt-1 block rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /></label></div><label className="mt-5 block text-sm font-bold">Dish notes <span className="font-medium text-slate-500 dark:text-slate-300">(optional)</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} rows={3} placeholder="What made this dish special? Any recipe notes?" className="mt-2 block w-full resize-y rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /><span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">{notes.length}/1000</span></label><div className="mt-5">{dishDrafts.map((dish, dishIndex) => <article key={dish.id ?? dishIndex} className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-400/10"><div className="flex items-center justify-between gap-3"><h3 className="font-black">Dish {dishIndex + 1}</h3></div><label className="mt-3 block text-sm font-bold">Title<input required maxLength={120} value={dish.title} onChange={(event) => updateDish(dishIndex, { title: event.target.value })} placeholder="e.g. Grandma&apos;s lasagna" className="mt-1 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white" /></label><label className="mt-3 block text-sm font-bold">Category<StyledSelect value={dish.category} onChange={(event) => updateDish(dishIndex, { category: event.target.value as DinnerCategory })}>{categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</StyledSelect></label><label className="mt-3 block text-sm font-bold">Made by <span className="font-medium text-slate-500 dark:text-slate-300">(optional)</span><StyledSelect value={dish.madeByMemberId} onChange={(event) => { const member = members.find((candidate) => String(candidate.id) === event.target.value); updateDish(dishIndex, { madeByMemberId: event.target.value, madeByMemberName: member?.name ?? null }); }}><option value="">Choose a family member</option>{members.map((member) => <option key={member.id} value={String(member.id)}>{member.name}</option>)}</StyledSelect></label><div className="mt-3"><span className="block text-sm font-bold">Dish photo <span className="font-medium text-slate-500 dark:text-slate-300">(optional)</span></span><div className="mt-2 flex items-center gap-3"><DinnerPhoto url={dish.photoUrl} title={dish.title || "Dish"} className="size-20 shrink-0" /><div className="min-w-0"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-orange-700 shadow-sm ring-1 ring-orange-200 hover:bg-orange-100 dark:bg-white/10 dark:text-orange-200 dark:ring-white/10"><AppIcon name="plus" className="size-4" />{dish.photoUrl ? "Replace photo" : "Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void choosePhoto(dishIndex, event)} className="sr-only" /></label>{dish.photoUrl && <button type="button" onClick={() => updateDish(dishIndex, { photoFile: null, photoUrl: null, photoRemoved: true })} className="ml-2 text-xs font-black text-rose-600 hover:underline">Remove</button>}<p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">JPG, PNG, or WebP · prepared to 1600px · max 3 MB</p></div></div></div><div className="mt-4 border-t border-orange-200/70 pt-3 dark:border-white/10"><p className="text-xs font-black uppercase tracking-wide text-orange-700 dark:text-orange-200">Everyone&apos;s rating</p><div className="mt-2 grid gap-2">{members.map((member) => <label key={member.id} className="flex items-center gap-2 text-sm font-bold"><span className="min-w-0 flex-1 truncate">{member.name}</span><StyledSelect className="mt-0 w-28" aria-label={`${member.name}'s rating for ${dish.title || `dish ${dishIndex + 1}`}`} value={dish.ratings[String(member.id)] ?? ""} onChange={(event) => updateRating(dishIndex, String(member.id), event.target.value)}><option value="">Rating</option>{Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => <option key={rating} value={rating}>{rating} / 10</option>)}</StyledSelect></label>)}</div></div></article>)}</div><div className="mt-4 flex justify-end gap-2"><div className="flex items-center gap-2"><button type="button" onClick={resetForm} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Cancel</button><button type="submit" disabled={saving || !members.length} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : editingDinnerId ? "Save changes" : "Save dish"}</button></div></div>{message && <p role="alert" className="mt-3 text-sm font-bold text-rose-600 dark:text-rose-300">{message}</p>}<p className="mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Photos are private to your household and are kept within the app&apos;s 3 MB per-dish limit.</p></form></div>}

      {(loading ? <div role="status" className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10"><p className="font-black">Loading family dishes…</p><p className="mt-1 text-sm font-semibold text-slate-400">Gathering your favorite meals.</p></div> : message && !showForm ? <div role="alert" className="rounded-2xl bg-rose-50 p-5 text-sm font-bold text-rose-800 ring-1 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-300/20">{message}</div> : dinners.length === 0 ? <div className="rounded-[2rem] border-2 border-dashed border-orange-200 bg-white/70 px-5 py-14 text-center dark:border-orange-300/20 dark:bg-white/5"><div className="mx-auto grid size-16 place-items-center rounded-3xl bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-200"><AppIcon name="familyDinners" className="size-8" /></div><h2 className="mt-5 text-xl font-black">Your dish history starts here</h2><p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500 dark:text-slate-300">Record a dish to remember what you made, who loved it, and what you&apos;d make again.</p><button type="button" onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white hover:bg-orange-700">Record the first dish</button></div> : <section aria-label="Recorded family dishes" className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{dinners.map((dinner) => <article key={dinner.id} className="min-w-0 max-w-full overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg dark:bg-white/5 dark:ring-white/10"><button type="button" key={dinner.id} onClick={() => setSelectedDinner(dinner)} className="group block w-full min-w-0 max-w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"><div className="bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-50 p-3 dark:from-orange-400/20 dark:via-amber-400/10 dark:to-yellow-400/10"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-orange-800 shadow-sm dark:bg-white/10 dark:text-orange-100">{shortDate(dinner.eatenOn)}</span><AppIcon name="familyDinners" className="size-5 text-orange-500 transition-transform group-hover:rotate-6 dark:text-orange-200" /></div><div className="mt-3"><DinnerPhoto url={dinner.dishes[0]?.photoUrl ?? null} title={dinner.dishes[0]?.title ?? "Dish"} className="aspect-[4/3] w-full" /></div></div><div className="p-4"><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 flex-1 truncate text-lg font-black">{dinner.dishes[0]?.title ?? "Untitled dish"}</h2><span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-800 dark:bg-orange-400/20 dark:text-orange-100">{dinner.dishes[0] ? categoryLabel(dinner.dishes[0].category) : "Dish"}</span></div>{dinner.dishes[0] && <p className="mt-2 min-w-0 max-w-full truncate text-sm font-black text-orange-700 dark:text-orange-200">{averageRating(dinner.dishes[0]).toFixed(1)} / 10{dinner.dishes[0].madeByMemberName ? ` · ${dinner.dishes[0].madeByMemberName}` : ""}</p>}{dinner.notes && <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Notes included</p>}</div></button><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-white/10"><button type="button" onClick={() => beginEditingDinner(dinner)} aria-label="Edit family dish" title="Edit family dish" className="grid size-9 place-items-center rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-400/20 dark:text-orange-200"><AppIcon name="edit" className="size-4" /></button><button type="button" onClick={() => void deleteDinner(dinner)} disabled={deletingId === dinner.id} aria-label="Delete family dinner" title="Delete family dinner" className="grid size-9 place-items-center rounded-xl text-rose-600 hover:bg-rose-100 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-rose-400/10"><AppIcon name="trash" className="size-4" /></button></div></article>)}</section>)}
    </div>

    {selectedDinner && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedDinner(null); }}><article role="dialog" aria-modal="true" aria-labelledby="selected-dinner-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl dark:bg-[#202031] md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">Family dish</p><h2 id="selected-dinner-title" className="mt-1 text-2xl font-black">{formatDate(selectedDinner.eatenOn)}</h2></div><button type="button" onClick={() => setSelectedDinner(null)} aria-label="Close dinner details" className="grid size-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button></div>{selectedDinner.notes && <div className="mt-6 rounded-2xl bg-amber-50 p-4 dark:bg-amber-400/10"><p className="text-xs font-black uppercase tracking-wide text-amber-800 dark:text-amber-100">Dish notes</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{selectedDinner.notes}</p></div>}<div className="mt-6 grid gap-4">{selectedDinner.dishes.slice(0, 1).map((dish) => <section key={dish.id} className="rounded-2xl bg-orange-50 p-4 dark:bg-orange-400/10"><div className="grid gap-4 sm:grid-cols-[9rem_1fr]"><DinnerPhoto url={dish.photoUrl} title={dish.title} className="h-36 w-full sm:h-36" /><div><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-black uppercase tracking-wide text-orange-600 dark:text-orange-200">{categoryLabel(dish.category)}</p><h3 className="mt-1 text-xl font-black">{dish.title}</h3>{dish.madeByMemberName && <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">Made by {dish.madeByMemberName}</p>}</div><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800 dark:bg-amber-400/20 dark:text-amber-100">Family average {averageRating(dish).toFixed(1)} / 10</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{dish.ratings.map((rating) => <div key={rating.id} className="flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-sm font-bold dark:bg-white/10"><span>{rating.memberName}</span><span className="text-orange-700 dark:text-orange-200">{rating.rating} / 10</span></div>)}</div></div></div></section>)}</div></article></div>}
  </section>;
});
