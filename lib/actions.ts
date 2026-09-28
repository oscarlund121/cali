"use server";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { revalidatePath } from "next/cache";

import { parseTaskInput } from "@/lib/parse-task";

const execFileAsync = promisify(execFile);
const HERMES = "/Users/ola/Library/Python/3.11/bin/hermes";
const PYTHON = "/opt/homebrew/bin/python3.11";
const REOPEN_SCRIPT = "/Users/ola/.hermes/scripts/kanban_reopen.py";
const SET_DUE_SCRIPT = "/Users/ola/.hermes/scripts/kanban_set_due.py";

export type AddTaskResult = {
  ok: boolean;
  title?: string;
  due?: string | null;
  board?: string;
  priority?: number;
  error?: string;
};

export async function addTask(input: string): Promise<AddTaskResult> {
  const parsed = parseTaskInput(input);
  const args = ["kanban", "--board", parsed.board, "create", parsed.title];
  if (parsed.due) args.push("--body", `due: ${parsed.due}`);
  args.push("--priority", String(parsed.priority));
  try {
    await execFileAsync(HERMES, args, { timeout: 30_000 });
    revalidatePath("/");
    return {
      ok: true,
      title: parsed.title,
      due: parsed.due,
      board: parsed.board,
      priority: parsed.priority,
    };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function completeTask(
  boardSlug: string,
  taskId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync(
      HERMES,
      ["kanban", "--board", boardSlug, "complete", taskId],
      { timeout: 30_000 },
    );
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function reopenTask(
  boardSlug: string,
  taskId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync(PYTHON, [REOPEN_SCRIPT, boardSlug, taskId], {
      timeout: 30_000,
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function setDueDate(
  boardSlug: string,
  taskId: string,
  due: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync(PYTHON, [SET_DUE_SCRIPT, boardSlug, taskId, due ?? ""], {
      timeout: 30_000,
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function deleteTask(
  boardSlug: string,
  taskId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync(
      HERMES,
      ["kanban", "--board", boardSlug, "archive", taskId],
      { timeout: 30_000 },
    );
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function duplicateTask(
  boardSlug: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await execFileAsync(
      HERMES,
      ["kanban", "--board", boardSlug, "create", title],
      { timeout: 30_000 },
    );
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
