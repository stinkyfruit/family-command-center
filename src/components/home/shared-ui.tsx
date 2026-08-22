import { CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, CheckSquareIcon, ClipboardTextIcon, HouseIcon, ListBulletsIcon, MoonIcon, PencilSimpleIcon, PlusIcon, SlidersHorizontalIcon, SunIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { notoIconPath } from "@/features/home/model";

export type IconName = "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "plus" | "close" | "trash" | "edit" | "chevronLeft" | "chevronRight" | "sun" | "moon";

export function AppIcon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const Icon = {
    home: HouseIcon,
    calendar: CalendarBlankIcon,
    tasks: CheckSquareIcon,
    chores: ClipboardTextIcon,
    lists: ListBulletsIcon,
    settings: SlidersHorizontalIcon,
    plus: PlusIcon,
    close: XIcon,
    trash: TrashIcon,
    edit: PencilSimpleIcon,
    chevronLeft: CaretLeftIcon,
    chevronRight: CaretRightIcon,
    sun: SunIcon,
    moon: MoonIcon,
  }[name];
  return <Icon className={className} weight="bold" aria-hidden="true" />;
}


export function NotoEmoji({ emoji, className = "size-4", alt = "" }: { emoji: string; className?: string; alt?: string }) {
  const source = notoIconPath(emoji);
  return source ? <img src={source} alt={alt} className={`inline-block shrink-0 object-contain ${className}`} /> : <span aria-hidden={alt ? undefined : "true"}>{emoji}</span>;
}


