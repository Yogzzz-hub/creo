import { useState, useEffect } from "react";
import { useAuth } from "../../lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPortalDeliverables, approveDeliverable, requestChanges } from "../../lib/deliverables-api";
import { Check, Play, Loader2 } from "lucide-react";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

export function PortalDeliverablesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const gate = useOnboardingGate();
  const clientId = user?.id || "00000000-0000-0000-0000-000000000001";

  // Query deliverables (only once the workspace is unlocked)
  const { data: deliverablesData, isLoading } = useQuery({
    queryKey: ["portal", "deliverables", clientId],
    queryFn: () => fetchPortalDeliverables(clientId),
    enabled: gate.isComplete,
    refetchInterval: 2 * 60_000,
  });

  const deliverables = deliverablesData?.items || [];
  const countAwaiting = deliverables.filter((d: any) => d.status === "pending_approval").length;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-select first pending deliverable, or just first one
  useEffect(() => {
    if (deliverables.length > 0 && !selectedId) {
      const firstPending = deliverables.find((d: any) => d.status === "pending_approval");
      setSelectedId(firstPending ? firstPending.id : (deliverables[0]?.id || null));
    }
  }, [deliverables, selectedId]);

  if (!gate.isReady || (gate.isComplete && isLoading)) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Deliverables Queue" />;
  }

  if (!gate.isComplete) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Deliverables Queue Locked"
          description="Your creative deliverables queue and sign-off docks will activate as soon as your workspace setup is complete."
        />
      </div>
    );
  }

  const selectedItem: any = deliverables.find((d: any) => d.id === selectedId);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const idempotencyKey = crypto.randomUUID();
      return await approveDeliverable(id, clientId, idempotencyKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
      showToast("Approved! Assets synced.");
    },
  });

  const requestChangesMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment: string }) => {
      return await requestChanges(id, clientId, comment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables", clientId] });
      showToast("Revision requested.");
      setCommentText("");
    },
  });

  const handleApprove = () => {
    if (selectedId) approveMutation.mutate(selectedId);
  };

  const handleRequestChange = () => {
    if (selectedId) requestChangesMutation.mutate({ id: selectedId, comment: commentText });
  };

  const handleApproveAll = () => {
    const pendingIds = deliverables.filter((d: any) => d.status === "pending_approval").map((d: any) => d.id);
    pendingIds.forEach((id: string) => approveMutation.mutate(id));
    showToast(`Approving ${pendingIds.length} items...`);
  };

  const itemComments = selectedItem?.rejection_comment
    ? [
        {
          id: "rev-note",
          author: "You",
          timestamp: selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString() : "Latest review",
          text: selectedItem.rejection_comment,
          fixed: (selectedItem.revision_round || 1) > 1,
        },
      ]
    : [];

  if (isLoading && deliverables.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#97A0B3]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8 shrink-0">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#97A0B3] mb-1.5 sm:mb-2">
            {deliverables.length > 0 ? `CYCLE DELIVERABLES · ${countAwaiting} WAITING FOR YOU` : "NO DELIVERABLES PENDING"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Review</h1>
        </div>
        {countAwaiting > 0 && (
          <button onClick={handleApproveAll} className="text-xs sm:text-[13px] text-[#97A0B3] hover:text-white transition-colors text-left sm:text-right">
            Approve everything in one tap: <span className="font-bold text-white cursor-pointer hover:underline">Approve all {countAwaiting}</span>
          </button>
        )}
      </div>

      {/* ── Main Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 pb-6">
        
        {/* Left Column: Batch List */}
        <div className="col-span-1 lg:col-span-3 bg-[#161F2D] rounded-[24px] border border-[#2A3446] p-4 flex flex-col overflow-hidden">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#97A0B3] mb-4 pl-3 pt-2">
            THIS BATCH
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
            {deliverables.length === 0 ? (
              <div className="p-4 text-center text-sm text-[#97A0B3]">
                No deliverables in this batch.
              </div>
            ) : (
              deliverables.map((d: any, idx: number) => {
                const isSelected = selectedId === d.id;
                const isApproved = d.status === "approved" || d.status === "scheduled";
                const isNeedsYou = d.status === "pending_approval";
                
                // Fallbacks mimicking design
                const title = d.title || `Asset ${idx + 1}`;
                const meta = `${d.asset_type || "Reel"} · v${d.revision_round || 1}`;
                const thumb = d.thumbnail_url || d.file_url;

                return (
                  <button
                    key={d.id}
                    onClick={() => setSelectedId(d.id)}
                    className={`w-full flex items-center gap-4 p-3 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? "bg-[#161F2D] border-white/[0.1] shadow-lg" 
                        : "border-transparent hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-black overflow-hidden shrink-0 border border-[#2A3446] flex items-center justify-center">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-5 h-5 text-[#97A0B3]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[13px] font-bold truncate ${isSelected ? 'text-white' : 'text-[#F8FAFC]'}`}>
                        {title}
                      </h4>
                      <p className="text-xs text-[#97A0B3] truncate mb-2">{meta}</p>
                      
                      {isNeedsYou ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-[#D8BF9B]/15 text-[#D8BF9B]">
                          Needs you
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-[#7FA0D6]/15 text-[#BCCCE6]">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-white/[0.05] text-[#97A0B3]">
                          In production
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Middle Column: Player */}
        <div className="col-span-1 lg:col-span-5 bg-[#161F2D] rounded-[24px] border border-[#2A3446] flex flex-col relative overflow-hidden min-h-[360px] sm:min-h-[460px]">
          {/* Version Switcher */}
          {selectedItem && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex p-1 bg-[#0B111C]/80 backdrop-blur-md rounded-full border border-[#2A3446]">
              {Array.from({ length: selectedItem.revision_round || 1 }).map((_, i) => {
                const isLatest = i + 1 === (selectedItem.revision_round || 1);
                return (
                  <button
                    key={i}
                    className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-colors ${
                      isLatest 
                        ? "bg-[#161F2D] text-white shadow-sm border border-[#2A3446]" 
                        : "text-[#97A0B3] hover:text-white"
                    }`}
                  >
                    v{i + 1} {isLatest && "· latest"}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-8 bg-[#0B111C]/30 relative">
            {selectedItem ? (
              <div className="relative w-full max-w-[280px] aspect-[9/16] bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-[#161F2D] flex items-center justify-center">
                {selectedItem.file_url && (selectedItem.file_type?.includes("video") || selectedItem.file_url.endsWith(".mp4") || selectedItem.file_url.endsWith(".webm") || selectedItem.file_url.endsWith(".mov")) ? (
                  <video
                    src={selectedItem.file_url}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : selectedItem.file_url ? (
                  <img 
                    src={selectedItem.file_url} 
                    alt={selectedItem.title || "Deliverable"} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-center p-4">
                    <p className="text-white text-xs font-semibold mb-1">Asset in production</p>
                    <p className="text-xs text-[#97A0B3]">Preview will appear once uploaded by your pod</p>
                  </div>
                )}
                
                <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none">
                  <p className="text-white text-[13px] font-bold drop-shadow-md px-2 truncate">
                    {selectedItem.title || "Deliverable preview"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#97A0B3]">Select an asset to view</div>
            )}
          </div>
          
          {/* Asset Meta Bar */}
          <div className="h-[72px] shrink-0 border-t border-[#2A3446] px-6 flex items-center justify-between bg-[#0B111C]/30">
            <span className="text-[13px] text-[#97A0B3]">
              {selectedItem ? `Format: ${(selectedItem.file_type || selectedItem.asset_type || "Media").toUpperCase()}` : "No asset selected"}
            </span>
            <span className="text-xs font-medium text-[#97A0B3] tabular-nums shrink-0">
              {selectedItem?.created_at ? `Created ${new Date(selectedItem.created_at).toLocaleDateString()}` : ""}
            </span>
          </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="col-span-1 lg:col-span-4 bg-[#161F2D] rounded-[24px] border border-[#2A3446] p-4 sm:p-6 flex flex-col h-full overflow-hidden">
          {selectedItem ? (
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-6">
              {/* Header Info */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#97A0B3] mb-2">
                  {(selectedItem.asset_type || selectedItem.file_type || "REEL").toUpperCase()} · {selectedItem.scheduled_at ? `PUBLISHES ${new Date(selectedItem.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}` : "SCHEDULED IN CALENDAR"}
                </p>
                <h2 className="text-2xl font-normal text-white">{selectedItem.title || selectedItem.file_url?.split("/").pop()?.replace(/[-_.]/g, " ") || "Deliverable"}</h2>
              </div>

              {/* What changed */}
              {(selectedItem.revision_round || 1) > 1 && (
                <div className="bg-[#161F2D] rounded-xl p-4 border border-white/[0.03]">
                  <h4 className="text-[13px] font-bold text-white mb-1.5">What changed in v{selectedItem.revision_round}</h4>
                  <p className="text-[13px] text-[#97A0B3] leading-relaxed">
                    {selectedItem.rejection_comment || "Updated revision based on client feedback."}
                  </p>
                </div>
              )}

              {/* Revision rounds */}
              {(() => {
                const planName = (String((deliverablesData as any)?.plan_name || (user as any)?.plan_id || (user as any)?.plan || "")).toLowerCase();
                const maxRevisionRounds = planName.includes("starter") ? 1 : planName.includes("scale") || planName.includes("pro") ? 3 : 2;
                const currentRound = selectedItem.revision_round || 1;

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-white">Revision rounds</span>
                      <span className="text-xs text-[#97A0B3]">{currentRound} of {maxRevisionRounds} used</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.08] rounded-full flex gap-1">
                      {Array.from({ length: maxRevisionRounds }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 rounded-full ${currentRound > i ? "bg-[#7FA0D6]" : "bg-white/[0.08]"}`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Comments */}
              <div>
                <h4 className="text-[13px] font-bold text-white mb-4">Comments</h4>
                <div className="space-y-4">
                  {itemComments.length === 0 ? (
                    <p className="text-[13px] text-[#97A0B3] italic">No revision comments yet for this deliverable.</p>
                  ) : (
                    itemComments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="size-6 rounded-full bg-[#BCCCE6] shrink-0 flex items-center justify-center text-[11px] font-bold text-black border border-white/[0.1]">
                          1
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-[#97A0B3] mb-1">
                            <span className="font-bold text-white">{c.author}</span> - {c.timestamp}
                          </p>
                          <p className="text-[13px] text-[#97A0B3] leading-relaxed mb-1">
                            {c.text}
                          </p>
                          {c.fixed && (
                            <p className="text-xs font-bold text-[#97A0B3] flex items-center gap-1">
                              <Check className="w-3 h-3" /> Addressed in v{selectedItem.revision_round}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Interaction Form */}
              <div className="pt-2">
                <h4 className="text-[13px] font-bold text-white mb-3">Asking for a change?</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Less text", "Different music", "Stronger hook", "Colour feels off-brand", "Wrong product"].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setCommentText(prev => prev ? `${prev} · ${tag}` : tag)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-[#2A3446] text-xs font-bold text-[#97A0B3] transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Tell your creative pod what to change..."
                  className="w-full bg-[#0B111C]/50 border border-[#2A3446] rounded-xl p-4 text-[13px] text-white placeholder:text-[#97A0B3] resize-none focus:outline-none focus:border-white/[0.2] transition-colors h-24 mb-4"
                />
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRequestChange}
                    disabled={requestChangesMutation.isPending || !commentText}
                    className="flex-1 px-4 py-3 rounded-full border border-[#2A3446] text-[13px] font-bold text-white hover:bg-[#161F2D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {requestChangesMutation.isPending ? "Sending..." : "Request change"}
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={approveMutation.isPending || selectedItem.status === "approved"}
                    className="flex-1 px-4 py-3 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    {approveMutation.isPending ? "Approving..." : "Approve"}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[#97A0B3]">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-[#2A3446] flex items-center justify-center mb-3">
                <Play className="w-5 h-5 text-[#97A0B3]" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">No Deliverable Selected</h3>
              <p className="text-xs text-[#97A0B3] max-w-xs leading-relaxed">
                When your creative pod submits deliverables for review, select an item to inspect versions, leave timestamps or comments, and approve for scheduling.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161F2D] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#BCCCE6]" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
