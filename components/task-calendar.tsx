"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { type DateRange } from "react-day-picker";
import { cn } from "cn";
import {
  Briefcase,
  Check,
  Circle,
  Copy,
  GraduationCap,
  GripVertical,
  Home,
  LayoutDashboard,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { CaliLogo } from "@/components/cali-logo";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  addTask,
  completeTask,
  deleteTask,
  duplicateTask,
  reopenTask,
  setDueDate,
} from "@/lib/actions";
import type { Task } from "@/lib/tasks";

function toKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

const PRESETS = [
  "Today",
  "This week",
  "Next 7 days",
  "This month",
  "Overdue",
  "Timeless",
] as const;
type Preset = (typeof PRESETS)[number];

const BOARD_ICONS: Record<string, LucideIcon> = {
  school: GraduationCap,
  work: Briefcase,
  personal: Home,
  "dc-dashboard": LayoutDashboard,
  "media-galaxy": Star,
  default: Circle,
};

function BoardIcon({ slug, color }: { slug: string; color: string }) {
  const Icon = BOARD_ICONS[slug] ?? Circle;
  return (
    <Icon
      className={cn("size-4 shrink-0", !color && "text-muted-foreground")}
      style={color ? { color } : undefined}
    />
  );
}

function presetRange(p: Preset, today: Date): DateRange | undefined {
  switch (p) {
    case "Today":
      return { from: today, to: today };
    case "This week":
      return {
        from: startOfWeek(today, { weekStartsOn: 1 }),
        to: endOfWeek(today, { weekStartsOn: 1 }),
      };
    case "Next 7 days":
      return { from: today, to: addDays(today, 7) };
    case "This month":
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case "Overdue":
      return { from: subDays(today, 30), to: subDays(today, 1) };
    case "Timeless":
      return undefined;
  }
}

function TaskRow({
  task,
  showBoard,
  busy,
  onToggle,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  showBoard?: boolean;
  busy: boolean;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDuplicate: (task: Task) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
}) {
  const done = task.status === "done";
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm active:cursor-grabbing"
    >
      <GripVertical
        className="size-4 shrink-0 text-muted-foreground/40"
        aria-hidden
      />
      <BoardIcon slug={task.boardSlug} color={task.boardColor} />
      <span className={cn("flex-1 truncate font-medium", done && "opacity-50")}>
        {task.title}
      </span>
      {showBoard ? (
        <span
          className={cn(
            "shrink-0 text-xs text-muted-foreground",
            done && "opacity-50",
          )}
        >
          {task.board}
        </span>
      ) : null}
      {task.due ? (
        <span
          className={cn(
            "shrink-0 text-xs text-muted-foreground",
            done && "opacity-50",
          )}
        >
          {format(new Date(`${task.due}T00:00:00`), "MMM d")}
        </span>
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onDuplicate(task)}
        disabled={busy}
        aria-label={`Duplicate "${task.title}"`}
        title="Duplicate"
      >
        <Copy className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(task)}
        disabled={busy}
        aria-label={`Delete "${task.title}"`}
        title="Delete"
      >
        <Trash2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(
          "shrink-0 hover:text-foreground",
          done ? "text-primary" : "text-muted-foreground",
        )}
        onClick={() => onToggle(task)}
        disabled={busy}
        aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
        title={done ? "Reopen" : "Mark done"}
      >
        <Check className="size-4" strokeWidth={done ? 3 : 2} />
      </Button>
    </div>
  );
}

