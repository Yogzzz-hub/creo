import { CreoInlineLoader } from "../../components/ui/CreoLoader";
import { useEffect, useMemo, useState } from "react";
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
  History,
  Volume2,
} from "lucide-react";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { DeliverableMedia } from "../../components/ops/DeliverableMedia";
import { PublishingControl } from "../../components/ops/PublishingPanel";
import { DeliverableHistoryModal } from "../../components/portal/DeliverableHistoryModal";
import { VoicePlayer } from "../../components/portal/VoicePlayer";
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
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  // Hide decided uploads at once; the refetch that removes them can lag a moment.
  const [decided, setDecided] = useState<Set<string>>(() => new Set());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<PodDashboardData>({
    queryKey: ["pod_dashboard", user?.id, undefined],
    queryFn: () => fetchPodDashboard(),
    staleTime: 10_000,
    refetchInterval: 15_000,
    enabled: !!user?.id,
  });

  const podName = data?.pod?.name || "Pod";
  const queue = useMemo(
    () =>
      (data?.tasks?.internal_qa || []).filter(
        (t) => t.deliverable?.status === "pending_qa" && !decided.has(t.deliverable.id),
      ),
    [data, decided],
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
      setDecided((prev) => new Set(prev).add(vars.deliverableId));
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
    <div data-surface="ops" className="min-h-screen bg-app-base text-hi font-sans flex flex-col">
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

        {/* Compact Single-Row Header & Metrics Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-app-surface p-2.5 sm:px-4 sm:py-2.5 rounded-2xl border border-app-line/80 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-app-accent animate-pulse text-app-on-accent!" />
              <span className="text-xs font-black text-hi">{podName} · Lead QA</span>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-app-base border border-app-line text-hi">
                <FileCheck2 className="size-3 text-app-accent" />
                <span>Pending QA:</span>
                <span className="text-app-accent">{isLoading ? "..." : queue.length}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-app-base border border-app-line text-app-mist">
                <Users className="size-3 text-emerald-400" />
                <span>With Client:</span>
                <span className="text-hi">{isLoading ? "..." : withClient}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-app-base border border-app-line text-app-mist">
                <AlertTriangle className="size-3 text-amber-400" />
                <span>In Revision:</span>
                <span className="text-hi">{isLoading ? "..." : inRevision}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 rounded-xl bg-app-base border border-app-line hover:bg-app-surface text-app-ink-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`size-3.5 text-app-mist ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={handleExportReviewLedger}
              className="px-3 py-1.5 rounded-xl bg-app-base border border-app-line hover:bg-app-surface text-app-ink-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileText className="size-3.5 text-app-mist" /> Export ledger
            </button>
          </div>
        </div>

        {isError && (
          <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300">
            {(error as Error)?.message || "Could not load the QA queue."}{" "}
            <button className="underline" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {isLoading ? (
          <CreoInlineLoader />
        ) : isError ? null : !current || !deliverable ? (
          <div className="bg-app-surface rounded-2xl border border-dashed border-app-line p-12 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <Check className="size-6" />
            </div>
            <h3 className="text-base font-black text-hi">Nothing waiting for QA</h3>
            <p className="text-xs text-app-mist max-w-md mx-auto">
              There are {data?.tasks?.in_production.length || 0} tasks in production. When a creative uploads a finished file it appears here. Approving sends it to the client's review queue; requesting a revision sends your notes back to the creative.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Queue */}
            <div className="lg:col-span-3 bg-app-surface rounded-2xl border border-app-line/80 p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 max-h-[140px] sm:max-h-[220px] lg:max-h-[calc(100vh-300px)] overflow-y-auto">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-app-mist px-1">Queue · {queue.length}</h2>
              {queue.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedId(task.id)}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl border text-left transition-colors ${
                    task.id === current.id ? "border-app-accent/50 bg-app-base" : "border-transparent hover:bg-hi/[0.03]"
                  }`}
                >
                  <div className="size-9 sm:size-12 rounded-lg overflow-hidden bg-black shrink-0 border border-app-line">
                    <DeliverableMedia
                      url={task.deliverable?.file_url}
                      isVideo={!!task.deliverable?.is_video}
                      title={titleOf(task)}
                      controls={false}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-hi truncate">{titleOf(task)}</div>
                    <div className="text-[10px] text-app-mist truncate">
                      {task.client_name} · v{task.deliverable?.version ?? 1}
                      {task.is_revision ? " · revision" : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Review panel */}
            <div className="lg:col-span-9 bg-app-surface rounded-2xl border border-app-line/80 p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-app-line gap-2">
                <div>
                  <div className="text-xs font-bold text-app-mist mb-0.5">
                    <span className="text-app-accent font-black">{current.client_name}</span> · {FORMAT_LABELS[current.deliverable_type] || current.deliverable_type} · v{deliverable.version}
                  </div>
                  <h3 className="text-base font-black text-hi">{titleOf(current)}</h3>
                  <p className="text-[11px] text-app-mist mt-0.5">
                    Creative: <span className="font-bold text-hi">{current.assignee_name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-app-line bg-app-base hover:bg-app-surface text-xs font-semibold text-app-accent transition-colors cursor-pointer"
                  >
                    <History className="size-3" /> Full History & Audio
                  </button>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <Clock className="size-3" /> Pending QA sign-off
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                <div className="lg:col-span-5 space-y-2">
                  <div
                    className={`w-full mx-auto bg-black rounded-2xl overflow-hidden border border-slate-800 ${
                      deliverable.is_video || current.deliverable_type === "story" ? "aspect-[9/16] max-w-[200px] sm:max-w-[300px]" : "aspect-[4/5] max-w-[240px] sm:max-w-[360px]"
                    }`}
                  >
                    <DeliverableMedia url={deliverable.file_url} isVideo={deliverable.is_video} title={titleOf(current)} className="w-full h-full" />
                  </div>
                  <PublishingControl deliverableId={deliverable.id} />
                  {deliverable.file_url && (
                    <a
                      href={deliverable.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-app-accent hover:text-hi"
                    >
                      <Download className="size-3.5" /> Open original file
                    </a>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-4">
                  {(deliverable.voice_note_url || deliverable.rejection_comment) && (
                    <div className="bg-app-base rounded-2xl p-3.5 border border-app-warm/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-app-warm uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Volume2 className="size-3.5 text-app-accent" /> Client Revision Instructions & Notes
                        </span>
                        <span className="text-[10px] text-app-mist">v{deliverable.version} Revision</span>
                      </div>
                      {deliverable.rejection_comment && (
                        <p className="text-hi leading-relaxed whitespace-pre-wrap">{deliverable.rejection_comment}</p>
                      )}
                      {deliverable.voice_note_url && (
                        <div className="pt-1">
                          <VoicePlayer
                            audioUrl={deliverable.voice_note_url}
                            durationSeconds={deliverable.voice_note_duration}
                            authorName={`${current.client_name} (Client)`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {current.blueprint?.brief && (
                    <div className="bg-app-base rounded-2xl p-3.5 border border-app-line text-xs text-app-ink-2">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-app-mist mb-1">Brief</span>
                      {current.blueprint.brief}
                    </div>
                  )}

                  <fieldset className="space-y-2">
                    <legend className="text-[11px] font-black uppercase tracking-wider text-app-mist mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> Lead QA checklist
                    </legend>
                    {RUBRIC.map((label, i) => (
                      <label
                        key={label}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                          checks[i] ? "bg-app-surface border-app-accent/50 text-hi" : "bg-app-base border-app-line text-app-mist"
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
                      className="w-full text-xs p-3.5 rounded-2xl border border-app-line bg-app-base/50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-hi"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                    <button
                      onClick={() => qaMutation.mutate({ deliverableId: deliverable.id, approve: false, notes: feedbackNote.trim() })}
                      disabled={qaMutation.isPending || !feedbackNote.trim()}
                      className="px-5 py-2.5 rounded-xl bg-app-surface border border-app-line hover:bg-app-base text-app-ink-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request revision
                    </button>
                    <button
                      onClick={() => qaMutation.mutate({ deliverableId: deliverable.id, approve: true, notes: feedbackNote.trim() })}
                      disabled={qaMutation.isPending || !allChecked}
                      title={allChecked ? undefined : "Complete the checklist to approve"}
                      className="px-6 py-2.5 rounded-xl bg-app-accent hover:bg-blue-700 text-app-on-accent! text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {historyModalOpen && deliverable && (
          <DeliverableHistoryModal
            isOpen={true}
            onClose={() => setHistoryModalOpen(false)}
            deliverableId={deliverable.id}
            deliverableTitle={titleOf(current)}
            isClient={false}
          />
        )}
      </main>
    </div>
  );
}
