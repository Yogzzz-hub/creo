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
  Film,
  FolderGit2,
  Clock,
  Music,
  ExternalLink,
  Info,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { assignFreelancerTask, FreelancerProfileItem } from "../../lib/freelancer-api";
import { fetchAdminDeliverables } from "../../lib/ops-api";
import { CustomSelect } from "../ui/CustomSelect";

interface AdminAssignFreelancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancer: FreelancerProfileItem;
  onSuccess: () => void;
}

const FORMAT_OPTIONS = [
  { label: "Reel (9:16 Vertical · 1080×1920)", value: "Reel (9:16)" },
  { label: "Video (16:9 Landscape · 1920×1080)", value: "Video (16:9)" },
  { label: "Carousel (4:5 Portrait / 1:1)", value: "Carousel (4:5 / 1:1)" },
  { label: "Static Graphic (1:1 Square)", value: "Static Graphic (1:1)" },
  { label: "Story (9:16 Vertical)", value: "Story (9:16)" },
];

export function AdminAssignFreelancerModal({
  isOpen,
  onClose,
  freelancer,
  onSuccess,
}: AdminAssignFreelancerModalProps) {
  const [assignmentMode, setAssignmentMode] = useState<"deliverable" | "custom">("deliverable");
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string>("");
  const [taskTitle, setTaskTitle] = useState("");
  const [contentFormat, setContentFormat] = useState("Reel (9:16)");
  const [rawFootageUrl, setRawFootageUrl] = useState("");
  const [targetDuration, setTargetDuration] = useState("30-60s");
  const [audioNotes, setAudioNotes] = useState("");
  const [hook, setHook] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
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
      if (found.format || found.deliverable_type) {
        const fmt = String(found.format || found.deliverable_type).toLowerCase();
        if (fmt.includes("reel")) setContentFormat("Reel (9:16)");
        else if (fmt.includes("carousel")) setContentFormat("Carousel (4:5 / 1:1)");
        else if (fmt.includes("post") || fmt.includes("graphic")) setContentFormat("Static Graphic (1:1)");
        else if (fmt.includes("story")) setContentFormat("Story (9:16)");
        else if (fmt.includes("video") || fmt.includes("16:9")) setContentFormat("Video (16:9)");
      }
      if (found.drive_url || found.raw_footage_url || found.brief_url) {
        setRawFootageUrl(found.drive_url || found.raw_footage_url || found.brief_url);
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
        `[Format: ${contentFormat}]`,
        targetDuration ? `[Target Duration: ${targetDuration}]` : "",
        rawFootageUrl ? `[Raw Footage Drive Link: ${rawFootageUrl.trim()}]` : "",
        audioNotes ? `[Audio / Music: ${audioNotes.trim()}]` : "",
        hook ? `[Hook / Concept: ${hook.trim()}]` : "",
        referenceUrl ? `[Reference URL: ${referenceUrl.trim()}]` : "",
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
        raw_footage_url: rawFootageUrl.trim() || undefined,
        format: contentFormat,
        target_duration: targetDuration.trim() || undefined,
        audio_notes: audioNotes.trim() || undefined,
        reference_url: referenceUrl.trim() || undefined,
        hook: hook.trim() || undefined,
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
        className="bg-app-surface rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-app-line space-y-5 text-hi max-h-[92vh] overflow-y-auto my-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-line pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-hi">Assign Task & Content Specs</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {freelancer.status}
                </span>
              </div>
              <p className="text-[11px] text-app-mist">
                Assigning to <strong className="text-hi">{freelancer.full_name}</strong> ({freelancer.specialty || "Creative Specialist"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-app-mist hover:text-hi rounded-xl hover:bg-app-base transition-colors"
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
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-app-base rounded-2xl border border-app-line">
          <button
            type="button"
            onClick={() => setAssignmentMode("deliverable")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              assignmentMode === "deliverable"
                ? "bg-purple-600 text-app-on-accent! shadow-md shadow-purple-600/30"
                : "text-app-mist hover:text-hi"
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
                ? "bg-purple-600 text-app-on-accent! shadow-md shadow-purple-600/30"
                : "text-app-mist hover:text-hi"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> New Custom Task
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {assignmentMode === "deliverable" && (
            <div>
              <label className="block font-bold text-app-ink-2 mb-1">Select Active Deliverable</label>
              <CustomSelect
                value={selectedDeliverableId}
                onChange={handleSelectDeliverable}
                ariaLabel="Select Active Deliverable"
                className="w-full"
                placeholder="-- Choose deliverable to link --"
                options={[
                  { value: "", label: "-- Choose deliverable to link --" },
                  ...deliverables.map((d: any) => ({
                    value: d.id,
                    label: `${d.title || d.concept_name || `Deliverable #${d.id.slice(0, 8)}`} (${d.format || d.deliverable_type || "Video"} • ${d.state || d.status || "Pending"})`,
                  })),
                ]}
              />
              {deliverables.length === 0 && !deliverablesQuery.isLoading && (
                <span className="text-[10px] text-amber-400 mt-1 block">
                  No deliverables found in roster. You can switch to "New Custom Task" above.
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block font-bold text-app-ink-2 mb-1">Task / Deliverable Title *</label>
            <input
              type="text"
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="e.g. 4K Cinematic Reel - First Draft Cut"
              className="w-full px-3.5 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs font-medium"
            />
          </div>

          {/* ── Content Specifications Box ── */}
          <div className="p-4 rounded-2xl bg-app-base border border-purple-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Film className="w-4 h-4 text-purple-400" /> Content & Technical Specifications
              </span>
              <span className="text-[10px] text-app-mist flex items-center gap-1">
                <Info className="w-3 h-3" /> Visible to Assignee
              </span>
            </div>

            {/* Content Format & Aspect Ratio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Content Format & Ratio *</label>
                <CustomSelect
                  value={contentFormat}
                  onChange={setContentFormat}
                  ariaLabel="Content Format & Ratio"
                  className="w-full"
                  options={FORMAT_OPTIONS}
                />
              </div>

              <div>
                <label className="block font-bold text-app-ink-2 mb-1">Target Duration / Length</label>
                <div className="relative">
                  <Clock className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
                  <input
                    type="text"
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(e.target.value)}
                    placeholder="e.g. 30-60s or 15-30s"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app-line bg-app-surface text-hi focus:outline-none focus:border-purple-400 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Raw Footage / Google Drive Link (CRITICAL) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-app-ink-2 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-blue-400" />
                  Raw Footage / Google Drive Assets Link
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold">1-Click Open for Worker</span>
              </div>
              <div className="relative">
                <ExternalLink className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
                <input
                  type="url"
                  value={rawFootageUrl}
                  onChange={(e) => setRawFootageUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app-line bg-app-surface text-hi focus:outline-none focus:border-blue-400 text-xs font-mono"
                />
              </div>
              <p className="text-[10px] text-app-mist mt-1">
                Paste the Google Drive or cloud storage folder containing the raw videos/photos for the editor to download.
              </p>
            </div>

            {/* Audio / Music & Hook Concepts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-app-ink-2 mb-1 flex items-center gap-1">
                  <Music className="w-3 h-3 text-pink-400" /> Audio / Music Instructions
                </label>
                <input
                  type="text"
                  value={audioNotes}
                  onChange={(e) => setAudioNotes(e.target.value)}
                  placeholder="e.g. Trending energetic reel audio / Voiceover in Drive"
                  className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-app-ink-2 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Hook / Concept
                </label>
                <input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="e.g. First 2s hook: Stop making this mistake..."
                  className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>

            {/* Reference URL */}
            <div>
              <label className="block font-bold text-app-ink-2 mb-1">Inspiration / Reference Link (Optional)</label>
              <input
                type="url"
                value={referenceUrl}
                onChange={(e) => setReferenceUrl(e.target.value)}
                placeholder="https://instagram.com/reel/... or YouTube reference"
                className="w-full px-3 py-2 rounded-xl border border-app-line bg-app-surface text-hi focus:outline-none focus:border-purple-400 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-app-ink-2 mb-1">Execution Brief & Technical Instructions</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Include color grading LUT, pacing, captions styling, brand font directions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Due Date & Quick Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-app-ink-2">Delivery Deadline *</label>
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setRelativeDays(2)}
                    className="px-1.5 py-0.5 rounded bg-app-base text-app-mist hover:text-hi"
                  >
                    +2d
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDays(4)}
                    className="px-1.5 py-0.5 rounded bg-app-base text-app-mist hover:text-hi"
                  >
                    +4d
                  </button>
                  <button
                    type="button"
                    onClick={() => setRelativeDays(7)}
                    className="px-1.5 py-0.5 rounded bg-app-base text-app-mist hover:text-hi"
                  >
                    +7d
                  </button>
                </div>
              </div>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs"
                />
              </div>
            </div>

            {/* Priority & Urgency */}
            <div>
              <label className="block font-bold text-app-ink-2 mb-1">Task Priority</label>
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
                        : "bg-app-base border-app-line text-app-mist hover:text-hi"
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
              <label className="font-bold text-app-ink-2">Agreed Milestone Payout (₹)</label>
              <span className="text-[10px] text-purple-300 font-semibold">
                Freelancer Rate: ₹{freelancer.hourly_rate ? freelancer.hourly_rate.toLocaleString() : "1,500"}/hr
              </span>
            </div>
            <div className="relative">
              <IndianRupee className="w-3.5 h-3.5 text-app-mist absolute left-3 top-3" />
              <input
                type="number"
                min="0"
                step="250"
                value={taskCompensation}
                onChange={(e) => setTaskCompensation(Number(e.target.value))}
                placeholder="4500"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-app-line bg-app-base text-hi focus:outline-none focus:border-purple-400 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-app-line">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl border border-app-line font-bold text-app-mist hover:text-hi hover:bg-app-base transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold text-app-on-accent! shadow-lg shadow-purple-600/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
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
