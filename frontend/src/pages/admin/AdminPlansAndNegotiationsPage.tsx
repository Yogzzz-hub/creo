import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  Clock,
  X,
  Phone,
  MessageSquare,
  CreditCard,
  Loader2,
  DollarSign,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Mail,
} from "lucide-react";
import { request } from "../../lib/http";

interface NegotiationItem {
  id: string;
  client_id: string;
  client_email: string;
  client_name: string;
  proposed_budget: string | null;
  contact_phone: string;
  preferred_window: string;
  target_topic: string | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  agreed_amount: number | null;
  razorpay_custom_plan_id: string | null;
  order_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function AdminPlansAndNegotiationsPage() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("id");
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal State for Edit & Set Final Amount
  const [activeModalItem, setActiveModalItem] = useState<NegotiationItem | null>(null);
  const [finalAmountInput, setFinalAmountInput] = useState<string>("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch Negotiations from Backend
  const { data, isLoading } = useQuery<{ negotiations: NegotiationItem[]; total: number }>({
    queryKey: ["admin-negotiations"],
    queryFn: () => request<{ negotiations: NegotiationItem[]; total: number }>("/api/negotiations"),
    refetchInterval: 5000,
  });

  const negotiationsList = data?.negotiations || [];

  // Auto-open modal if ?id= query param is passed from notification
  useEffect(() => {
    if (highlightId && negotiationsList.length > 0) {
      const match = negotiationsList.find((n) => n.id === highlightId);
      if (match) {
        setActiveModalItem(match);
        // Pre-fill amount
        if (match.agreed_amount) {
          setFinalAmountInput(String(match.agreed_amount));
        } else if (match.proposed_budget) {
          const digits = match.proposed_budget.replace(/[^0-9]/g, "");
          setFinalAmountInput(digits && Number(digits) > 5000 ? digits : "35000");
        } else {
          setFinalAmountInput("35000");
        }
      }
    }
  }, [highlightId, negotiationsList]);

  // Open modal handler
  const handleOpenEditModal = (item: NegotiationItem) => {
    setActiveModalItem(item);
    setModalError(null);
    if (item.agreed_amount) {
      setFinalAmountInput(String(item.agreed_amount));
    } else if (item.proposed_budget) {
      const digits = item.proposed_budget.replace(/[^0-9]/g, "");
      setFinalAmountInput(digits && Number(digits) > 5000 ? digits : "35000");
    } else {
      setFinalAmountInput("35000");
    }
  };

  // Approve & Generate Razorpay Checkout Mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      return request<{
        status: string;
        id: string;
        agreed_amount: number;
        order_id: string;
        key_id: string;
        message: string;
      }>(`/api/negotiations/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ agreed_amount: amount }),
      });
    },
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-negotiations"] });
      setToastMessage(
        `Plan APPROVED at ₹${vars.amount.toLocaleString("en-IN")}/mo! Razorpay order ${res.order_id} generated.`
      );
      setActiveModalItem(null);
      setTimeout(() => setToastMessage(null), 5000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to approve negotiation";
      setModalError(msg);
    },
  });

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalItem) return;

    const amountNum = parseInt(finalAmountInput.replace(/[^0-9]/g, ""), 10);
    if (!amountNum || amountNum < 1000) {
      setModalError("Please enter a valid negotiated monthly amount (min ₹1,000).");
      return;
    }

    approveMutation.mutate({
      id: activeModalItem.id,
      amount: amountNum,
    });
  };

  // Filtered List
  const filteredItems = negotiationsList.filter((item) => {
    const matchesStatus =
      statusFilter === "ALL" ? true : item.status === statusFilter;

    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      item.client_name.toLowerCase().includes(query) ||
      item.client_email.toLowerCase().includes(query) ||
      item.contact_phone.toLowerCase().includes(query) ||
      (item.proposed_budget && item.proposed_budget.toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  const pendingCount = negotiationsList.filter((n) => n.status === "PENDING").length;
  const approvedCount = negotiationsList.filter((n) => n.status === "APPROVED").length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161F2D] border border-[#2A3446] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30">
              Commercial Desk
            </span>
            <span className="text-xs text-[#97A0B3]">Direct Client Bargain Calls & Custom Retainers</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Plans & Negotiations
          </h1>
          <p className="text-xs sm:text-sm text-[#97A0B3] mt-1 max-w-2xl leading-relaxed">
            Review custom scope and discount consultation requests. Fix authoritative agreed retainers and dynamically generate Razorpay checkout orders for client sign-off.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl px-4 py-3 text-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">Pending</span>
            <span className="text-xl font-black text-white">{pendingCount}</span>
          </div>
          <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl px-4 py-3 text-center min-w-[100px]">
            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Approved</span>
            <span className="text-xl font-black text-white">{approvedCount}</span>
          </div>
        </div>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#161F2D] border border-[#2A3446] rounded-2xl">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-[#7FA0D6] text-[#050810] shadow-sm"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            All Requests ({negotiationsList.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-amber-400 text-[#050810] shadow-sm"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Action ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === "APPROVED"
                ? "bg-emerald-400 text-[#050810] shadow-sm"
                : "text-[#97A0B3] hover:text-white"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved Deals ({approvedCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#97A0B3]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, email, phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#2A3446] bg-[#161F2D] text-xs font-medium text-white placeholder:text-[#97A0B3] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6]/40 shadow-inner"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-12 text-center text-[#97A0B3] space-y-3">
          <Loader2 className="size-7 animate-spin mx-auto text-[#7FA0D6]" />
          <p className="text-xs font-bold">Loading custom plan negotiations...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-3xl p-12 text-center space-y-3 shadow-xl">
          <div className="size-12 rounded-2xl bg-[#0B111C] border border-[#2A3446] flex items-center justify-center mx-auto text-[#97A0B3]">
            <Search className="size-5" />
          </div>
          <h3 className="text-base font-bold text-white">No negotiations found</h3>
          <p className="text-xs text-[#97A0B3] max-w-sm mx-auto">
            {searchQuery
              ? `No requests match "${searchQuery}". Try clearing search filter.`
              : "No custom call or plan consultation requests in this tab."}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs font-bold text-[#7FA0D6] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isHighlighted = item.id === highlightId;
            const isApproved = item.status === "APPROVED";
            const cleanPhone = item.contact_phone.replace(/[^0-9]/g, "");
            const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `Hi ${item.client_name}, this is Creo Executive Team regarding your plan consultation request.`
            )}`;

            return (
              <div
                key={item.id}
                className={`bg-[#161F2D] border rounded-3xl p-6 transition-all shadow-xl space-y-5 ${
                  isHighlighted
                    ? "border-[#7FA0D6] ring-2 ring-[#7FA0D6]/30 bg-[#161F2D]/90"
                    : "border-[#2A3446] hover:border-[#7FA0D6]/40"
                }`}
              >
                {/* Top Row: Client Info & Status Badge */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Avatar & Names */}
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-[#1F2C3F] to-[#0B111C] border border-[#2A3446] text-[#7FA0D6] font-black text-base flex items-center justify-center shrink-0 shadow-inner">
                      {item.client_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-white">{item.client_name}</h3>
                        <span className="text-xs text-[#97A0B3] font-medium flex items-center gap-1">
                          <Mail className="size-3" /> {item.client_email}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#97A0B3] flex-wrap">
                        <span className="flex items-center gap-1 text-[#F8FAFC]">
                          <Phone className="size-3 text-[#7FA0D6]" /> {item.contact_phone}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-[#7FA0D6]" /> Preferred: {item.preferred_window}
                        </span>
                        {item.created_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge & Direct WhatsApp */}
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-400 hover:text-white hover:bg-emerald-800 text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <MessageSquare className="size-3.5" /> WhatsApp Call
                    </a>

                    <span
                      className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ${
                        isApproved
                          ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-400"
                          : "bg-amber-500/15 border border-amber-500/40 text-amber-400"
                      }`}
                    >
                      {isApproved ? <CheckCircle2 className="size-3.5" /> : <Clock className="size-3.5" />}
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Scope / Proposed Budget & Target Topic */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446]">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#97A0B3] block mb-0.5">
                      Target Topic
                    </span>
                    <p className="text-xs font-semibold text-white">
                      {item.target_topic || "Custom Pricing / Retainer Discount"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#97A0B3] block mb-0.5">
                      Proposed Budget / Target Scope
                    </span>
                    <p className="text-xs font-bold text-[#7FA0D6]">
                      {item.proposed_budget || "Open for consultation"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#97A0B3] block mb-0.5">
                      Agreed Final Retainer
                    </span>
                    {item.agreed_amount ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-emerald-400">
                          ₹{item.agreed_amount.toLocaleString("en-IN")}/mo
                        </span>
                        {item.order_id && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-mono">
                            {item.order_id.slice(-8)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#97A0B3] italic">Pending Admin Review</span>
                    )}
                  </div>
                </div>

                {/* Notes if provided */}
                {item.notes && (
                  <p className="text-xs text-[#97A0B3] bg-[#161F2D]/50 px-4 py-2.5 rounded-xl border border-[#2A3446]/60 leading-relaxed">
                    <span className="font-bold text-[#F8FAFC]">Client Notes:</span> {item.notes}
                  </p>
                )}

                {/* Bottom Row: Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#2A3446]/60">
                  <div className="text-[11px] text-[#97A0B3]">
                    {item.order_id ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <CreditCard className="size-3.5" /> Razorpay Order Ready:{" "}
                        <code className="text-[10px] text-white bg-[#0B111C] px-1.5 py-0.5 rounded border border-[#2A3446]">
                          {item.order_id}
                        </code>
                      </span>
                    ) : (
                      <span>No checkout order generated yet.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                        isApproved
                          ? "bg-[#1F2C3F] border border-[#2A3446] text-[#BCCCE6] hover:bg-[#2A3446] hover:text-white"
                          : "bg-[#BCCCE6] text-[#050810] hover:bg-white font-extrabold"
                      }`}
                    >
                      <DollarSign className="size-3.5" />
                      {isApproved ? "Edit & Set Final Amount" : "Edit & Set Final Amount"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: Edit & Set Final Amount ── */}
      {activeModalItem && (
        <div
          className="fixed inset-0 z-[99999] grid place-items-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-[fadeIn_0.15s_ease-out]"
          onClick={() => {
            if (!approveMutation.isPending) setActiveModalItem(null);
          }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-[#161F2D] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border border-[#2A3446] max-h-[90vh] overflow-y-auto text-[#F8FAFC] m-auto animate-[zoomIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModalItem(null)}
              disabled={approveMutation.isPending}
              className="absolute top-5 right-5 size-8 rounded-full bg-[#0B111C] border border-[#2A3446] text-[#97A0B3] hover:bg-[#2A3446] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#7FA0D6]/20 text-[#7FA0D6] border border-[#7FA0D6]/30 mb-2">
                  <Sparkles className="size-3" /> Authoritative Plan Agreement
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Edit & Set Final Amount
                </h3>
                <p className="text-xs text-[#97A0B3] mt-1 leading-relaxed">
                  Approve customized pricing for <span className="text-white font-bold">{activeModalItem.client_name}</span>. This dynamically provisions a live Razorpay order and sends checkout access directly to the Client Portal.
                </p>
              </div>

              {/* Client Brief Box */}
              <div className="p-4 rounded-2xl bg-[#0B111C] border border-[#2A3446] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Client Email:</span>
                  <span className="font-semibold text-white">{activeModalItem.client_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Contact WhatsApp:</span>
                  <span className="font-semibold text-white">{activeModalItem.contact_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#97A0B3]">Proposed Scope / Offer:</span>
                  <span className="font-bold text-[#7FA0D6]">
                    {activeModalItem.proposed_budget || "Not specified"}
                  </span>
                </div>
                {activeModalItem.notes && (
                  <div className="pt-2 border-t border-[#2A3446]/60 text-[#97A0B3]">
                    <span className="font-semibold text-[#F8FAFC]">Context:</span> {activeModalItem.notes}
                  </div>
                )}
              </div>

              {modalError && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleApproveSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#97A0B3] mb-2">
                    Final Negotiated Amount (₹ / Month) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-base text-[#7FA0D6]">
                      ₹
                    </span>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      value={finalAmountInput}
                      onChange={(e) => setFinalAmountInput(e.target.value)}
                      placeholder="e.g. 35000"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl border border-[#2A3446] bg-[#050810] text-base font-bold text-white placeholder:text-[#97A0B3] focus:outline-none focus:ring-2 focus:ring-[#7FA0D6] shadow-inner"
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="text-[10px] text-[#97A0B3] font-bold mr-1">Quick Select:</span>
                    {[25000, 35000, 50000, 75000, 95000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFinalAmountInput(String(preset))}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          finalAmountInput === String(preset)
                            ? "bg-[#7FA0D6] border-[#7FA0D6] text-[#050810] font-black"
                            : "bg-[#0B111C] border-[#2A3446] text-[#97A0B3] hover:text-white"
                        }`}
                      >
                        ₹{(preset / 1000).toFixed(0)}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B111C]/80 border border-[#2A3446] text-[11px] text-[#97A0B3] leading-relaxed flex items-start gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-[#7FA0D6] mt-0.5" />
                  <span>
                    Clicking approve will generate an authoritative Razorpay order ID for{" "}
                    <strong className="text-white">
                      ₹{Number(finalAmountInput || 0).toLocaleString("en-IN")}/mo
                    </strong>{" "}
                    and immediately render the Custom Negotiated Plan checkout card in the Client Portal.
                  </span>
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalItem(null)}
                    disabled={approveMutation.isPending}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#97A0B3] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={approveMutation.isPending}
                    className="px-6 py-2.5 rounded-full bg-[#BCCCE6] text-[#050810] hover:bg-white text-xs font-extrabold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {approveMutation.isPending ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Generating Razorpay Order...
                      </>
                    ) : (
                      <>
                        <CreditCard className="size-3.5" />
                        Approve & Generate Razorpay Checkout
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
