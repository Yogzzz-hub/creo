import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X, Sparkles, Send, Loader2, Check } from "lucide-react";
import { request } from "../../lib/http";

export interface StoryApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialSlot?: {
    id: string;
    client_id?: string;
    client_name?: string;
    title?: string;
    type?: string;
    date?: string;
    time?: string;
    story_description?: string;
    approval_type?: string;
    team_notes?: string;
  } | null;
  defaultDate?: string;
  defaultClientId?: string;
}

interface ClientOption {
  client_id: string;
  company_name?: string;
  email?: string;
  full_name?: string;
}

const APPROVAL_TYPES = [
  { id: "Story Concept & Topic", label: "Story Concept & Topic", desc: "Approve topic and story direction before production starts" },
  { id: "Script & Copywriting", label: "Script & Copywriting", desc: "Review written voiceover, script lines, and caption" },
  { id: "Visual Direction & Storyboard", label: "Visual Direction & Storyboard", desc: "Sign-off on visual scenes, graphic style, and layout" },
  { id: "Final Content Deliverable", label: "Final Content Deliverable", desc: "Final sign-off on completed reel/post before publication" },
];

const FORMAT_OPTIONS = [
  { id: "Reel", label: "Reel (9:16)" },
  { id: "Story", label: "Story (9:16)" },
  { id: "Poster", label: "Poster / Post (1:1)" },
  { id: "Carousel", label: "Carousel (4:5)" },
];

