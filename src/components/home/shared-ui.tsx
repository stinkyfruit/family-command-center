import { useEffect, useRef, useState, type SelectHTMLAttributes } from "react";
import { CalendarBlankIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckSquareIcon, ClipboardTextIcon, GiftIcon, HouseIcon, ListBulletsIcon, MicrophoneIcon, MoonIcon, PencilSimpleIcon, PlusIcon, SignOutIcon, SlidersHorizontalIcon, StopCircleIcon, SunIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { notoIconPath } from "@/features/home/model";

export type IconName = "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist" | "plus" | "close" | "trash" | "edit" | "chevronLeft" | "chevronRight" | "chevronDown" | "sun" | "moon" | "signOut" | "microphone" | "stop";

const navigationIconStyles: Record<Extract<IconName, "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist">, { tile: string; icon: string; activeIcon: string }> = {
  home: { tile: "bg-amber-100 dark:bg-amber-400/20", icon: "text-amber-600 dark:text-amber-200", activeIcon: "text-amber-700" },
  calendar: { tile: "bg-sky-100 dark:bg-sky-400/20", icon: "text-sky-600 dark:text-sky-200", activeIcon: "text-sky-700" },
  tasks: { tile: "bg-violet-100 dark:bg-violet-400/20", icon: "text-violet-600 dark:text-violet-200", activeIcon: "text-violet-700" },
  chores: { tile: "bg-emerald-100 dark:bg-emerald-400/20", icon: "text-emerald-600 dark:text-emerald-200", activeIcon: "text-emerald-700" },
  lists: { tile: "bg-rose-100 dark:bg-rose-400/20", icon: "text-rose-600 dark:text-rose-200", activeIcon: "text-rose-700" },
  wishlist: { tile: "bg-pink-100 dark:bg-pink-400/20", icon: "text-pink-600 dark:text-pink-200", activeIcon: "text-pink-700" },
  settings: { tile: "bg-indigo-100 dark:bg-indigo-400/20", icon: "text-indigo-600 dark:text-indigo-200", activeIcon: "text-indigo-700" },
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
    microphone: MicrophoneIcon,
    stop: StopCircleIcon,
  }[name];

  if (variant === "nav" && name in navigationIconStyles) {
    const style = navigationIconStyles[name as keyof typeof navigationIconStyles];
    return <span className={`relative grid size-9 place-items-center rounded-[1.1rem] shadow-sm ring-1 ring-black/5 transition-transform dark:ring-white/10 ${style.tile} ${active ? "bg-white/95 shadow-md dark:bg-white/95" : "group-hover:-translate-y-0.5"}`}>
      <Icon className={`relative ${className} ${active ? style.activeIcon : style.icon}`} weight="duotone" aria-hidden="true" />
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

type SpeechRecognitionResultEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionErrorEventLike = Event & { error?: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike;

function speechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function SpeechInputButton({ value, onChange, onComplete, buttonLabel = "Dictate into this field", showMessage = true }: { value: string; onChange: (value: string) => void; onComplete?: (value: string) => void; buttonLabel?: string; showMessage?: boolean }) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const prefixRef = useRef("");
  const spokenTextRef = useRef("");
  const stopTimerRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort?.(); } catch { /* The browser may already have ended recognition. */ }
    }
    recognitionRef.current = null;
  }, []);

  function finishListening(completeCommand: boolean) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }
    if (completeCommand) {
      const completedValue = [prefixRef.current, spokenTextRef.current].filter(Boolean).join(" ");
      if (completedValue) {
        onChange(completedValue);
        onComplete?.(completedValue);
      }
    }
    setListening(false);
  }

  function stopListening() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setListening(false);
      return;
    }
    try {
      recognition.stop();
      stopTimerRef.current = window.setTimeout(() => {
        try { recognition.abort?.(); } catch { /* The browser may already have ended recognition. */ }
        finishListening(true);
      }, 1200);
    } catch {
      finishListening(true);
    }
  }

  function startListening() {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition) {
      setMessage("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new Recognition();
    prefixRef.current = value.trim();
    spokenTextRef.current = "";
    finishedRef.current = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript.trim() ?? "";
        if (result.isFinal) spokenTextRef.current = `${spokenTextRef.current} ${transcript}`.trim();
        else interimText = `${interimText} ${transcript}`.trim();
      }
      onChange([prefixRef.current, spokenTextRef.current, interimText].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        finishListening(false);
        return;
      }
      setMessage(event.error === "not-allowed" ? "Allow microphone access to dictate here." : "I couldn’t hear that. Try again.");
      finishListening(false);
    };
    recognition.onend = () => {
      finishListening(true);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setMessage("");
      setListening(true);
    } catch {
      finishedRef.current = true;
      recognitionRef.current = null;
      setMessage("Voice input could not start. Try again.");
    }
  }

  return <div className="group relative flex items-center gap-1.5">
    <button type="button" onClick={listening ? stopListening : startListening} aria-label={listening ? "Stop voice input" : buttonLabel} aria-pressed={listening} title={listening ? "Stop voice input" : buttonLabel} className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${listening ? "bg-rose-100 text-rose-700 ring-rose-200 hover:bg-rose-200" : "bg-violet-100 text-violet-700 ring-violet-200 hover:bg-violet-200"}`}>
      <AppIcon name={listening ? "stop" : "microphone"} className="size-5" />
    </button>
    <span role="tooltip" className="pointer-events-none absolute right-0 top-full z-50 mt-2 hidden w-64 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-semibold leading-snug text-white shadow-xl group-hover:block group-focus-within:block dark:bg-white dark:text-slate-900">{listening ? "Click to stop listening." : buttonLabel}</span>
    {showMessage && message && <span role="status" className="max-w-44 text-xs font-semibold text-rose-600 dark:text-rose-300">{message}</span>}
  </div>;
}


export function NotoEmoji({ emoji, className = "size-4", alt = "" }: { emoji: string; className?: string; alt?: string }) {
  const source = notoIconPath(emoji);
  return source ? <img src={source} alt={alt} className={`inline-block shrink-0 object-contain ${className}`} /> : <span aria-hidden={alt ? undefined : "true"}>{emoji}</span>;
}
