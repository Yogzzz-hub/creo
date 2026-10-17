import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  History,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  RefreshCw,
  Archive,
  Clock,
  User,
  ShieldCheck,
  Loader2,
  Mic,
} from "lucide-react";
import { fetchDeliverableHistory } from "../../lib/deliverables-api";
import type { DeliverableHistoryEntry } from "../../types/api";
import { VoicePlayer } from "./VoicePlayer";

export interface DeliverableHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverableId: string;
  deliverableTitle?: string;
  isClient?: boolean;
}

export function DeliverableHistoryModal({
  isOpen,
  onClose,
  deliverableId,
  deliverableTitle,
  isClient = true,
}: DeliverableHistoryModalProps) {
  const { data: history = [], isLoading } = useQuery<DeliverableHistoryEntry[]>({
    queryKey: ["deliverable-history", deliverableId, isClient],
    queryFn: () => fetchDeliverableHistory(deliverableId, isClient),
    enabled: isOpen && !!deliverableId,
  });

  if (!isOpen) return null;

  const getActionConfig = (action: string) => {
    switch (action.toLowerCase()) {
      case "qa_approved":
        return {
          label: "Approved by Team Lead (QA)",
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          icon: CheckCircle2,
          color: "text-emerald-400",
        };
      case "client_approved":
        return {
          label: "Approved by Client",
          badge: "bg-[#7FA0D6]/20 text-[#BCCCE6] border-[#7FA0D6]/40",
          icon: ShieldCheck,
          color: "text-[#7FA0D6]",
        };
      case "qa_rejected":
        return {
          label: "Revision Requested by Team Lead",
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          icon: AlertTriangle,
          color: "text-amber-400",
        };
      case "revision_requested":
        return {
          label: "Changes Requested by Client",
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          icon: RefreshCw,
          color: "text-amber-400",
        };
      case "voice_response":
        return {
          label: "Voice Response / Clarification",
          badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
          icon: Mic,
          color: "text-indigo-400",
        };
      case "deleted":
      case "withdrawn":
        return {
          label: "Approved Deliverable Withdrawn / Archived",
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          icon: Archive,
          color: "text-rose-400",
        };
      case "submitted":
      case "resubmitted":
      default:
        return {
          label: action === "resubmitted" ? "New Version Resubmitted" : "Deliverable Submitted for QA",
          badge: "bg-[#161F2D] text-white border-[#2A3446]",
          icon: UploadCloud,
          color: "text-[#7FA0D6]",
        };
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#161F2D] border border-[#2A3446] rounded-3xl w-full max-w-xl p-5 sm:p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#2A3446] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Deliverable History & Audit Trail</h3>
              <p className="text-xs text-[#97A0B3] truncate max-w-sm sm:max-w-md">
                {deliverableTitle || "Activity log & version lineage"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-[#2A3446] bg-[#0B111C] flex items-center justify-center text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-[#0B111C] border border-[#2A3446] rounded-xl p-3 flex items-center gap-2.5 shrink-0 text-xs text-[#97A0B3]">
          <Clock className="w-4 h-4 text-[#7FA0D6] shrink-0" />
          <span>
            Every deliverable action records the timestamp, responsible team lead or creator, and formal reason for full auditability.
          </span>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#97A0B3]">
              <Loader2 className="w-6 h-6 animate-spin text-[#7FA0D6]" />
              <p className="text-xs font-semibold">Loading deliverable history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-[#97A0B3] space-y-1">
              <p className="text-sm font-semibold text-white">No historical entries recorded yet</p>
              <p className="text-xs">Entries will appear as team leads and clients review, approve, or revise this asset.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#2A3446]">
              {history.map((entry) => {
                const config = getActionConfig(entry.action);
                const IconComponent = config.icon;
                const dateObj = new Date(entry.timestamp);
                const dateFormatted = dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                const timeFormatted = dateObj.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={entry.id} className="relative group">
                    {/* Timeline Node */}
                    <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-[#0B111C] border-2 border-[#2A3446] group-hover:border-[#7FA0D6] flex items-center justify-center transition-colors">
                      <div className="w-2 h-2 rounded-full bg-[#7FA0D6]" />
                    </div>

                    {/* Entry Card */}
                    <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl p-4 space-y-2.5 hover:border-[#7FA0D6]/40 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${config.badge}`}
                        >
                          <IconComponent className="w-3 h-3" />
                          {config.label}
                        </span>
                        <span className="text-[11px] font-mono text-[#97A0B3]">
                          {dateFormatted} · {timeFormatted}
                        </span>
                      </div>

                      {/* User Attribution */}
                      <div className="flex items-center gap-2 text-xs text-[#97A0B3]">
                        <User className="w-3.5 h-3.5 text-[#7FA0D6]" />
                        <span className="text-white font-semibold">{entry.actor_name || entry.user_name || "Team Member"}</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-mono bg-[#161F2D] text-[#7FA0D6] border border-[#2A3446]">
                          {entry.actor_role || entry.user_role || "Staff"}
                        </span>
                      </div>

                      {/* Reason / Notes */}
                      {entry.reason && (
                        <div className="bg-[#161F2D] rounded-xl p-3 border border-[#2A3446]/60">
                          <p className="text-[11px] uppercase tracking-wider text-[#97A0B3] font-bold mb-1">
                            Reason / Action Note
                          </p>
                          <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                            "{entry.reason}"
                          </p>
                        </div>
                      )}

                      {/* Voice Note Audio Recording */}
                      {entry.voice_note_url && (
                        <div className="mt-2">
                          <VoicePlayer
                            audioUrl={entry.voice_note_url}
                            durationSeconds={entry.voice_note_duration}
                            authorName={entry.actor_name || entry.user_name}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#2A3446] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
