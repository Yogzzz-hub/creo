import React, { useState } from "react";
import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Send,
  X,
  Plus,
  ShieldAlert,
  ArrowRight,
  PhoneCall,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import type { TicketItem } from "../../types/api";

interface SupportTicketData {
  id: string;
  status: "in_progress" | "resolved" | "open";
  priority: "urgent" | "medium" | "high" | "low";
  priorityLabel: string;
  timeAgo: string;
  title: string;
  description: string;
  meta: string;
  category?: string;
  messages?: Array<{ id: string; sender: string; text: string; time: string; isMe?: boolean }>;
  rawId?: string;
}

const CATEGORIES = ["Content", "Billing", "Technical", "Brand", "Other"];

// Stable fallback: a fresh [] each render would re-trigger the ticket sync effect forever
const NO_TICKETS: TicketItem[] = [];

const FAQ_ITEMS = [
  { q: "How do I request changes on an approved asset?", a: "Once an asset is approved, it moves to the Scheduled queue. If you need a last-minute change, please open a Support ticket with the priority 'High' and mention the asset ID." },
  { q: "What happens if I miss a review deadline?", a: "Assets auto-approve after the SLA timer expires to ensure your delivery pipeline stays on schedule. You can still request a revision via support, but it may eat into your monthly quota." },
  { q: "Can I add more reels to my plan mid-cycle?", a: "Yes! You can purchase Add-on packs from the Plan & billing page. They apply immediately and do not affect your recurring billing cycle." },
  { q: "How do revision rounds work?", a: "Your included revision rounds depend on your plan (1 for Starter, 2 for Growth, 3 for Scale). When reviewing, select 'Request Changes' and leave detailed comments. The pod will submit a v2 within 24-48 hours." },
  { q: "What's included in the Growth plan?", a: "The Growth plan includes a dedicated creative pod, 10 Reels, 18 Posts, and 20 Stories per cycle, with a 2 business days batch SLA." },
];

