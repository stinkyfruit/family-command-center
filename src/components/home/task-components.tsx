import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AppIcon } from "@/components/home/shared-ui";
import { halloweenScreensaverVideos, timeGreeting } from "@/features/home/model";
import type { Todo, Member } from "@/features/home/model";

export function AuthScreen({ onAuthenticated, invitePending = false }: { onAuthenticated: (user: User | null) => void; invitePending?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const result = isNew
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) { setMessage(result.error.message); return; }
    if (result.data.session?.user) {
      onAuthenticated(result.data.session.user);
      setMessage("Welcome home!");
      return;
    }
    setMessage("Check your email to confirm your account, then come back here and sign in.");
  }

  async function resendConfirmation() {
    if (!supabase || !email) { setMessage("Enter your email address first."); return; }
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}` } });
    setMessage(error ? error.message : "A new confirmation email is on its way.");
  }

  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_left,#ddd6fe,transparent_35%),#f8f7ff] p-5 text-slate-900"><form onSubmit={submit} className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl shadow-violet-200/50"><div className="grid size-12 place-items-center rounded-2xl bg-violet-600 text-xl text-white">✦</div><h1 className="mt-6 text-3xl font-bold">{invitePending ? "You’re invited home" : "Welcome home"}</h1><p className="mt-2 text-slate-500">{invitePending ? "Create your own account with the invited email to join the shared family calendar." : "Sign in to your private family command center."}</p><label className="mt-6 block text-sm font-bold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-violet-500" placeholder="you@example.com" /></label><label className="mt-4 block text-sm font-bold">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-violet-500" placeholder="At least 6 characters" /></label>{message && <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm text-violet-700">{message}</p>}<button className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700">{isNew ? "Create account" : "Sign in"}</button><button type="button" onClick={resendConfirmation} className="mt-3 w-full text-sm font-semibold text-slate-500 hover:text-violet-600">Resend confirmation email</button><button type="button" onClick={() => { setIsNew((value) => !value); setMessage(""); }} className="mt-4 w-full text-sm font-bold text-violet-600">{isNew ? "Already have an account? Sign in" : "New here? Create an account"}</button></form></main>;
}

export function Screensaver({ onExit }: { onExit: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  return <main className="min-h-screen cursor-pointer bg-[radial-gradient(circle_at_30%_20%,#fbcfe8,transparent_24%),radial-gradient(circle_at_70%_70%,#bfdbfe,transparent_28%),linear-gradient(120deg,#312e81,#0f766e)] p-5 text-white md:p-8" onPointerDown={onExit}><div className="flex h-[calc(100vh-2.5rem)] flex-col justify-between rounded-[2rem] border border-white/25 bg-black/10 p-7 backdrop-blur-sm md:h-[calc(100vh-4rem)] md:p-8"><div className="flex items-center justify-between text-sm font-medium text-white/80 md:text-lg"><span>{timeGreeting().replace("GOOD ", "Good ")}, family</span><span>Tap anywhere to return</span></div><div><p className="text-7xl font-semibold tracking-tight sm:text-8xl md:text-9xl">{now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><p className="mt-3 text-xl text-white/80 md:text-2xl">{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</p></div><div className="flex flex-wrap items-center gap-3 text-sm md:text-lg"><span className="rounded-full bg-white/20 px-4 py-2">✦ Family time</span><span className="rounded-full bg-white/20 px-4 py-2">Photo memories coming soon</span></div></div></main>;
}

export function SeasonalScreensaver({ onExit }: { onExit: () => void }) {
  const [video] = useState(() => halloweenScreensaverVideos[Math.floor(Math.random() * halloweenScreensaverVideos.length)] ?? halloweenScreensaverVideos[0]);
  return <main className="relative min-h-screen cursor-pointer overflow-hidden bg-[#120617] text-white" onPointerDown={onExit} aria-label="Halloween screensaver. Tap anywhere to return.">
    <video autoPlay loop muted playsInline className="absolute inset-0 size-full object-cover" src={video} />
    <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-6 py-6 text-center text-sm font-semibold tracking-wide text-white/90 md:px-10 md:py-8 md:text-base">Halloween mode · Tap anywhere to return</div>
  </main>;
}

export function TasksPage({ todos, members, onAdd, onToggle, onEdit }: { todos: Todo[]; members: Member[]; onAdd: () => void; onToggle: (id: string | number) => void; onEdit: (todo: Todo) => void }) {
  const urgency = (todo: Todo) => {
    if (!todo.dueAt) return 4;
    const due = new Date(todo.dueAt);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysAway = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    return daysAway < 0 ? 0 : daysAway === 0 ? 1 : daysAway === 1 ? 2 : 3;
  };
  const dueCopy = (todo: Todo) => {
    const level = urgency(todo);
    if (level === 0) return "Overdue";
    if (level === 1) return "Due today";
    if (level === 2) return "Due tomorrow";
    return todo.dueAt ? `Due ${new Date(todo.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : "No deadline";
  };
  const open = todos.filter((todo) => !todo.done).sort((first, second) => urgency(first) - urgency(second) || (first.dueAt ? new Date(first.dueAt).getTime() : Number.MAX_SAFE_INTEGER) - (second.dueAt ? new Date(second.dueAt).getTime() : Number.MAX_SAFE_INTEGER) || first.title.localeCompare(second.title));
  const completed = todos.filter((todo) => todo.done);
  const assignee = (todo: Todo) => members.find((member) => member.id === todo.assigneeMemberId);
  const deleteTodo = (id: string | number) => window.dispatchEvent(new CustomEvent("family-delete-todo", { detail: id }));

  return (
    <section className="mx-auto max-w-[1600px] px-5 pb-24 md:px-9 lg:pb-8">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-violet-600">FAMILY TASKS</p>
            <h2 className="text-3xl font-bold">Today&apos;s to-dos</h2>
          </div>
          <button onClick={onAdd} className="rounded-xl bg-violet-600 px-4 py-3 font-bold text-white hover:bg-violet-700">+ Add task</button>
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {open.map((todo) => {
            const person = assignee(todo);
            const level = urgency(todo);
            const cardColor = level === 0 ? "border-rose-400 bg-rose-100 shadow-rose-200/60 dark:bg-rose-500/20" : level === 1 ? "border-orange-400 bg-orange-50 shadow-orange-200/60 dark:bg-orange-500/20" : level === 2 ? "border-cyan-300 bg-cyan-50 dark:bg-cyan-400/15" : "border-transparent bg-violet-50 dark:bg-violet-400/10";
            const dueColor = level === 0 ? "bg-rose-600 text-white" : level === 1 ? "bg-orange-500 text-white" : level === 2 ? "bg-cyan-300 text-cyan-950" : "bg-white/80 text-slate-500 dark:bg-white/10 dark:text-slate-300";
            return (
              <article key={todo.id} className={`flex min-h-20 items-center gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 ${cardColor}`}>
                <button onClick={() => onEdit(todo)} className="min-w-0 flex-1 text-left">
                  <b className="block text-base">{todo.title}</b>
                  <small className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${dueColor}`}>{dueCopy(todo)}</small>
                  {person && <span className="mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ backgroundColor: `${person.color ?? "#fda4af"}33`, color: person.color ?? "#be123c" }}>For {person.name}</span>}
                </button>
                <button onClick={() => onToggle(todo.id)} aria-label={`Complete ${todo.title}`} className="grid size-10 shrink-0 place-items-center rounded-lg border-2 border-violet-400 bg-white text-xl font-black text-transparent transition hover:bg-violet-100">✓</button>
                <button onClick={() => onEdit(todo)} aria-label={`Edit ${todo.title}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-violet-600 hover:bg-violet-100"><AppIcon name="edit" className="size-5"/></button>
              </article>
            );
          })}
          {open.length === 0 && <p className="text-slate-400">You&apos;re all caught up.</p>}
        </div>

        {completed.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-5 dark:border-white/10">
            <h3 className="font-bold text-sky-600">Completed recently</h3>
            <p className="mt-1 text-sm text-slate-500">Completed tasks stay here for 7 days, then move out of sight.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {completed.map((todo) => (
                <article key={todo.id} className="flex min-h-16 items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sky-900 shadow-sm dark:bg-sky-400/10 dark:text-sky-100">
                  <button onClick={() => onToggle(todo.id)} aria-label={`Restore ${todo.title}`} className="grid size-9 shrink-0 place-items-center rounded-lg border-2 border-sky-500 bg-sky-500 text-xl font-black text-white">✓</button>
                  <button onClick={() => onEdit(todo)} className="min-w-0 flex-1 text-left text-sm font-bold line-through">{todo.title}</button>
                  <button onClick={() => onToggle(todo.id)} className="shrink-0 rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-sky-700 shadow-sm ring-1 ring-sky-200 hover:bg-white dark:bg-white/10 dark:text-sky-100 dark:ring-white/15">Restore</button>
                  <button onClick={() => deleteTodo(todo.id)} title={`Delete ${todo.title}`} aria-label={`Permanently delete ${todo.title}`} className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"><AppIcon name="trash" className="size-4"/></button>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export function TaskEditor({ title, dueDate, assigneeMemberId, members, editing, onTitleChange, onDueDateChange, onAssigneeChange, onClose, onSave }: { title: string; dueDate: string; assigneeMemberId: string; members: Member[]; editing: boolean; onTitleChange: (value: string) => void; onDueDateChange: (value: string) => void; onAssigneeChange: (value: string) => void; onClose: () => void; onSave: (event: FormEvent) => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-5 backdrop-blur-sm"><form onSubmit={onSave} className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl dark:bg-[#242435]"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-violet-600">FAMILY TASK</p><h2 className="text-2xl font-bold">{editing ? "Edit task" : "Add a to-do"}</h2></div><button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl text-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">×</button></div><label className="mt-5 block text-sm font-bold">What needs to get done?<input required autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="e.g. Pick up groceries" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-violet-500" /></label><label className="mt-5 block text-sm font-bold">Deadline <span className="font-normal text-slate-400">(optional)</span><input type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-slate-800 outline-violet-500" /></label><fieldset className="mt-5"><legend className="text-sm font-bold">Assign to <span className="font-normal text-slate-400">(optional)</span></legend><div className="mt-2 flex flex-wrap gap-2"><label className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${!assigneeMemberId ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200"}`}><input className="sr-only" type="radio" name="task-assignee" checked={!assigneeMemberId} onChange={() => onAssigneeChange("")} />Anyone</label>{members.map((member) => <label key={member.id} className={`cursor-pointer rounded-full px-3 py-2 text-sm font-bold ${assigneeMemberId === String(member.id) ? "text-white" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"}`} style={assigneeMemberId === String(member.id) ? { backgroundColor: member.color ?? "#8b5cf6" } : undefined}><input className="sr-only" type="radio" name="task-assignee" checked={assigneeMemberId === String(member.id)} onChange={() => onAssigneeChange(String(member.id))} />{member.name}</label>)}</div></fieldset><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button><button className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700">{editing ? "Save task" : "Add task"}</button></div></form></div>;
}
