"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, AlertTriangle, Calendar, Loader2 } from "lucide-react";

interface TaskData {
  id: string;
  client_id: string;
  client: {
    id: string;
    full_name: string;
    business_name: string | null;
    plan_name: string | null;
  } | null;
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
  assignment_requested: { label: "Requested", color: "bg-purple-100 text-purple-700", border: "border-l-purple-500" },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Pro",
  2: "Growth",
  3: "Starter",
};

export function UnassignedTasksTab() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const fetchUnassigned = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/pending`, {
        cache: "no-store",
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      console.error("Failed to fetch unassigned tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnassigned();
  }, [fetchUnassigned]);

  const handleRequestAssignment = async (taskId: string) => {
    setRequestingId(taskId);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${taskId}/request-assignment`,
        { method: "POST", headers }
      );

      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      console.error("Failed to request assignment");
    } finally {
      setRequestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-text-muted)]">
          No unassigned tasks available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card
          key={task.id}
          className={`border-l-4 ${STATUS_CONFIG.pending.border} transition-shadow hover:shadow-md`}
        >
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
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                  <Calendar size={12} />
                  {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
              )}
              <Button
                size="sm"
                onClick={() => handleRequestAssignment(task.id)}
                disabled={requestingId === task.id}
                className="bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
              >
                {requestingId === task.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Request Assignment"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
