import type { SelectHTMLAttributes } from "react";
import { CalendarBlankIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckSquareIcon, ClipboardTextIcon, GiftIcon, HouseIcon, ListBulletsIcon, MoonIcon, PencilSimpleIcon, PlusIcon, SignOutIcon, SlidersHorizontalIcon, SunIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { notoIconPath } from "@/features/home/model";

export type IconName = "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist" | "plus" | "close" | "trash" | "edit" | "chevronLeft" | "chevronRight" | "chevronDown" | "sun" | "moon" | "signOut";

export function AppIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
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
