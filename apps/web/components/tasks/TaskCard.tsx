"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, AlertTriangle, CloudUpload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ClientInfo {
  id: string;
  full_name: string;
  business_name: string | null;
  plan_name: string | null;
}

export interface TaskData {
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

export function TaskCard({ task }: { task: TaskData }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusConfig = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending;
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.due_date < today && task.status !== "submitted" && task.status !== "approved";
  const canUpload = task.status !== "submitted" && task.status !== "approved";

  const handleCardClick = () => {
    router.push("/dashboard/tasks/" + task.id);
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      // Step 1: Upload file to Supabase Storage
      const supabase = createClient();
      const filePath = `deliverables/${task.client_id}/${task.id}/1/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("deliverables")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Step 2: Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("deliverables")
        .getPublicUrl(filePath);

      // Step 3: Submit deliverable to the API
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tasks/${task.id}/submit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size_bytes: file.size,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to submit deliverable");

      toast.success("Deliverable submitted!", {
        description: `${file.name} uploaded successfully.`,
      });

      // Refresh server data so the task status updates to "submitted"
      router.refresh();
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setIsUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      className={`border-l-4 ${isOverdue ? STATUS_CONFIG.overdue.border : statusConfig.border} transition-shadow hover:shadow-md cursor-pointer`}
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

          <div className="flex items-center gap-3 shrink-0">
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? "text-[var(--color-error)] font-medium" : "text-[var(--color-text-muted)]"}`}>
                {isOverdue && <AlertTriangle size={12} />}
                <Calendar size={12} />
                {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            )}

            {canUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,.pdf,.psd,.ai,.fig,.sketch"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-brand)]/30 bg-[var(--color-brand-light)] px-2.5 py-1 text-xs font-medium text-[var(--color-brand)] transition-colors hover:bg-[var(--color-brand)]/10 disabled:opacity-60 disabled:cursor-wait"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <CloudUpload size={12} />
                      Upload
                    </>
                  )}
                </button>
              </>
            )}

            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${isOverdue ? STATUS_CONFIG.overdue.color : statusConfig.color}`}>
              {isOverdue ? STATUS_CONFIG.overdue.label : statusConfig.label}
            </span>
          </div>
        </CardContent>
      </Card>
  );
}
