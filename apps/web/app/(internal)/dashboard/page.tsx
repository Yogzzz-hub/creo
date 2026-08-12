import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Clock, FileText, ArrowRight } from "lucide-react";

interface DailyMetrics {
  posters_completed: number;
  posters_cap: number;
  reels_completed: number;
  reels_cap: number;
  stories_completed: number;
  stories_cap: number;
}

interface TeamDashboardData {
  daily_metrics: DailyMetrics;
  active_tasks_count: number;
  overdue_tasks_count: number;
  pending_leave_requests: boolean;
}

interface TaskItem {
  id: string;
  deliverable_type: string;
  status: string;
  due_date: string | null;
  client?: {
    full_name?: string;
    business_name?: string | null;
  } | null;
}

async function getDashboardData(): Promise<TeamDashboardData> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/team`,
    { cache: "no-store", headers }
  );

  if (!res.ok) {
    return {
      daily_metrics: {
        posters_completed: 0,
        posters_cap: 0,
        reels_completed: 0,
        reels_cap: 0,
        stories_completed: 0,
        stories_cap: 0,
      },
      active_tasks_count: 0,
      overdue_tasks_count: 0,
      pending_leave_requests: false,
    };
  }
  return res.json();
}

async function getAssignedTasks(): Promise<TaskItem[]> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

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

function ProgressMetric({
  label,
  completed,
  cap,
}: {
  label: string;
  completed: number;
  cap: number;
}) {
  const percentage = cap > 0 ? Math.min((completed / cap) * 100, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        <span className="text-[var(--color-text-muted)]">
          {completed} / {cap}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-brand-light)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  submitted: { label: "Submitted", className: "bg-green-100 text-green-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  revision: { label: "Revision", className: "bg-amber-100 text-amber-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
};

export default async function DashboardPage() {
  const [data, tasks] = await Promise.all([
    getDashboardData(),
    getAssignedTasks(),
  ]);
  const { daily_metrics, active_tasks_count, overdue_tasks_count } = data;

  const today = new Date().toISOString().split("T")[0];
  const activeOrTodayTasks = tasks.filter(
    (t) => t.status !== "approved" && t.status !== "submitted"
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">
          My Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Here&apos;s your progress for today.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daily Goal Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProgressMetric
            label="Posters today"
            completed={daily_metrics.posters_completed}
            cap={daily_metrics.posters_cap}
          />
          <ProgressMetric
            label="Reels today"
            completed={daily_metrics.reels_completed}
            cap={daily_metrics.reels_cap}
          />
          <ProgressMetric
            label="Stories today"
            completed={daily_metrics.stories_completed}
            cap={daily_metrics.stories_cap}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-brand-light)]">
              <Clock size={22} className="text-[var(--color-brand)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-brand-dark)]">
                {active_tasks_count}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Active Tasks
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-lg",
                overdue_tasks_count > 0
                  ? "bg-[var(--color-error-light)]"
                  : "bg-[var(--color-success-light)]"
              )}
            >
              {overdue_tasks_count > 0 ? (
                <AlertTriangle size={22} className="text-[var(--color-error)]" />
              ) : (
                <CheckCircle size={22} className="text-[var(--color-success)]" />
              )}
            </div>
            <div>
              <p
                className={cn(
                  "text-2xl font-bold",
                  overdue_tasks_count > 0
                    ? "text-[var(--color-error)]"
                    : "text-[var(--color-brand-dark)]"
                )}
              >
                {overdue_tasks_count}
              </p>
              <p className="text-sm text-[var(--color-text-muted)]">
                Overdue Tasks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Today&apos;s Tasks</CardTitle>
          <Link
            href="/dashboard/tasks"
            className="flex items-center gap-1 text-xs font-medium text-[var(--color-brand)] hover:underline"
          >
            View All Tasks <ArrowRight size={12} />
          </Link>
        </CardHeader>
        <CardContent>
          {activeOrTodayTasks.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
              <p className="text-sm text-[var(--color-text-muted)]">
                No active tasks assigned to you.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrTodayTasks.slice(0, 5).map((task) => {
                const badge = STATUS_BADGES[task.status] || STATUS_BADGES.pending;
                return (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg border p-3.5 transition-colors hover:bg-[var(--color-brand-light)]/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-light)]">
                        <FileText size={16} className="text-[var(--color-brand)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-brand-dark)]">
                          {task.deliverable_type.charAt(0).toUpperCase() + task.deliverable_type.slice(1)}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {task.client?.business_name || task.client?.full_name || "Assigned Client"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                      <ArrowRight size={14} className="text-[var(--color-text-muted)]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
