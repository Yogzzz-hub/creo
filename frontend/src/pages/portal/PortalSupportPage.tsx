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
  { q: "How do I request changes on a deliverable?", a: "In the Review section, select 'Request change' and describe your feedback. Your dedicated creative pod will deliver an updated version within your plan's turnaround SLA." },
  { q: "What happens if I miss a review deadline?", a: "Deliverables undergo standard 5-business-day auto-approval to keep production on cadence. You will receive notifications before auto-approval occurs." },
  { q: "Can I add more reels or posts mid-cycle?", a: "Yes! You can purchase Add-on top-up packs directly from the Plan & billing page. They apply immediately to your current cycle." },
  { q: "How do revision rounds work per plan?", a: "Revision rounds per deliverable depend on your plan: 1 round for Starter, 2 rounds for Growth, and 3 rounds for Scale. Leaving clear feedback ensures your pod gets it right on the next iteration." },
  { q: "What are the SLA turnaround promises per plan?", a: "Starter features 3 business days turnaround per deliverable batch, Growth offers 2 business days, and Scale offers 24-hour priority turnaround." },
];

export function PortalSupportPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subData, isLoading: isSubLoading } = useQuery({
    queryKey: ["client-subscription", user?.id],
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
    if (createTicketMutation.isPending) return;
    if (!subject.trim() || !description.trim()) {
      showToast("Please fill in both subject and description.");
      return;
    }

    createTicketMutation.mutate({ title: subject.trim(), description: description.trim(), priority: "medium" });
  };

  if (isSubLoading || isTicketsLoading) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Support Desk" className="min-h-[45vh]" />;
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-16 min-w-0">


      {/* ── Retainer Notice Banner (Informative & Actionable, Never Blocking Support) ── */}
      {isExpired && !isStaffOrAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-hi">Retainer Subscription Inactive or Expired</h4>
              <p className="text-xs text-app-mist mt-0.5">
                Deliverable pipelines and asset reviews are currently paused. Our support desk is 100% active to assist you with renewal, custom quota arrangements, or billing questions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setBargainModalOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-app-base border border-app-line text-app-accent text-xs font-bold cursor-pointer transition-colors enabled:hover:bg-app-line-soft enabled:hover:border-app-accent enabled:hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface"
            >
              <PhoneCall className="size-3.5" />
              <span>Call & Bargain</span>
            </button>
            <Link
              to="/portal/payments"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-app-accent-soft hover:bg-hi text-app-base text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <span>Renew Retainer</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Help Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* ── Left Column: Ask your pod (Form) ── */}
        <div className="bg-app-surface rounded-2xl p-6 border border-app-line min-w-0">
          <h3 className="text-base font-semibold text-hi mb-5">Ask your pod</h3>

          <form onSubmit={handleFormSubmit} className="space-y-5 min-w-0">
            {/* Category Pills */}
            <div>
              <label className="block text-sm text-app-mist mb-2">What is it about?</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    aria-pressed={selectedCategory === cat}
                    className={`min-h-11 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors ${
                      selectedCategory === cat
                        ? "bg-app-accent-soft text-app-base hover:bg-app-ink-3"
                        : "bg-transparent border border-app-line text-app-accent-soft hover:bg-app-line-soft hover:border-app-accent hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Input */}
            <div>
              <label htmlFor="support-subject" className="block text-sm text-app-mist mb-2">Subject</label>
              <input
                id="support-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly summarize your request..."
                className="w-full bg-app-base border border-app-line rounded-xl p-3 text-sm text-hi placeholder-app-mist focus:outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label htmlFor="support-message" className="block text-sm text-app-mist mb-2">Message</label>
              <textarea
                id="support-message"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue or request..."
                className="w-full bg-app-base border border-app-line rounded-xl p-3 text-sm text-hi placeholder-app-mist focus:outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 resize-none transition-colors"
              />
            </div>

            {/* Send Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createTicketMutation.isPending || !subject.trim() || !description.trim()}
                className="min-h-11 px-5 gap-2 rounded-xl bg-app-accent-soft text-app-base text-sm font-semibold flex items-center justify-center enabled:hover:bg-app-ink-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createTicketMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {createTicketMutation.isPending ? "Sending..." : "Send request"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Column: Your requests + Common questions ── */}
        <div className="space-y-6 min-w-0">
          {/* Your Requests */}
          <div className="bg-app-surface rounded-2xl p-6 border border-app-line min-w-0">
            <h3 className="text-base font-semibold text-hi mb-4">Your requests</h3>

            {ticketsList.length === 0 ? (
              <p className="text-sm text-app-mist py-6 text-center">No tickets yet. Need help? Raise a Ticket</p>
            ) : (
              <div className="space-y-3">
                {ticketsList.slice(0, 5).map((t) => (
                  <Link key={t.id} to={`/portal/support/${t.rawId}`} className="block p-4 bg-app-base rounded-xl border border-hi/[0.04] hover:border-app-accent/30 transition-colors">
                    {/* Top row */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-mono text-app-mist">{t.id}</span>
                      <span className="text-xs text-app-mist">· {t.category}</span>
                      <span className="text-xs text-app-mist ml-auto">{t.timeAgo}</span>
                    </div>
                    {/* Title */}
                    <p className="text-sm font-medium text-hi mb-2">{t.title}</p>
                    {/* Status */}
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded text-xs font-medium ${
                        t.status === "resolved"
                          ? "bg-app-accent/10 text-app-accent"
                          : t.status === "in_progress"
                          ? "bg-app-warm/10 text-app-warm"
                          : "bg-hi/[0.05] text-app-mist"
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
          <div className="bg-app-surface rounded-2xl p-6 border border-app-line min-w-0">
            <h3 className="text-base font-semibold text-hi mb-4">Common questions</h3>

            <div className="divide-y divide-hi/[0.05]">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    aria-expanded={expandedFaq === i}
                    aria-controls={`support-faq-${i}`}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-4 text-left group cursor-pointer transition-colors hover:bg-app-line-soft"
                  >
                    <span className="text-sm text-app-mist group-hover:text-hi transition-colors pr-4">{item.q}</span>
                    <Plus
                      className={`w-4 h-4 text-app-mist shrink-0 transition-transform duration-200 ${
                        expandedFaq === i ? "rotate-45" : ""
                      }`}
                    />
                  </button>
                  {expandedFaq === i && (
                    <div id={`support-faq-${i}`} className="px-3 pb-4 text-sm leading-6 text-app-mist animate-in fade-in slide-in-from-top-2">
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
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-[calc(100vw-2rem)] z-50 bg-app-surface text-hi px-5 py-3 rounded-xl shadow-2xl border border-hi/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-app-accent-soft" />
          {toastMessage}
          <button type="button" onClick={() => setToastMessage(null)} className="ml-2 text-app-mist hover:text-hi cursor-pointer">
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
