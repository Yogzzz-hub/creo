import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox } from "lucide-react";
import { UnassignedTasksTab } from "@/components/unassigned-tasks-tab";
import { TaskCard, type TaskData } from "@/components/tasks/TaskCard";
import { TaskSort } from "@/components/tasks/TaskSort";

async function getTasks(): Promise<TaskData[]> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks`, {
    cache: "no-store",
    headers,
  });

  if (!res.ok) return [];
  return res.json();
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const tasks = await getTasks();

  const today = new Date().toISOString().split("T")[0];

  const sortedTasks = [...tasks];

  // Apply priority sorting when ?sort=priority is in the URL
  if (sort === "priority") {
    sortedTasks.sort((a, b) => a.priority - b.priority);
  } else {
    // Default: sort by due date ascending (nulls last)
    sortedTasks.sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  }

  const todayTasks = sortedTasks.filter(
    (t) => t.due_date === today || (t.assignment_date === today && t.status !== "submitted" && t.status !== "approved")
  );
  const upcomingTasks = sortedTasks.filter(
    (t) => t.due_date && t.due_date > today && t.status !== "submitted" && t.status !== "approved"
  );
  const activeTasks = sortedTasks.filter(
    (t) => t.status !== "submitted" && t.status !== "approved"
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">My Tasks</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {tasks.length} total task{tasks.length !== 1 ? "s" : ""} assigned to you.
          </p>
        </div>
        <TaskSort />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All Tasks
            <span className="ml-1.5 rounded-full bg-[var(--color-brand-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand)]">
              {activeTasks.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="today">
            Today
            {todayTasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-accent)]">
                {todayTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingTasks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--color-brand-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand)]">
                {upcomingTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="queue">
            <Inbox size={14} className="mr-1" />
            Open Queue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {activeTasks.length === 0 ? (
            <EmptyState message="No tasks assigned to you." />
          ) : (
            activeTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>

        <TabsContent value="today" className="mt-4 space-y-3">
          {todayTasks.length === 0 ? (
            <EmptyState message="No tasks due today." />
          ) : (
            todayTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcomingTasks.length === 0 ? (
            <EmptyState message="No upcoming tasks." />
          ) : (
            upcomingTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <UnassignedTasksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}
