import { getTasks } from "@/lib/tasks";
import { TaskCalendar } from "@/components/task-calendar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tasks = await getTasks();
  return <TaskCalendar tasks={tasks} />;
}
