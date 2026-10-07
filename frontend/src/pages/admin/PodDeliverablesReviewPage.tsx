import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { useAuth } from "../../lib/auth-context";
import { qaApproveDeliverable, qaRejectDeliverable } from "../../lib/deliverables-api";
import { fetchPodDashboard, type PodDashboardData, type PodTask } from "../../lib/ops-api";

const FORMAT_LABELS: Record<string, string> = {
  reel: "Reel",
  static_post: "Poster",
  carousel: "Carousel",
  story: "Story",
  shoot_day: "Shoot day",
};

const RUBRIC = [
  "Brand contrast, palette & typography match the Brand DNA",
  "Format, safe zones and export settings are correct",
  "Copy, audio and pacing are client-ready",
];

function titleOf(task: PodTask): string {
  return task.blueprint?.concept_name || `${task.client_name} ${FORMAT_LABELS[task.deliverable_type] || "asset"}`;
}

export function PodDeliverablesReviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checks, setChecks] = useState<boolean[]>(RUBRIC.map(() => false));
  const [feedbackNote, setFeedbackNote] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 30_000,
    enabled: !!user?.id,
  });

  const podName = data?.pod?.name || "Pod";
  const queue = useMemo(
    () => (data?.tasks?.internal_qa || []).filter((t) => t.deliverable?.status === "pending_qa"),
    [data],
  );
  const withClient = data?.tasks?.client_review?.length || 0;
  const inRevision = (data?.tasks?.in_production || []).filter(
    (t) => t.deliverable?.status === "qa_rejected" || t.deliverable?.status === "revision_requested",
  ).length;
  const current = queue.find((t) => t.id === selectedId) ?? queue[0];

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the checklist for each newly selected item
  useEffect(() => {
    setChecks(RUBRIC.map(() => false));
    setFeedbackNote("");
  }, [current?.deliverable?.id]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const qaMutation = useMutation({
    mutationFn: ({ deliverableId, approve, notes }: { deliverableId: string; approve: boolean; notes: string }) =>
      approve ? qaApproveDeliverable(deliverableId, notes) : qaRejectDeliverable(deliverableId, notes),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
      setSelectedId(null);
      showToast(
        vars.approve
          ? "Approved — the client has been notified to review it."
          : "Sent back to the creative with your notes.",
      );
    },
    onError: (err: Error) => showToast(err.message || "Could not save the QA decision.", "error"),
  });

  const handleExportReviewLedger = () => {
    const headers = ["Task ID", "Title", "Client", "Format", "Specialist", "Version", "Status"];
    const rows = [
      ...queue.map((t) => [t.id, titleOf(t), t.client_name, t.deliverable_type, t.assignee_name, `v${t.deliverable?.version ?? 1}`, "Pending lead QA"]),
      ...(data?.tasks?.client_review || []).map((t) => [t.id, titleOf(t), t.client_name, t.deliverable_type, t.assignee_name, `v${t.deliverable?.version ?? 1}`, "With client"]),
      ...(data?.tasks?.ready_to_publish || []).map((t) => [t.id, titleOf(t), t.client_name, t.deliverable_type, t.assignee_name, `v${t.deliverable?.version ?? 1}`, "Client approved"]),
    ];
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${podName.replace(/\s+/g, "_")}_QA_Ledger_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const allChecked = checks.every(Boolean);
  const deliverable = current?.deliverable;

  return (
    <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-white font-sans flex flex-col">
      <AdminTopHeader title="Content Engine" activeTab="Content Engine" />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-3.5 pb-20 sm:pb-6 space-y-3.5 sm:space-y-4">
        {toastMessage && (
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between shadow-lg ${
              toastMessage.type === "error" ? "bg-rose-950/80 border-rose-800 text-rose-300" : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100" aria-label="Dismiss">&times;</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#161F2D] p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-[#2A3446]/80">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#7FA0D6] animate-pulse" />
            <span className="text-xs font-bold text-[#F1F5F9]">{podName} · Lead QA before anything reaches the client</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`size-3.5 text-[#97A0B3] ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleExportReviewLedger}
              className="px-3 py-1.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold flex items-center gap-1.5"
            >
              <FileText className="size-3.5 text-[#97A0B3]" /> Export ledger
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
          {[
            { label: "Pending lead sign-off", value: queue.length, note: `${queue.filter((t) => t.is_near_sla).length} due within 24h`, icon: FileCheck2 },
            { label: "With the client", value: withClient, note: "awaiting client approval", icon: Users },
            { label: "Revisions in progress", value: inRevision, note: "returned by QA or the client", icon: AlertTriangle },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * (i + 1) }}
              className="bg-[#161F2D] rounded-xl sm:rounded-2xl p-3 border border-[#2A3446]/80"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#97A0B3]">{card.label}</span>
                <card.icon className="size-3.5 text-[#7FA0D6]" />
              </div>
              <div className="text-xl font-black text-white">{card.value}</div>
              <div className="text-[11px] text-[#97A0B3] mt-1">{card.note}</div>
            </motion.div>
          ))}
        </div>

        {isError && (
          <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300">
            {(error as Error)?.message || "Could not load the QA queue."}{" "}
            <button className="underline" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-[#97A0B3]">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !current || !deliverable ? (
          <div className="bg-[#161F2D] rounded-2xl border border-dashed border-[#2A3446] p-12 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <Check className="size-6" />
            </div>
            <h3 className="text-base font-black text-white">Nothing waiting for QA</h3>
            <p className="text-xs text-[#97A0B3] max-w-md mx-auto">
              When a creative uploads a finished file it appears here. Approving sends it to the client's review queue; requesting a revision sends your notes back to the creative.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Queue */}
            <div className="lg:col-span-3 bg-[#161F2D] rounded-2xl border border-[#2A3446]/80 p-3 space-y-2 max-h-[360px] lg:max-h-[calc(100vh-300px)] overflow-y-auto">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3] px-1">Queue · {queue.length}</h2>
              {queue.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedId(task.id)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-colors ${
                    task.id === current.id ? "border-[#7FA0D6]/50 bg-[#0B111C]" : "border-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="size-12 rounded-lg overflow-hidden bg-black shrink-0 border border-[#2A3446]">
                    <DeliverableMedia
                      url={task.deliverable?.file_url}
                      isVideo={!!task.deliverable?.is_video}
                      title={titleOf(task)}
                      controls={false}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{titleOf(task)}</div>
                    <div className="text-[10px] text-[#97A0B3] truncate">
                      {task.client_name} · v{task.deliverable?.version ?? 1}
                      {task.is_revision ? " · revision" : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Review panel */}
            <div className="lg:col-span-9 bg-[#161F2D] rounded-2xl border border-[#2A3446]/80 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#2A3446] gap-2">
                <div>
                  <div className="text-xs font-bold text-[#97A0B3] mb-0.5">
                    <span className="text-[#7FA0D6] font-black">{current.client_name}</span> · {FORMAT_LABELS[current.deliverable_type] || current.deliverable_type} · v{deliverable.version}
                  </div>
                  <h3 className="text-base font-black text-white">{titleOf(current)}</h3>
                  <p className="text-[11px] text-[#97A0B3] mt-0.5">
                    Creative: <span className="font-bold text-white">{current.assignee_name}</span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 self-start sm:self-auto">
                  <Clock className="size-3" /> Pending QA sign-off
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-5 space-y-2">
                  <div
                    className={`w-full mx-auto bg-black rounded-2xl overflow-hidden border border-slate-800 ${
                      deliverable.is_video || current.deliverable_type === "story" ? "aspect-[9/16] max-w-[300px]" : "aspect-[4/5] max-w-[360px]"
                    }`}
                  >
                    <DeliverableMedia url={deliverable.file_url} isVideo={deliverable.is_video} title={titleOf(current)} className="w-full h-full" />
                  </div>
                  {deliverable.file_url && (
                    <a
                      href={deliverable.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-[#7FA0D6] hover:text-white"
                    >
                      <Download className="size-3.5" /> Open original file
                    </a>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-4">
                  {current.blueprint?.brief && (
                    <div className="bg-[#0B111C] rounded-2xl p-3.5 border border-[#2A3446] text-xs text-[#F1F5F9]">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1">Brief</span>
                      {current.blueprint.brief}
                    </div>
                  )}

                  <fieldset className="space-y-2">
                    <legend className="text-[11px] font-black uppercase tracking-wider text-[#97A0B3] mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> Lead QA checklist
                    </legend>
                    {RUBRIC.map((label, i) => (
                      <label
                        key={label}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          checks[i] ? "bg-[#161F2D] border-[#7FA0D6]/50 text-white" : "bg-[#0B111C] border-[#2A3446] text-[#97A0B3]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checks[i]}
                          onChange={(e) => setChecks((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                          className="size-4"
                        />
                        <span className="text-xs font-bold">{label}</span>
                      </label>
                    ))}
                  </fieldset>

                  <div>
                    <label htmlFor="qa-notes" className="sr-only">Notes for the creative</label>
                    <textarea
                      id="qa-notes"
                      rows={3}
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder={`Revision notes for ${current.assignee_name} (required to send back)`}
                      className="w-full text-xs p-3.5 rounded-2xl border border-[#2A3446] bg-[#0B111C]/50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-white"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                    <button
                      onClick={() => qaMutation.mutate({ deliverableId: deliverable.id, approve: false, notes: feedbackNote.trim() })}
                      disabled={qaMutation.isPending || !feedbackNote.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#161F2D] border border-[#2A3446] hover:bg-[#0B111C] text-[#F1F5F9] text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request revision
                    </button>
                    <button
                      onClick={() => qaMutation.mutate({ deliverableId: deliverable.id, approve: true, notes: feedbackNote.trim() })}
                      disabled={qaMutation.isPending || !allChecked}
                      title={allChecked ? undefined : "Complete the checklist to approve"}
                      className="px-6 py-2.5 rounded-xl bg-[#7FA0D6] hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {qaMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Approve & send to client
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
