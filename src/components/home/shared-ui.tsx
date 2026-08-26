"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type SelectHTMLAttributes } from "react";
import Image from "next/image";
import { BellIcon, CalendarBlankIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, CheckSquareIcon, ClipboardTextIcon, FilmSlateIcon, GiftIcon, HouseIcon, InfoIcon, ListBulletsIcon, MicrophoneIcon, MoonIcon, PauseIcon, PencilSimpleIcon, PlayIcon, PlusIcon, SignOutIcon, SlidersHorizontalIcon, StopCircleIcon, SunIcon, TrashIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { notoIconPath } from "@/features/home/model";

export type IconName = "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist" | "movieNight" | "bell" | "plus" | "close" | "trash" | "edit" | "chevronLeft" | "chevronRight" | "chevronDown" | "sun" | "moon" | "signOut" | "microphone" | "stop" | "play" | "pause" | "check" | "info" | "warning";

const navigationIconStyles: Record<Extract<IconName, "home" | "calendar" | "tasks" | "chores" | "lists" | "settings" | "wishlist" | "movieNight">, { tile: string; icon: string; activeIcon: string }> = {
  home: { tile: "bg-amber-100 dark:bg-amber-400/20", icon: "text-amber-600 dark:text-amber-200", activeIcon: "text-amber-700" },
  calendar: { tile: "bg-sky-100 dark:bg-sky-400/20", icon: "text-sky-600 dark:text-sky-200", activeIcon: "text-sky-700" },
  tasks: { tile: "bg-violet-100 dark:bg-violet-400/20", icon: "text-violet-600 dark:text-violet-200", activeIcon: "text-violet-700" },
  chores: { tile: "bg-emerald-100 dark:bg-emerald-400/20", icon: "text-emerald-600 dark:text-emerald-200", activeIcon: "text-emerald-700" },
  lists: { tile: "bg-rose-100 dark:bg-rose-400/20", icon: "text-rose-600 dark:text-rose-200", activeIcon: "text-rose-700" },
  wishlist: { tile: "bg-pink-100 dark:bg-pink-400/20", icon: "text-pink-600 dark:text-pink-200", activeIcon: "text-pink-700" },
  movieNight: { tile: "bg-fuchsia-100 dark:bg-fuchsia-400/20", icon: "text-fuchsia-600 dark:text-fuchsia-200", activeIcon: "text-fuchsia-700" },
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
    movieNight: FilmSlateIcon,
    bell: BellIcon,
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
    play: PlayIcon,
    pause: PauseIcon,
    check: CheckIcon,
    info: InfoIcon,
    warning: WarningCircleIcon,
  }[name];

  if (variant === "nav" && name in navigationIconStyles) {
    const style = navigationIconStyles[name as keyof typeof navigationIconStyles];
    return <span className={`relative grid size-9 place-items-center rounded-[1.1rem] shadow-sm ring-1 ring-black/5 transition-transform dark:ring-white/10 ${style.tile} ${active ? "bg-white/95 shadow-md dark:bg-white/95" : "group-hover:-translate-y-0.5"}`}>
      <Icon className={`relative ${className} ${active ? style.activeIcon : style.icon}`} weight="duotone" aria-hidden="true" />
    </span>;
  }

  return <Icon className={className} weight="bold" aria-hidden="true" />;
}

export type NotificationTone = "info" | "success" | "error" | "warning";

type NotificationOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ToastNotice = { id: number; message: string; tone: NotificationTone };
type DialogRequest =
  | { kind: "confirm"; message: string; options: NotificationOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; message: string; defaultValue: string; options: NotificationOptions; resolve: (value: string | null) => void };

type NotificationApi = {
  notify: (message: string, tone?: NotificationTone) => void;
  confirm: (message: string, options?: NotificationOptions) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string, options?: NotificationOptions) => Promise<string | null>;
};

const NotificationContext = createContext<NotificationApi | null>(null);

