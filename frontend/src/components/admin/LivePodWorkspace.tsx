import { resolveAssetUrl, uploadTaskDeliverable } from "../../lib/media";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import {
  fetchPodDashboard,
  submitPodQAReview,
  reassignPodTask,
  type PodTask,
} from "../../lib/ops-api";
import { AdminTopHeader } from "./AdminTopHeader";

export function LivePodWorkspace({
  title,
  view = "tasks",
  personal = false,
}: { title: string; view?: "tasks" | "overview" | "clients" | "qa"; personal?: boolean }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [pod, setPod] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<PodTask | null>(null);
  const [comment, setComment] = useState("");
  const query = useQuery({
    queryKey: ["pod_dashboard", user?.id, pod || undefined],
    queryFn: () => fetchPodDashboard(pod || undefined),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const data = query.data;
  const canReview = ["team_lead", "admin", "super_admin"].includes(user?.role || "");
  const allTasks = data ? Object.values(data.tasks).flat() : [];
  const scoped = personal ? allTasks.filter((t) => t.assigned_to === user?.id) : allTasks;
  const tasks = scoped.filter(
    (t) =>
      (view !== "qa" || t.status === "internal_qa") &&
      `${t.client_name} ${t.deliverable_type} ${t.blueprint?.concept_name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function act(id: string, action: () => Promise<unknown>) {
    setBusy(id);
    setMessage("");
    try {
      await action();
      await cache.invalidateQueries({ queryKey: ["pod_dashboard"] });
      setReview(null);
      setComment("");
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save. Please retry.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white">
      <AdminTopHeader title={title} />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">{title}</h1>
          {data && <span>{data.pod.name}</span>}
          {!!data?.available_pods?.length && !personal && (
            <select
              aria-label="Select pod"
              value={pod}
              onChange={(e) => setPod(e.target.value)}
              className="bg-[#161F2D] p-2 rounded"
            >
              <option value="">Assigned pod</option>
              {data.available_pods.map((p) => (
                <option key={p.id} value={p.key}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <button className="underline" onClick={() => void query.refetch()}>
            Refresh
          </button>
        </div>
        {query.isPending && <p role="status">Loading workspace…</p>}
        {query.isError && (
          <p role="alert">
            {query.error.message}{" "}
            <button className="underline" onClick={() => void query.refetch()}>
              Retry
            </button>
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {data && (
          <>
            {view === "overview" && (
              <section className="grid sm:grid-cols-3 gap-4">
                {[
                  ["Assigned tasks", scoped.length],
                  ["Internal QA", scoped.filter((t) => t.status === "internal_qa").length],
                  ["Completed tasks", scoped.filter((t) => t.status === "completed").length],
                ].map(([label, count]) => (
                  <div key={label} className="p-5 bg-[#161F2D] rounded-xl">
                    <p>{label}</p>
                    <strong className="text-2xl">{count}</strong>
                  </div>
                ))}
              </section>
            )}
            {view === "clients" ? (
              <section className="grid md:grid-cols-2 gap-4">
                {data.clients.length === 0 && <p>No clients assigned to this pod.</p>}
                {data.clients.map((c) => (
                  <article key={c.id} className="p-5 rounded-xl bg-[#161F2D] space-y-2">
                    <h2 className="font-bold">{c.name || c.email}</h2>
                    <p>{c.email}</p>
                    {c.brand_summary && <p>{c.brand_summary}</p>}
                    <p>{allTasks.filter((t) => t.client_id === c.id).length} tasks</p>
                    <p>
                      {
                        allTasks.filter((t) => t.client_id === c.id && t.status === "client_review")
                          .length
                      }{" "}
                      awaiting client review
                    </p>
                  </article>
                ))}
              </section>
            ) : (
              <>
                <input
                  aria-label="Search tasks"
                  placeholder="Search client, format or task"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-3 bg-[#161F2D] rounded-xl"
                />
                {tasks.length === 0 && (
                  <p>No {view === "qa" ? "deliverables awaiting QA" : "tasks"} found.</p>
                )}
                <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tasks.map((t) => (
                    <article
                      key={t.id}
                      className="p-5 rounded-xl bg-[#161F2D] border border-[#2A3446] space-y-3"
                    >
                      <h2 className="font-bold">
                        {t.blueprint?.concept_name || t.deliverable_type.replaceAll("_", " ")}
                      </h2>
                      <p>{t.client_name}</p>
                      <p>Format: {t.deliverable_type.replaceAll("_", " ")}</p>
                      <p>Status: {t.status.replaceAll("_", " ")}</p>
                      <p>Assigned to: {t.assignee?.full_name || t.assignee_name || "Unassigned"}</p>
                      <p>
                        Due:{" "}
                        {t.due_date ? new Date(t.due_date).toLocaleDateString() : "Not scheduled"}
                      </p>
                      {t.sla_due_at && (
                        <p>SLA deadline: {new Date(t.sla_due_at).toLocaleString()}</p>
                      )}
                      {t.deliverable?.rejection_comment && (
                        <p>Feedback: {t.deliverable.rejection_comment}</p>
                      )}
                      {t.deliverable?.file_url && (
                        <a
                          className="underline"
                          href={resolveAssetUrl(t.deliverable.file_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open uploaded asset
                        </a>
                      )}
                      {t.assigned_to === user?.id &&
                        !["completed", "ready_to_publish", "client_review", "internal_qa"].includes(
                          t.status,
                        ) && (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const file = new FormData(e.currentTarget).get("file") as File;
                              if (file?.size) void act(t.id, () => uploadTaskDeliverable(t, file));
                            }}
                            className="space-y-2"
                          >
                            <input
                              type="file"
                              name="file"
                              aria-label={`Upload asset for ${t.id}`}
                              accept="video/mp4,video/quicktime,image/png,image/jpeg,image/webp"
                              required
                            />
                            <button disabled={!!busy} className="block">
                              Upload for QA
                            </button>
                          </form>
                        )}
                      {canReview && t.status === "internal_qa" && (
                        <button
                          disabled={!!busy}
                          className="block px-4 py-2 rounded bg-blue-600"
                          onClick={() => {
                            setReview(t);
                            setComment("");
                          }}
                        >
                          Review deliverable
                        </button>
                      )}
                      {canReview && (
                        <select
                          aria-label={`Assign ${t.id}`}
                          disabled={!!busy}
                          value={t.assigned_to || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) void act(t.id, () => reassignPodTask(t.id, value));
                          }}
                          className="w-full bg-[#0B111C] p-2 rounded"
                        >
                          <option value="" disabled>
                            Unassigned
                          </option>
                          {data.members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.full_name || m.name || m.email}
                            </option>
                          ))}
                        </select>
                      )}
                    </article>
                  ))}
                </section>
              </>
            )}
            {view === "overview" && (
              <section className="p-5 bg-[#161F2D] rounded-xl">
                <h2 className="font-bold mb-3">Assigned team</h2>
                {data.members.length === 0 && <p>No team members assigned.</p>}
                {data.members.map((m) => (
                  <p key={m.id}>
                    {m.full_name || m.name || m.email} · {m.role.replaceAll("_", " ")} ·{" "}
                    {m.active_wip ?? m.tasks_count ?? 0} active tasks
                  </p>
                ))}
              </section>
            )}
          </>
        )}
        {review && (
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Review deliverable"
            className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-[#161F2D] p-6 rounded-xl w-full max-w-lg space-y-4">
              <h2>
                Review {review.deliverable_type.replaceAll("_", " ")} for {review.client_name}
              </h2>
              <textarea
                aria-label="Review feedback"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#0B111C] p-3 rounded"
                placeholder="Feedback (required for rejection)"
              />
              <div className="flex gap-3">
                <button
                  disabled={!!busy}
                  onClick={() =>
                    void act(review.id, () => submitPodQAReview(review.id, "approve", comment))
                  }
                >
                  Approve QA
                </button>
                <button
                  disabled={!!busy || !comment.trim()}
                  onClick={() =>
                    void act(review.id, () => submitPodQAReview(review.id, "reject", comment))
                  }
                >
                  Request revision
                </button>
                <button disabled={!!busy} onClick={() => setReview(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
