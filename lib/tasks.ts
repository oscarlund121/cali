import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const HERMES = "/Users/ola/Library/Python/3.11/bin/hermes";

export type Task = {
  id: string;
  title: string;
  board: string;
  priority: number | null;
  due: string | null; // yyyy-MM-dd
  status: string;
  boardSlug: string;
  boardColor: string;
};

const DUE_RE = /\b(?:due|deadline|frist)\s*:?\s*(\d{4}-\d{2}-\d{2})/i;

async function hermes(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(HERMES, args, { timeout: 30_000 });
    return stdout;
  } catch {
    return "";
  }
}

export async function getTasks(): Promise<Task[]> {
  const boardsOut = await hermes(["kanban", "boards", "list", "--json"]);
  let boards: {
    slug: string;
    name: string;
    icon: string;
    color: string;
    archived: boolean;
  }[] = [];
  try {
    boards = (JSON.parse(boardsOut) as { archived?: boolean }[]).filter(
      (b) => !b.archived,
    ) as typeof boards;
  } catch {
    return [];
  }

  const tasks: Task[] = [];
  for (const b of boards) {
    const slug = b.slug;
    const color = b.color || "";
    const name = b.name || slug;
    const out = await hermes(["kanban", "--board", slug, "list", "--json"]);
    let list: {
      id: string;
      title: string;
      body: string | null;
      priority: number | null;
      status: string;
    }[] = [];
    try {
      list = JSON.parse(out);
    } catch {
      continue;
    }
    for (const t of list) {
      if (t.status === "archived") continue;
      const m = t.body ? DUE_RE.exec(t.body) : null;
      tasks.push({
        id: t.id,
        title: t.title,
        board: name,
        priority: t.priority ?? null,
        due: m ? m[1] : null,
        status: t.status,
        boardSlug: slug,
        boardColor: color,
      });
    }
  }
  return tasks;
}
