import type { Member, SharedList } from "@/features/home/model";
import { localDateInputValue } from "@/features/home/model";

export type VoiceSection = "calendar" | "tasks" | "chores" | "wishlist" | "lists";

export type ParsedVoiceCommand = {
  section: VoiceSection;
  title: string;
  date: string | null;
  time: string | null;
  member: Member | null;
  list: SharedList | null;
  routine: string | null;
};

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseDate(text: string, now: Date) {
  const lower = text.toLowerCase();
  if (/\btomorrow\b/.test(lower)) {
    const date = new Date(now);
    date.setDate(date.getDate() + 1);
    return localDateInputValue(date);
  }
  if (/\btoday\b/.test(lower)) return localDateInputValue(now);

  const weekdayMatch = lower.match(/\b(next\s+|this\s+|on\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekdayMatch) {
    const targetDay = weekdays.indexOf(weekdayMatch[2]);
    const currentDay = now.getDay();
    let offset = (targetDay - currentDay + 7) % 7;
    if (weekdayMatch[1]?.trim() === "next" && offset === 0) offset = 7;
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return localDateInputValue(date);
  }

  const monthMatch = lower.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s+(\d{4}))?\b/);
  if (monthMatch) {
    const year = Number(monthMatch[3] ?? now.getFullYear());
    const date = new Date(year, months.indexOf(monthMatch[1]), Number(monthMatch[2]));
    if (!monthMatch[3] && date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setFullYear(year + 1);
    return localDateInputValue(date);
  }

  return null;
}

function parseTime(text: string) {
  const lower = text.toLowerCase();
  if (/\bnoon\b/.test(lower)) return "12:00";
  if (/\bmidnight\b/.test(lower)) return "00:00";
  const match = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) return null;
  if (match[4]) return `${match[4].padStart(2, "0")}:${match[5]}`;
  let hour = Number(match[1]);
  const minute = match[2] ?? "00";
  if (match[3] === "pm" && hour < 12) hour += 12;
  if (match[3] === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function findMember(text: string, members: Member[]) {
  const lower = text.toLowerCase();
  return [...members].sort((first, second) => second.name.length - first.name.length).find((member) => {
    const name = escapeRegExp(member.name.toLowerCase());
    return new RegExp(`\\b(?:for|assigned to)\\s+${name}\\b`).test(lower);
  }) ?? null;
}

function findList(text: string, lists: SharedList[]) {
  const lower = text.toLowerCase();
  return [...lists].sort((first, second) => second.title.length - first.title.length).find((list) => {
    const name = escapeRegExp(list.title.toLowerCase());
    return new RegExp(`\\b${name}\\b`).test(lower);
  }) ?? null;
}

function stripPhrases(text: string, section: VoiceSection, member: Member | null, list: SharedList | null) {
  let title = text
    .replace(/^\s*(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(add|create|put|schedule|make|set)\s+/i, "")
    .replace(/^\s*(a|an|the)\s+/i, "")
    .replace(/\b(?:to\s+the\s+)?(?:wishlist|wish\s+list)\b/gi, "")
    .replace(list ? new RegExp(`\\b(?:to|on)\\s+(?:the\\s+)?${escapeRegExp(list.title.trim())}(?:\\s+list)?\\b`, "i") : /$^/, "")
    .replace(/\b(?:to|on)\s+(?:the\s+)?lists?\b/gi, "")
    .replace(/\b(?:calendar\s+)?(?:event|appointment)\b/gi, "")
    .replace(/\b(?:task|to-?do)\b/gi, "")
    .replace(/\bchore\b/gi, "")
    .replace(/\b(?:for|assigned\s+to)\s+(?:[a-z][a-z'-]*(?:\s+[a-z][a-z'-]*)?)(?=\s+(?:on|next|this|today|tomorrow|at|every|each)\b|\s*$)/gi, "")
    .replace(/\b(?:next\s+|this\s+|on\s+)?(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\b(?:today|tomorrow)\b/gi, "")
    .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+\d{4})?\b/gi, "")
    .replace(/\b(?:at\s+)?(?:noon|midnight|\d{1,2}(?::\d{2})?\s*(?:am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d)\b/gi, "")
    .replace(/\b(?:every|each)\s+(?:day|weekday|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (member) title = title.replace(new RegExp(`\\b(?:for|assigned\\s+to)\\s+${escapeRegExp(member.name)}\\b`, "i"), "");
  if (section === "chores") title = title.replace(/\b(?:before|after)\s+school\b/gi, "");
  return title.replace(/^\s*(to|for)\s+/i, "").replace(/\s+/g, " ").trim();
}

function sectionFor(text: string, lists: SharedList[]) {
  const lower = text.toLowerCase();
  if (lists.some((list) => lower.includes(list.title.toLowerCase()))) return "lists" as const;
  if (/wishlist|wish\s+list|christmas list/.test(lower)) return "wishlist";
  if (/\blist\b|\blists\b/.test(lower)) return "lists";
  if (/\bchore\b|\bchores\b|routine/.test(lower)) return "chores";
  if (/\btask\b|to-?do|remind me/.test(lower)) return "tasks";
  if (/calendar|event|appointment|meeting|practice|game|party|birthday|\bat\s+\d|tomorrow|today|next\s+\w+|on\s+\w+/.test(lower)) return "calendar";
  return "tasks";
}

function routineFor(text: string) {
  const lower = text.toLowerCase();
  if (/before school|morning/.test(lower)) return "Before school";
  if (/after school|night|evening/.test(lower)) return "After school";
  return "To-do";
}

export function parseVoiceCommand(text: string, members: Member[], lists: SharedList[] = [], now = new Date()): ParsedVoiceCommand | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const section = sectionFor(normalized, lists);
  const member = findMember(normalized, members);
  const list = findList(normalized, lists);
  const title = stripPhrases(normalized, section, member, list);
  if (!title) return null;
  return { section, title, date: parseDate(normalized, now), time: parseTime(normalized), member, list, routine: section === "chores" ? routineFor(normalized) : null };
}
