import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

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

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { daily_metrics, active_tasks_count, overdue_tasks_count } = data;

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
        <CardHeader>
          <CardTitle>Today&apos;s Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">
              Tasks will appear here once assigned.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