export function StoryApprovalModal({
  isOpen,
  onClose,
  onSuccess,
  initialSlot,
  defaultDate,
  defaultClientId,
}: StoryApprovalModalProps) {
  const [clientId, setClientId] = useState(defaultClientId || "");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("Reel");
  const [publishDate, setPublishDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [scheduledTime, setScheduledTime] = useState("19:30");
  const [storyDescription, setStoryDescription] = useState("");
  const [approvalType, setApprovalType] = useState("Story Concept & Topic");
  const [teamNotes, setTeamNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch client roster
  const { data: clientsData } = useQuery<ClientOption[]>({
    queryKey: ["admin-clients-roster"],
    queryFn: async () => {
      try {
        const res = await request<any[]>("/api/v1/admin/clients");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  // Populate fields when initialSlot or defaults change
  useEffect(() => {
    if (initialSlot) {
      setClientId(initialSlot.client_id || defaultClientId || "");
      setTitle(initialSlot.title || "");
      setFormat(
        initialSlot.type?.toLowerCase().includes("reel")
          ? "Reel"
          : initialSlot.type?.toLowerCase().includes("story")
          ? "Story"
          : initialSlot.type?.toLowerCase().includes("carousel")
          ? "Carousel"
          : "Poster"
      );
      setPublishDate(initialSlot.date || defaultDate || new Date().toISOString().split("T")[0]);
      setScheduledTime(initialSlot.time || "19:30");
      setStoryDescription(initialSlot.story_description || "");
      setApprovalType(initialSlot.approval_type || "Story Concept & Topic");
      setTeamNotes(initialSlot.team_notes || "");
    } else {
      setClientId(defaultClientId || (clientsData && clientsData[0]?.client_id) || "");
      setTitle("");
      setFormat("Reel");
      setPublishDate(defaultDate || new Date().toISOString().split("T")[0]);
      setScheduledTime("19:30");
      setStoryDescription("");
      setApprovalType("Story Concept & Topic");
      setTeamNotes("");
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [initialSlot, defaultDate, defaultClientId, isOpen, clientsData]);

  // Lock scroll while modal is active
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSubmit = async (requestApproval: boolean) => {
    if (!title.trim()) {
      setErrorMessage("Please enter a story title or topic.");
      return;
    }
    if (!storyDescription.trim()) {
      setErrorMessage("Please write a brief description of what the story is about.");
      return;
    }
    if (!initialSlot && !clientId) {
      setErrorMessage("Please select a client for this story.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (initialSlot?.id) {
        // Update existing slot
        await request<any>(`/api/v1/calendar/slots/${initialSlot.id}/story-details`, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            format,
            publish_date: publishDate,
            scheduled_time: scheduledTime,
            story_description: storyDescription.trim(),
            approval_type: approvalType,
            team_notes: teamNotes.trim(),
            request_approval: requestApproval,
          }),
        });
      } else {
        // Create new story slot
        await request<any>("/api/v1/calendar/slots/create-story", {
          method: "POST",
          body: JSON.stringify({
            client_id: clientId,
            title: title.trim(),
            format,
            publish_date: publishDate,
            scheduled_time: scheduledTime,
            story_description: storyDescription.trim(),
            approval_type: approvalType,
            team_notes: teamNotes.trim(),
            request_approval: requestApproval,
          }),
        });
      }

      setSuccessMessage(
        requestApproval
          ? "Story details saved and sent to client for approval!"
          : "Story details saved as draft."
      );

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save story details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-[#161F2D] border border-[#2A3446] text-white shadow-2xl overflow-y-auto flex flex-col relative m-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#161F2D]/95 backdrop-blur-sm z-10 flex items-center justify-between p-4 sm:p-5 border-b border-[#2A3446]">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-blue-500/15 text-[#7FA0D6] border border-blue-500/30 flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {initialSlot ? "Edit Story & Approval Request" : "New Story & Approval Request"}
              </h3>
              <p className="text-xs text-[#97A0B3] font-medium">
                Fill story details and outline what the team needs client approval on
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#97A0B3] hover:text-white hover:bg-[#2A3446] transition-colors cursor-pointer shrink-0"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-between">
              <span>{errorMessage}</span>
              <button type="button" onClick={() => setErrorMessage(null)}>
                <X className="size-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <Check className="size-4" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Client Selection (when creating or editing) */}
          {!initialSlot ? (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Client Brand <span className="text-rose-400">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white focus:outline-none focus:border-[#7FA0D6]"
              >
                <option value="">Select a client...</option>
                {clientsData?.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.company_name || c.full_name || c.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-xs text-[#97A0B3] bg-[#0B111C] px-3.5 py-2.5 rounded-xl border border-[#2A3446] flex items-center justify-between">
              <span>Client:</span>
              <span className="font-bold text-white">{initialSlot.client_name || "Assigned Client"}</span>
            </div>
          )}

          {/* Story Title & Format */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Story Title / Topic <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 3 Quick Habits to Boost Daily Energy"
                className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white focus:outline-none focus:border-[#7FA0D6]"
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Scheduled Publication Date
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Scheduled Time (24h or HH:MM)
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="e.g. 19:30 or 11:00 AM"
                className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white focus:outline-none focus:border-[#7FA0D6]"
              />
            </div>
          </div>

          {/* What is this story about? (Story Description / Outline) */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              What is this story about? (Story Outline / Script Direction) <span className="text-rose-400">*</span>
            </label>
            <p className="text-[11px] text-[#97A0B3] mb-1.5">
              Explain the story narrative, scenes, key message, and call-to-action that the client will see.
            </p>
            <textarea
              value={storyDescription}
              onChange={(e) => setStoryDescription(e.target.value)}
              placeholder="e.g. Fast-paced 20s reel opening with a bold contrast hook. Breakdown of 3 morning routines. Smooth transitions, clean on-screen captions, and a comment-driven CTA at the end."
              rows={4}
              className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7FA0D6] leading-relaxed"
            />
          </div>

          {/* What do you need client approval for? */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              What do you need client approval for? <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {APPROVAL_TYPES.map((a) => {
                const isSelected = approvalType === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => setApprovalType(a.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#7FA0D6] bg-blue-500/15 text-white"
                        : "border-[#2A3446] bg-[#0B111C] hover:border-[#7FA0D6]/40 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black">{a.label}</span>
                      {isSelected && <Check className="size-3.5 text-[#7FA0D6]" />}
                    </div>
                    <p className="text-[10px] text-[#97A0B3] leading-snug">{a.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note to Client */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Note for Client (Optional Context)
            </label>
            <p className="text-[11px] text-[#97A0B3] mb-1.5">
              A brief friendly note displayed directly to the client next to the approval button.
            </p>
            <textarea
              value={teamNotes}
              onChange={(e) => setTeamNotes(e.target.value)}
              placeholder="e.g. Hi team, we outlined this reel for your summer product drop. Please approve the story direction so we can begin video editing!"
              rows={2}
              className="w-full text-xs p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7FA0D6]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-[#161F2D]/95 backdrop-blur-sm p-4 sm:p-5 border-t border-[#2A3446] flex flex-wrap gap-2.5 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#0B111C] hover:bg-[#2A3446] text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-[#2A3446] bg-[#161F2D] hover:bg-[#2A3446] text-white font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span>Save & Request Client Approval</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