export function PortalSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";
  const isStaffOrAdmin = user?.role && user.role !== "client";

  const { data: serverTickets = NO_TICKETS, isLoading: isTicketsLoading } = useQuery<TicketItem[]>({
    queryKey: ["tickets", user?.id],
    queryFn: async () => {
      try {
        const res = await request<any>("/api/v1/tickets");
        return res?.items ?? (Array.isArray(res) ? res : []);
      } catch {
        return [];
      }
    },
    enabled: !!user?.id,
    refetchInterval: 2 * 60_000,
  });

  // Local state
  const [ticketsList, setTicketsList] = useState<SupportTicketData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Content");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [bargainModalOpen, setBargainModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };



  // Sync server tickets
  React.useEffect(() => {
    const safeTickets = (Array.isArray(serverTickets) ? serverTickets : []);
    if (safeTickets.length > 0) {
      const mapped: SupportTicketData[] = safeTickets.map((t: any) => ({
        rawId: t?.id,
        id: `#TKT-${String(t?.id || "").slice(0, 4).toUpperCase()}`,
        status: (t?.status === "resolved" || t?.status === "closed" ? "resolved" : t?.status === "in_progress" ? "in_progress" : "open") as any,
        priority: ((t?.priority as any) || "medium") as any,
        priorityLabel: t?.priority === "urgent" ? "Urgent" : t?.priority === "high" ? "High" : t?.priority === "low" ? "Low" : "Medium",
        timeAgo: t?.created_at ? new Date(t.created_at).toLocaleDateString() : "Recently",
        title: t?.title || "General Support Thread",
        description: t?.description || "",
        meta: `Opened by ${user?.full_name || "You"}`,
        category: "General",
      }));
      setTicketsList(mapped);
    } else {
      setTicketsList([]);
    }
  }, [serverTickets, user]);

  const createTicketMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string }) => {
      return await request("/api/v1/tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      showToast(`Ticket submitted successfully!`);
      setSubject("");
      setDescription("");
    },
    onError: (error: any) => {
      showToast(`Failed to create ticket: ${error.message || "Validation Error"}`);
    },
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast("Please fill in both subject and description.");
      return;
    }

    createTicketMutation.mutate({ title: subject.trim(), description: description.trim(), priority: "medium" });
  };

  if (isSubLoading || isTicketsLoading) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Support Desk" />;
  }

  return (
    <div className="space-y-6">

      {/* ── Retainer Notice Banner (Informative & Actionable, Never Blocking Support) ── */}
      {isExpired && !isStaffOrAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Retainer Subscription Inactive or Expired</h4>
              <p className="text-xs text-nebula-mist mt-0.5">
                Deliverable pipelines and asset reviews are currently paused. Our support desk is 100% active to assist you with renewal, custom quota arrangements, or billing questions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setBargainModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-nebula-navy border border-nebula-steel text-nebula-glow hover:text-white hover:border-nebula-glow/50 text-xs font-bold transition-colors cursor-pointer"
            >
              <PhoneCall className="size-3.5" />
              <span>Call & Bargain</span>
            </button>
            <Link
              to="/portal/payments"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-nebula-periwinkle hover:bg-white text-nebula-navy text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <span>Renew Retainer</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Help Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left Column: Ask your pod (Form) ── */}
        <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
          <h3 className="text-base font-semibold text-white mb-5">Ask your pod</h3>

          <form onSubmit={handleFormSubmit} className="space-y-5">
            {/* Category Pills */}
            <div>
              <label className="block text-sm text-nebula-mist mb-2">What is it about?</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-nebula-periwinkle text-nebula-navy"
                        : "bg-transparent border border-nebula-steel text-white hover:bg-nebula-surface"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label className="block text-sm text-nebula-mist mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly summarize your request..."
                className="w-full bg-nebula-navy border border-nebula-steel rounded-lg p-3 text-sm text-white placeholder-nebula-mist focus:outline-none focus:border-white/[0.2] transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-nebula-mist mb-2">Message</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or request..."
                className="w-full bg-nebula-navy border border-nebula-steel rounded-lg p-3 text-sm text-white placeholder-nebula-mist focus:outline-none focus:border-white/[0.2] resize-none transition-colors"
              />
            </div>

            {/* Send Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                onClick={handleFormSubmit}
                disabled={createTicketMutation.isPending || !subject.trim() || !description.trim()}
                className="w-10 h-10 rounded-full bg-nebula-periwinkle text-nebula-navy flex items-center justify-center hover:bg-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Column: Your requests + Common questions ── */}
        <div className="space-y-6">
          {/* Your Requests */}
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            <h3 className="text-base font-semibold text-white mb-4">Your requests</h3>

            {ticketsList.length === 0 ? (
              <p className="text-sm text-nebula-mist py-6 text-center">No tickets yet. Need help? Raise a Ticket</p>
            ) : (
              <div className="space-y-3">
                {ticketsList.slice(0, 5).map((t) => (
                  <Link key={t.id} to={`/portal/support/${t.rawId}`} className="block p-4 bg-nebula-navy rounded-xl border border-white/[0.04] hover:border-nebula-glow/30 transition-colors">
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-nebula-mist">{t.id}</span>
                      <span className="text-xs text-nebula-mist">· {t.category}</span>
                      <span className="text-xs text-nebula-mist ml-auto">{t.timeAgo}</span>
                    </div>
                    {/* Title */}
                    <p className="text-sm font-medium text-white mb-2">{t.title}</p>
                    {/* Status */}
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded text-xs font-medium ${
                        t.status === "resolved"
                          ? "bg-nebula-glow/10 text-nebula-glow"
                          : t.status === "in_progress"
                          ? "bg-nebula-sand/10 text-nebula-sand"
                          : "bg-white/[0.05] text-nebula-mist"
                      }`}
                    >
                      {t.status === "resolved"
                        ? "✓ Fixed in v2"
                        : t.status === "in_progress"
                        ? "In progress"
                        : "Waiting on you"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Common Questions (Accordion) */}
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            <h3 className="text-base font-semibold text-white mb-4">Common questions</h3>

            <div className="divide-y divide-white/[0.05]">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full flex items-center justify-between py-4 text-left group"
                  >
                    <span className="text-sm text-nebula-mist group-hover:text-white transition-colors pr-4">{item.q}</span>
                    <Plus
                      className={`w-4 h-4 text-nebula-mist shrink-0 transition-transform duration-200 ${
                        expandedFaq === i ? "rotate-45" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === i && (
                    <div className="pb-4 text-sm text-nebula-mist animate-in fade-in slide-in-from-top-2">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-nebula-surface text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-nebula-periwinkle" />
          {toastMessage}
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 text-nebula-mist hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Plan Bargain Call Modal */}
      <PlanBargainCallModal
        isOpen={bargainModalOpen}
        onClose={() => setBargainModalOpen(false)}
      />
    </div>
  );
}

export default PortalSupportPage;
