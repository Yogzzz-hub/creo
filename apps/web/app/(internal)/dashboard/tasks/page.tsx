import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, AlertTriangle, Inbox } from "lucide-react";
import { UnassignedTasksTab } from "@/components/unassigned-tasks-tab";

interface ClientInfo {
  id: string;
  full_name: string;
  business_name: string | null;
  plan_name: string | null;
}

interface TaskData {
  id: string;
  client_id: string;
  client: ClientInfo | null;
  deliverable_type: string;
  status: string;
  priority: number;
  is_addon: boolean;
  assignment_date: string | null;
  due_date: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-700", border: "border-l-gray-400" },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", border: "border-l-blue-500" },
  submitted: { label: "Submitted", color: "bg-green-100 text-green-700", border: "border-l-green-500" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" },
  revision: { label: "Revision", color: "bg-amber-100 text-amber-700", border: "border-l-amber-500" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", border: "border-l-red-500" },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Pro",
  2: "Growth",
  3: "Starter",
};

function TaskCard({ task }: { task: TaskData }) {
  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.due_date < today && task.status !== "submitted" && task.status !== "approved";

  return (
    <Link href={`/dashboard/tasks/${task.id}`}>
      <Card className={`border-l-4 ${isOverdue ? STATUS_CONFIG.overdue.border : statusConfig.border} transition-shadow hover:shadow-md cursor-pointer`}>
        <CardContent className="flex items-center justify-between py-4 px-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-brand-light)] shrink-0">
              <FileText size={18} className="text-[var(--color-brand)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[var(--color-brand-dark)] truncate">
                  {task.deliverable_type.charAt(0).toUpperCase() + task.deliverable_type.slice(1)}
                </h3>
                {task.is_addon && (
                  <Badge variant="outline" className="text-[10px] border-[var(--color-accent)] text-[var(--color-accent)]">
                    Add-on
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
                {task.client?.business_name || task.client?.full_name || "Unknown Client"}
                {task.client?.plan_name && (
                  <span className="ml-2 text-[var(--color-brand-mid)]">
                    ({PRIORITY_LABELS[task.priority] || `P${task.priority}`})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-[var(--color-error)] font-medium" : "text-[var(--color-text-muted)]"}`}>
                {isOverdue && <AlertTriangle size={12} />}
                <Calendar size={12} />
                {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            )}
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isOverdue ? STATUS_CONFIG.overdue.color : statusConfig.color}`}>
              {isOverdue ? STATUS_CONFIG.overdue.label : statusConfig.label}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

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

export default async function TasksPage() {
  const tasks = await getTasks();

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(
    (t) => t.due_date === today || (t.assignment_date === today && t.status !== "submitted" && t.status !== "approved")
  );
  const upcomingTasks = tasks.filter(
    (t) => t.due_date && t.due_date > today && t.status !== "submitted" && t.status !== "approved"
  );
  const activeTasks = tasks.filter(
    (t) => t.status !== "submitted" && t.status !== "approved"
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">My Tasks</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {tasks.length} total task{tasks.length !== 1 ? "s" : ""} assigned to you.
        </p>
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
