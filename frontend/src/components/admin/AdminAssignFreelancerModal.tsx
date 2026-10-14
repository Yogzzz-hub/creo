import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, UserCheck, Calendar } from "lucide-react";
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
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliverablesQuery = useQuery({
    queryKey: ["all-deliverables-for-assign"],
    queryFn: () => fetchAdminDeliverables(),
  });

  const deliverables = (deliverablesQuery.data || []) as any[];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await assignFreelancerTask(freelancer.id, {
        deliverable_id: selectedDeliverableId || undefined,
        task_title: taskTitle.trim() || undefined,
        instructions: instructions.trim() || undefined,
        due_date: dueDate,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to assign task.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#161F2D] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#2A3446] space-y-5 text-white">
        <div className="flex items-center justify-between border-b border-[#2A3446] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Assign Task / Deliverable</h3>
              <p className="text-[11px] text-[#97A0B3]">Assigning to {freelancer.full_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#97A0B3] hover:text-white rounded-lg hover:bg-[#0B111C]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Select Active Deliverable (Optional)</label>
            <select
              value={selectedDeliverableId}
              onChange={(e) => {
                setSelectedDeliverableId(e.target.value);
                const found = deliverables.find((d: any) => d.id === e.target.value);
                if (found) {
                  setTaskTitle(found.title);
                  if (found.description) setInstructions(found.description);
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">-- Choose deliverable from roster --</option>
              {deliverables.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.format} • {d.state || d.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Task / Deliverable Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. Hero Cinematic Reel - Cut 01"
              className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Execution Brief / Instructions</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Include aspect ratio, color palette guidelines, reference URLs, and asset links..."
              className="w-full px-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div>
            <label className="block font-bold text-[#F1F5F9] mb-1">Delivery Deadline *</label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-[#97A0B3] absolute left-3 top-2.5" />
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#2A3446] bg-[#0B111C] text-white focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A3446]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#2A3446] font-bold text-[#97A0B3] hover:text-white hover:bg-[#0B111C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {busy ? "Assigning..." : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