export function TaskCalendar({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [preset, setPreset] = React.useState<Preset | null>("Today");
  const [range, setRange] = React.useState<DateRange | undefined>(() =>
    presetRange("Today", new Date()),
  );
  const [month, setMonth] = React.useState<Date>(() => new Date());
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const [draft, setDraft] = React.useState("");
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);

  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.due) continue;
      const arr = map.get(t.due) ?? [];
      arr.push(t);
      map.set(t.due, arr);
    }
    return map;
  }, [tasks]);

  const todayKey = toKey(new Date());

  const shownTasks = React.useMemo(() => {
    if (preset === "Timeless") {
      return tasks
        .filter((t) => !t.due)
        .sort(
          (a, b) =>
            (a.priority ?? 3) - (b.priority ?? 3) ||
            a.title.localeCompare(b.title),
        );
    }
    if (preset === "Overdue") {
      return tasks
        .filter((t) => t.due && t.due < todayKey)
        .sort((a, b) => (a.due! < b.due! ? -1 : 1));
    }
    if (!range?.from || !range?.to) return [];
    const f = toKey(range.from);
    const t = toKey(range.to);
    return tasks
      .filter((x) => x.due && x.due >= f && x.due <= t)
      .sort((a, b) => (a.due! < b.due! ? -1 : 1));
  }, [tasks, range, preset, todayKey]);

  function applyPreset(p: Preset) {
    setPreset(p);
    const r = presetRange(p, new Date());
    setRange(r);
    setMonth(r?.from ?? new Date());
  }

  async function handleToggle(task: Task) {
    setPending((prev) => new Set(prev).add(task.id));
    try {
      if (task.status === "done") {
        await reopenTask(task.boardSlug, task.id);
      } else {
        await completeTask(task.boardSlug, task.id);
      }
      router.refresh();
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setFeedback(null);
    const res = await addTask(text);
    setSubmitting(false);
    if (res.ok) {
      const dueLabel = res.due
        ? ` · due ${format(new Date(`${res.due}T00:00:00`), "MMM d")}`
        : "";
      setFeedback(`Added "${res.title}" → ${res.board}${dueLabel}`);
      setDraft("");
      router.refresh();
      window.setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback(`Failed to add: ${res.error}`);
    }
  }

  async function handleDayDrop(date: Date, taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setDraggingTaskId(null);
    await setDueDate(task.boardSlug, task.id, toKey(date));
    router.refresh();
  }

  async function handleDropTimeless(e: React.DragEvent) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    setDraggingTaskId(null);
    await setDueDate(task.boardSlug, task.id, null);
    router.refresh();
  }

  async function handleDelete(task: Task) {
    setPending((prev) => new Set(prev).add(task.id));
    try {
      await deleteTask(task.boardSlug, task.id);
      router.refresh();
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  async function handleDuplicate(task: Task) {
    setPending((prev) => new Set(prev).add(task.id));
    try {
      await duplicateTask(task.boardSlug, task.title);
      router.refresh();
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }

  const heading =
    preset ?? (range?.from ? format(range.from, "MMMM d") : "Tasks");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="sr-only">cali</h1>
        <CaliLogo className="h-8 w-auto" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Your tasks, on a calendar.</p>
      </header>

      <div className="rounded-lg border border-border">
        <div className="flex max-sm:flex-col">
          {/* Preset rail */}
          <div className="relative border-border py-4 max-sm:order-1 max-sm:border-t sm:w-36">
            <div className="h-full border-border sm:border-e">
              <div className="flex flex-col gap-1 px-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p}
                    variant="ghost"
                    size="sm"
                    onClick={() => applyPreset(p)}
                    onDragOver={
                      p === "Timeless" && draggingTaskId
                        ? (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          }
                        : undefined
                    }
                    onDrop={
                      p === "Timeless" && draggingTaskId
                        ? handleDropTimeless
                        : undefined
                    }
                    className={cn(
                      "w-full justify-start",
                      preset === p && "bg-accent text-accent-foreground",
                      p === "Timeless" &&
                        draggingTaskId &&
                        "border border-dashed border-primary/30",
                    )}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 p-3">
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={range?.from ?? undefined}
              onSelect={(day) => {
                setPreset(null);
                setRange(day ? { from: day, to: day } : undefined);
              }}
              modifiers={{
                hasTasks: (date: Date) => tasksByDay.has(toKey(date)),
              }}
              showOutsideDays
              isDragActive={!!draggingTaskId}
              onDayDrop={handleDayDrop}
            />
          </div>
        </div>
      </div>

      {/* Add a task */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Add a task… (e.g. "school: MongoDB exercises due Friday")'
          className="h-9 w-full min-w-0 rounded-md border border-border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button type="submit" disabled={submitting || !draft.trim()}>
          Add
        </Button>
      </form>
      {feedback ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {feedback}
        </p>
      ) : null}

      {/* Task list for the active preset */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-medium">{heading}</h2>
          <span className="text-xs text-muted-foreground">
            {shownTasks.length} task{shownTasks.length === 1 ? "" : "s"}
          </span>
        </div>
        {shownTasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            {preset === "Timeless"
              ? "No timeless tasks."
              : preset
                ? "Nothing due in this window."
                : "No tasks on this day."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {shownTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                showBoard={preset === "Overdue" || preset === "Timeless"}
                busy={pending.has(t.id)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onDragStart={setDraggingTaskId}
                onDragEnd={() => setDraggingTaskId(null)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
