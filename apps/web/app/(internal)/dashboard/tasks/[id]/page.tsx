"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientInfo {
  id: string;
  full_name: string;
  business_name: string | null;
  plan_name: string | null;
}

interface TaskDetail {
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
  content_brief: string | null;
  ai_analysis_excerpt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: Clock },
  submitted: { label: "Submitted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  revision: { label: "Revision", color: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "Pro",
  2: "Growth",
  3: "Starter",
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const fetchTask = useCallback(async (taskId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${taskId}`, {
        headers,
      });

      if (!res.ok) throw new Error("Failed to load task");
      const data = await res.json();
      setTask(data);
    } catch {
      setError("Failed to load task details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => {
    params.then(({ id }) => fetchTask(id));
  });

  const handleStatusUpdate = async (newStatus: string) => {
    if (!task) return;
    setStatusUpdating(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${task.id}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setTask((prev) => prev ? { ...prev, status: updated.status } : prev);
    } catch {
      setError("Failed to update status.");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    setUploading(true);
    setUploadProgress("Uploading file...");
    setError(null);

    try {
      const supabase = createClient();
      const filePath = `deliverables/${task.client_id}/${task.id}/1/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("deliverables")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("deliverables")
        .getPublicUrl(filePath);

      setUploadProgress("Submitting deliverable...");

      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${task.id}/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          file_url: urlData.publicUrl,
          file_type: file.type,
          file_size_bytes: file.size,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit deliverable");

      setUploadProgress("Deliverable submitted successfully!");
      setTask((prev) => prev ? { ...prev, status: "submitted" } : prev);

      setTimeout(() => router.push("/dashboard/tasks"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress("");
    } finally {
      setUploading(false);
    }
  };

  const handlePublishToInstagram = async (deliverableId: string) => {
    setPublishing(true);
    setPublishSuccess(null);
    setError(null);

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/deliverables/${deliverableId}/publish-instagram`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ caption: "" }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Failed to publish to Instagram");
      }

      const data = await res.json();
      setPublishSuccess(
        `Published successfully! Post ID: ${data.instagram_post_id}`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to publish to Instagram"
      );
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-[var(--color-brand)]" />
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="p-6">
        <p className="text-sm text-[var(--color-error)]">{error}</p>
        <Button variant="ghost" onClick={() => router.push("/dashboard/tasks")} className="mt-4">
          <ArrowLeft size={16} className="mr-2" /> Back to Tasks
        </Button>
      </div>
    );
  }

  if (!task) return null;

  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/tasks")}
          className="gap-1.5"
        >
          <ArrowLeft size={16} /> Back
        </Button>
        <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">
          Task Detail
        </h1>
      </div>

      {error && (
        <div className="rounded-lg bg-[var(--color-error-light)] p-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} className="text-[var(--color-brand)]" />
                  {task.deliverable_type.charAt(0).toUpperCase() + task.deliverable_type.slice(1)}
                </CardTitle>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", statusConfig.color)}>
                  <StatusIcon size={12} />
                  {statusConfig.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.content_brief && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    Content Brief
                  </h4>
                  <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap">
                    {task.content_brief}
                  </p>
                </div>
              )}

              {task.ai_analysis_excerpt && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
                    AI Brand Analysis
                  </h4>
                  <div className="rounded-lg bg-[var(--color-brand-light)]/50 p-3">
                    <p className="text-xs leading-relaxed text-[var(--color-text)] italic">
                      {task.ai_analysis_excerpt}
                      {task.ai_analysis_excerpt.length >= 500 && "..."}
                    </p>
                  </div>
                </div>
              )}

              {!task.content_brief && !task.ai_analysis_excerpt && (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  No content brief or analysis available for this task.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Submit Deliverable</CardTitle>
            </CardHeader>
            <CardContent>
              {task.status === "submitted" || task.status === "approved" ? (
                <div className="flex items-center gap-2 rounded-lg bg-[var(--color-success-light)] p-3 text-sm text-[var(--color-success)]">
                  <CheckCircle size={16} />
                  This deliverable has already been submitted.
                </div>
              ) : (
                <div className="space-y-3">
                  <label
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
                      uploading
                        ? "border-[var(--color-brand)] bg-[var(--color-brand-light)]/30 cursor-wait"
                        : "border-[var(--color-border)] hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-light)]/20"
                    )}
                  >
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,video/*,.pdf,.psd,.ai,.fig,.sketch"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading ? (
                      <Loader2 size={32} className="animate-spin text-[var(--color-brand)] mb-2" />
                    ) : (
                      <Upload size={32} className="text-[var(--color-brand-mid)] mb-2" />
                    )}
                    <span className="text-sm font-medium text-[var(--color-text)]">
                      {uploading ? uploadProgress : "Click to upload or drag and drop"}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] mt-1">
                      Images, videos, PDFs, design files
                    </span>
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Client</p>
                <p className="text-sm font-medium text-[var(--color-brand-dark)]">
                  {task.client?.business_name || task.client?.full_name || "Unknown"}
                </p>
              </div>
              {task.client?.plan_name && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Plan</p>
                  <Badge variant="outline" className="mt-1">
                    {PRIORITY_LABELS[task.priority] || task.client.plan_name}
                  </Badge>
                </div>
              )}
              {task.due_date && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Due Date</p>
                  <p className="flex items-center gap-1.5 text-sm text-[var(--color-text)] mt-1">
                    <Calendar size={14} />
                    {new Date(task.due_date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {task.status === "pending" && (
                <Button
                  onClick={() => handleStatusUpdate("in_progress")}
                  disabled={statusUpdating}
                  className="w-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
                >
                  {statusUpdating ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <Clock size={16} className="mr-2" />
                  )}
                  Mark as In Progress
                </Button>
              )}
              {task.status === "revision" && (
                <Button
                  onClick={() => handleStatusUpdate("in_progress")}
                  disabled={statusUpdating}
                  className="w-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
                >
                  {statusUpdating ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <Clock size={16} className="mr-2" />
                  )}
                  Start Revision
                </Button>
              )}
              {task.status === "approved" && (
                <div className="space-y-2">
                  {publishSuccess && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                      {publishSuccess}
                    </div>
                  )}
                  <Button
                    onClick={() => handlePublishToInstagram(task.id)}
                    disabled={publishing}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:from-purple-700 hover:to-pink-600"
                  >
                    {publishing ? (
                      <Loader2 size={16} className="animate-spin mr-2" />
                    ) : (
                      <Share2 size={16} className="mr-2" />
                    )}
                    {publishing ? "Publishing..." : "Publish to Instagram"}
                  </Button>
                </div>
              )}
              {task.status === "submitted" && (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-2">
                  No actions available for this status.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
