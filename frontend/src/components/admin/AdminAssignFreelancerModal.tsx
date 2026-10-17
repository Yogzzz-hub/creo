import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  UserCheck,
  Calendar,
  Layers,
  AlertCircle,
  IndianRupee,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assignFreelancerTask, FreelancerProfileItem } from "../../lib/freelancer-api";
import { fetchAdminDeliverables } from "../../lib/ops-api";

interface AdminAssignFreelancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancer: FreelancerProfileItem;
  onSuccess: () => void;
}

export function AdminAssignFreelancerModal({
  isOpen,
  onClose,
  freelancer,
  onSuccess,
}: AdminAssignFreelancerModalProps) {
  const [assignmentMode, setAssignmentMode] = useState<"deliverable" | "custom">("deliverable");
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [priority, setPriority] = useState<"Normal" | "High" | "Urgent">("High");
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0]
  );
  const [taskCompensation, setTaskCompensation] = useState<number>(
    freelancer.hourly_rate ? freelancer.hourly_rate * 4 : 4500
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliverablesQuery = useQuery({
    queryKey: ["all-deliverables-for-assign"],
    queryFn: () => fetchAdminDeliverables(),
  });

  const deliverables = (deliverablesQuery.data || []) as any[];

  if (!isOpen) return null;

  const setRelativeDays = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    setDueDate(d.toISOString().split("T")[0]);
  };

  const handleSelectDeliverable = (delivId: string) => {
    setSelectedDeliverableId(delivId);
    if (!delivId) return;
    const found = deliverables.find((d: any) => d.id === delivId);
    if (found) {
      setTaskTitle(found.title || found.concept_name || "Deliverable Milestone");
      if (found.description || found.notes) {
        setInstructions(found.description || found.notes);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      setError("Please provide a title for the task.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const fullInstructions = [
        instructions.trim(),
        `[Priority: ${priority}]`,
        taskCompensation ? `[Agreed Milestone Fee: ₹${taskCompensation.toLocaleString()}]` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      await assignFreelancerTask(freelancer.id, {
        deliverable_id: assignmentMode === "deliverable" && selectedDeliverableId ? selectedDeliverableId : undefined,
        task_title: taskTitle.trim(),
        instructions: fullInstructions,
        due_date: dueDate,
        priority,
        milestone_fee: taskCompensation,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to assign task. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#161F2D] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-[#2A3446] space-y-5 text-white max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Assign Task / Deliverable</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {freelancer.status}
                </span>
              </div>
              <p className="text-[11px] text-[#97A0B3]">
                Assigning to <strong className="text-white">{freelancer.full_name}</strong> ({freelancer.specialty || "Creative Specialist"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#97A0B3] hover:text-white rounded-xl hover:bg-[#0B111C] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#0B111C] rounded-2xl border border-[#2A3446]">
          <button
            type="button"
            onClick={() => setAssignmentMode("deliverable")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              assignmentMode === "deliverable"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> From Deliverable Roster
          </button>
          <button
            type="button"
            onClick={() => {
              setAssignmentMode("custom");
              setSelectedDeliverableId("");
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              assignmentMode === "custom"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> New Custom Task
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {assignmentMode === "deliverable" && (
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Select Active Deliverable</label>
              <select
                value={selectedDeliverableId}
                onChange={(e) => handleSelectDeliverable(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs cursor-pointer font-medium"
              >
                <option value="">-- Choose deliverable to link --</option>
                {deliverables.map((d: any) => (
                  <option key={d.id} value={d.id} className="bg-[#161F2D] text-white">
                    {d.title || d.concept_name || `Deliverable #${d.id.slice(0, 8)}`} ({d.format || d.deliverable_type || "Video"} • {d.state || d.status || "Pending"})
                  </option>
                ))}
              </select>
              {deliverables.length === 0 && !deliverablesQuery.isLoading && (
                <span className="text-[10px] text-amber-400 mt-1 block">
                  No deliverables found in roster. You can switch to "New Custom Task" above.
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Task / Deliverable Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. 4K Cinematic Reel - First Draft Cut"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Execution Brief & Technical Instructions</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Include aspect ratio (9:16 / 16:9), reference links, Google Drive assets, color grading lut, audio sync specs..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Due Date & Quick Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-[#F1F5F9]">Delivery Deadline *</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRelativeDays(2)}
                    className="px-1.5 py-0.5 rounded bg-[#0B111C] text-[#97A0B3] hover:text-white"
                  >
                    +2d
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDays(4)}
                    className="px-1.5 py-0.5 rounded bg-[#0B111C] text-[#97A0B3] hover:text-white"
                  >
                    +4d
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDays(7)}
                    className="px-1.5 py-0.5 rounded bg-[#0B111C] text-[#97A0B3] hover:text-white"
                  >
                    +7d
                  </button>
                </div>
              </div>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>

            {/* Priority & Urgency */}
            <div>
              <label className="block font-bold text-[#F1F5F9] mb-1">Task Priority</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["Normal", "High", "Urgent"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      priority === p
                        ? p === "Urgent"
                          ? "bg-rose-600/30 border-rose-500 text-rose-300 font-black shadow-sm"
                          : p === "High"
                          ? "bg-amber-600/30 border-amber-500 text-amber-300 font-black shadow-sm"
                          : "bg-purple-600/30 border-purple-500 text-purple-300 font-black shadow-sm"
                        : "bg-[#0B111C] border-[#2A3446] text-[#97A0B3] hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task Milestone Fee */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[#F1F5F9]">Agreed Milestone Payout (₹)</label>
              <span className="text-[10px] text-purple-300 font-semibold">
                Freelancer Rate: ₹{freelancer.hourly_rate ? freelancer.hourly_rate.toLocaleString() : "1,500"}/hr
              </span>
            </div>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-3" />
              <input
                type="number"
                min="0"
                step="250"
                value={taskCompensation}
                onChange={(e) => setTaskCompensation(Number(e.target.value))}
                placeholder="4500"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-[#2A3446] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-lg shadow-purple-600/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              {busy ? "Dispatching Assignment..." : "Dispatch Task to Freelancer"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
