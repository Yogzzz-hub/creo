import { createClient } from "@/lib/supabase/server";
import { AlertTriangle } from "lucide-react";

interface MemberMetrics {
  team_member_id: string;
  name: string;
  role: string;
  active_tasks: number;
  overdue_tasks: number;
  today_completed: number;
  today_cap: number | null;
}

interface TeamOverviewResponse {
  members: MemberMetrics[];
}

async function getTeamOverview(): Promise<TeamOverviewResponse> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/team/overview`,
    { cache: "no-store", headers }
  );

  if (!res.ok) {
    return { members: [] };
  }
  return res.json();
}

function CapacityBar({ completed, cap }: { completed: number; cap: number }) {
  const percentage = cap > 0 ? Math.min((completed / cap) * 100, 100) : 0;
  const isFull = percentage >= 100;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all ${
            isFull ? "bg-[var(--color-error)]" : "bg-[var(--color-brand)]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${isFull ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]"}`}>
        {completed} / {cap}
      </span>
    </div>
  );
}

export default async function TeamOverviewPage() {
  const data = await getTeamOverview();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">
          Team Overview
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Per-member metrics and capacity tracking.
        </p>
      </div>

      {data.members.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
          <p className="text-sm text-[var(--color-text-muted)]">
            No team members found.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                  Role
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-text-muted)]">
                  Active Tasks
                </th>
                <th className="px-4 py-3 text-center font-medium text-[var(--color-text-muted)]">
                  Overdue
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-muted)]">
                  Capacity
                </th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => {
                const hasOverdue = member.overdue_tasks > 0;
                const isAtCapacity =
                  member.today_cap !== null &&
                  member.today_completed >= member.today_cap;

                return (
                  <tr
                    key={member.team_member_id}
                    className={`border-b border-[var(--color-border)] last:border-b-0 ${
                      hasOverdue
                        ? "bg-red-50/50"
                        : isAtCapacity
                          ? "bg-amber-50/50"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-[var(--color-brand-dark)]">
                        {member.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-[var(--color-brand-light)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-brand)]">
                        {member.role === "team_lead" ? "Team Lead" : "Team Member"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium text-[var(--color-brand-dark)]">
                        {member.active_tasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasOverdue ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--color-error)]">
                          <AlertTriangle size={14} />
                          {member.overdue_tasks}
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {member.today_cap !== null ? (
                        <CapacityBar
                          completed={member.today_completed}
                          cap={member.today_cap}
                        />
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">
                          N/A
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