export function useAppNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useAppNotifications must be used inside NotificationProvider");
  return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [dialog, setDialog] = useState<DialogRequest | null>(null);
  const nextToastId = useRef(0);

  const notify = useCallback((message: string, tone: NotificationTone = "error") => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { id, message, tone }].slice(-4));
  }, []);

  const confirm = useCallback((message: string, options: NotificationOptions = {}) => new Promise<boolean>((resolve) => {
    setDialog({ kind: "confirm", message, options, resolve });
  }), []);

  const prompt = useCallback((message: string, defaultValue = "", options: NotificationOptions = {}) => new Promise<string | null>((resolve) => {
    setDialog({ kind: "prompt", message, defaultValue, options, resolve });
  }), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const resolveDialog = useCallback((value: boolean | string | null) => {
    if (!dialog) return;
    if (dialog.kind === "confirm" && typeof value === "boolean") dialog.resolve(value);
    if (dialog.kind === "prompt" && (typeof value === "string" || value === null)) dialog.resolve(value);
    setDialog(null);
  }, [dialog]);

  return <NotificationContext.Provider value={{ notify, confirm, prompt }}>
    {children}
    <NotificationCenter toasts={toasts} dialog={dialog} onDismissToast={dismissToast} onResolveDialog={resolveDialog} />
  </NotificationContext.Provider>;
}

function NotificationCenter({ toasts, dialog, onDismissToast, onResolveDialog }: { toasts: ToastNotice[]; dialog: DialogRequest | null; onDismissToast: (id: number) => void; onResolveDialog: (value: boolean | string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dialog?.kind === "prompt") inputRef.current?.focus();
  }, [dialog]);

  useEffect(() => {
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onResolveDialog(dialog.kind === "confirm" ? false : null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialog, onResolveDialog]);

  return <>
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-stretch gap-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-md">
      {toasts.map((toast) => <AppToast key={toast.id} toast={toast} onDismiss={() => onDismissToast(toast.id)} />)}
    </div>
    {dialog && <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onResolveDialog(dialog.kind === "confirm" ? false : null); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-[#242435] dark:ring-white/10">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-violet-600 dark:text-violet-300">FAMILY HOME</p><h2 id="app-dialog-title" className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{dialog.options.title ?? (dialog.kind === "prompt" ? "Add something new" : "Are you sure?")}</h2></div><button type="button" onClick={() => onResolveDialog(dialog.kind === "confirm" ? false : null)} aria-label="Close dialog" className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"><AppIcon name="close" className="size-5" /></button></div>
        <p className="mt-4 text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">{dialog.message}</p>
        {dialog.kind === "prompt" ? <form onSubmit={(event) => { event.preventDefault(); onResolveDialog(inputRef.current?.value ?? dialog.defaultValue); }}><input ref={inputRef} defaultValue={dialog.defaultValue} aria-label={dialog.message} className="mt-4 w-full rounded-xl border border-violet-200 bg-white px-3 py-3 text-slate-800 shadow-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-white/10 dark:text-white" /><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => onResolveDialog(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">{dialog.options.cancelLabel ?? "Cancel"}</button><button type="submit" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700">{dialog.options.confirmLabel ?? "Save"}</button></div></form> : <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => onResolveDialog(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">{dialog.options.cancelLabel ?? "Cancel"}</button><button type="button" onClick={() => onResolveDialog(true)} className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm ${dialog.options.destructive ? "bg-rose-600 hover:bg-rose-700" : "bg-violet-600 hover:bg-violet-700"}`}>{dialog.options.confirmLabel ?? (dialog.options.destructive ? "Delete" : "Continue")}</button></div>}
      </div>
    </div>}
  </>;
}

function AppToast({ toast, onDismiss }: { toast: ToastNotice; onDismiss: () => void }) {
  const tone = {
    info: { icon: "info" as const, label: "Notice", className: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-400/30 dark:bg-sky-950/80 dark:text-sky-100" },
    success: { icon: "check" as const, label: "Saved", className: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-950/80 dark:text-emerald-100" },
    warning: { icon: "warning" as const, label: "Heads up", className: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/80 dark:text-amber-100" },
    error: { icon: "warning" as const, label: "Something went wrong", className: "border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-400/30 dark:bg-rose-950/80 dark:text-rose-100" },
  }[toast.tone];
  useEffect(() => {
    const timeout = window.setTimeout(onDismiss, toast.tone === "error" ? 7000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, toast.tone]);
  return <div role={toast.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${tone.className}`}><AppIcon name={tone.icon} className="mt-0.5 size-5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wide opacity-70">{tone.label}</p><p className="mt-0.5 break-words text-sm font-bold leading-snug">{toast.message}</p></div><button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="grid size-7 shrink-0 place-items-center rounded-lg opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"><AppIcon name="close" className="size-4" /></button></div>;
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
  return source ? <Image src={source} alt={alt} width={32} height={32} className={`inline-block shrink-0 object-contain ${className}`} /> : <span aria-hidden={alt ? undefined : "true"}>{emoji}</span>;
}
