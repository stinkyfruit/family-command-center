import type { SelectHTMLAttributes } from "react";
import { CalendarBlankIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckSquareIcon, ClipboardTextIcon, GiftIcon, HouseIcon, ListBulletsIcon, MoonIcon, PencilSimpleIcon, PlusIcon, SignOutIcon, SlidersHorizontalIcon, SunIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { notoIconPath } from "@/features/home/model";

export type IconName = "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist" | "plus" | "close" | "trash" | "edit" | "chevronLeft" | "chevronRight" | "chevronDown" | "sun" | "moon" | "signOut";

const navigationIconStyles: Record<Extract<IconName, "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist">, { tile: string; icon: string }> = {
  home: { tile: "bg-amber-100 dark:bg-amber-400/20", icon: "text-amber-600 dark:text-amber-200" },
  calendar: { tile: "bg-sky-100 dark:bg-sky-400/20", icon: "text-sky-600 dark:text-sky-200" },
  tasks: { tile: "bg-violet-100 dark:bg-violet-400/20", icon: "text-violet-600 dark:text-violet-200" },
  chores: { tile: "bg-emerald-100 dark:bg-emerald-400/20", icon: "text-emerald-600 dark:text-emerald-200" },
  lists: { tile: "bg-rose-100 dark:bg-rose-400/20", icon: "text-rose-600 dark:text-rose-200" },
  wishlist: { tile: "bg-pink-100 dark:bg-pink-400/20", icon: "text-pink-600 dark:text-pink-200" },
  settings: { tile: "bg-indigo-100 dark:bg-indigo-400/20", icon: "text-indigo-600 dark:text-indigo-200" },
};

export function AppIcon({ name, className = "size-5", variant = "default", active = false }: { name: IconName; className?: string; variant?: "default" | "nav"; active?: boolean }) {
  const Icon = {
    home: HouseIcon,
    calendar: CalendarBlankIcon,
    tasks: CheckSquareIcon,
    chores: ClipboardTextIcon,
    lists: ListBulletsIcon,
    settings: SlidersHorizontalIcon,
    wishlist: GiftIcon,
    plus: PlusIcon,
    close: XIcon,
    trash: TrashIcon,
    edit: PencilSimpleIcon,
    chevronLeft: CaretLeftIcon,
    chevronRight: CaretRightIcon,
    chevronDown: CaretDownIcon,
    sun: SunIcon,
    moon: MoonIcon,
    signOut: SignOutIcon,
  }[name];

  if (variant === "nav" && name in navigationIconStyles) {
    const style = navigationIconStyles[name as keyof typeof navigationIconStyles];
    return <span className={`relative grid size-9 place-items-center rounded-[1.1rem] shadow-sm ring-1 ring-black/5 transition-transform dark:ring-white/10 ${style.tile} ${active ? "bg-white/95 shadow-md dark:bg-white/95" : "group-hover:-translate-y-0.5"}`}>
      <Icon className={`relative ${className} ${style.icon}`} weight="duotone" aria-hidden="true" />
    </span>;
  }

  return <Icon className={className} weight="bold" aria-hidden="true" />;
}

export function StyledSelect({ children, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="relative block">
    <select {...props} className={"mt-1 h-10 w-full appearance-none rounded-xl border border-violet-200 bg-white/90 px-3 pr-10 text-sm font-bold text-slate-800 shadow-sm shadow-violet-900/5 transition hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 " + className}>
      {children}
    </select>
    <AppIcon name="chevronDown" className="pointer-events-none absolute right-3 top-[calc(50%+2px)] size-4 -translate-y-1/2 text-violet-500 dark:text-violet-300" />
  </span>;
}


export function NotoEmoji({ emoji, className = "size-4", alt = "" }: { emoji: string; className?: string; alt?: string }) {
  const source = notoIconPath(emoji);
  return source ? <img src={source} alt={alt} className={`inline-block shrink-0 object-contain ${className}`} /> : <span aria-hidden={alt ? undefined : "true"}>{emoji}</span>;
}
