import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  CreditCard,
  Plus,
  Trash2,
  CheckCircle2,
  Bell,
  Loader2,
} from "lucide-react";
import { request } from "../../lib/http";
import { CustomSelect } from "../ui/CustomSelect";

export interface AdminSplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  onSuccess?: () => void;
}

interface InstalmentDraft {
  amount: number;
  due_date: string;
  notes: string;
}

export function AdminSplitPaymentModal({
  isOpen,
  onClose,
  clientId: initialClientId,
  clientName,
  onSuccess,
}: AdminSplitPaymentModalProps) {
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [title, setTitle] = useState("Custom Production Package");
  const [totalAmount, setTotalAmount] = useState<number>(20000);
  const [instalmentDrafts, setInstalmentDrafts] = useState<InstalmentDraft[]>([
    {
      amount: 10000,
      due_date: (new Date().toISOString().split("T")[0] as string) || "",
      notes: "First instalment at kickoff",
    },
    {
      amount: 10000,
      due_date: (new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] as string) || "",
      notes: "Second instalment due on milestone delivery",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch client roster if clientId is not locked
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["admin-clients-simple"],
    queryFn: async () => {
      try {
        const res = await request<any[]>("/api/v1/admin/clients");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: isOpen && !initialClientId,
  });

  // Fetch current client split summary if client selected
  const activeCId = initialClientId || selectedClientId;
  const { data: clientSummary, refetch: refetchSummary } = useQuery<any>({
    queryKey: ["admin-client-split-summary", activeCId],
    queryFn: () => request<any>(`/api/v1/payments/split-summary?client_id=${activeCId}`),
    enabled: isOpen && !!activeCId,
  });

  if (!isOpen) return null;

  const currentSum = instalmentDrafts.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCId) {
      setActionError("Please select a client.");
      return;
    }
    if (instalmentDrafts.length === 0) {
      setActionError("Please configure at least one instalment.");
      return;
    }
    if (Math.abs(currentSum - totalAmount) > 1) {
      setActionError(`Instalment sum (₹${currentSum}) does not match Total Package Amount (₹${totalAmount}).`);
      return;
    }
    setActionError(null);
    setIsSubmitting(true);
    try {
      await request("/api/v1/payments/split-packages", {
        method: "POST",
        body: JSON.stringify({
          client_id: activeCId,
          total_package_amount: totalAmount,
          currency: "INR",
          title: title.trim(),
          instalments: instalmentDrafts.map((inst) => ({
            amount: Number(inst.amount),
            due_date: inst.due_date,
            notes: inst.notes || null,
          })),
        }),
      });
      setActionSuccess("Split payment package configured successfully with automated reminders!");
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["split-payment-summary"] });
      onSuccess?.();
    } catch (err: any) {
      setActionError(err?.message || "Failed to configure split payment package.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (instalmentId: string) => {
    setActionError(null);
    try {
      await request(`/api/v1/payments/instalments/${instalmentId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ notes: "Marked paid manually by agency admin" }),
      });
      setActionSuccess("Instalment marked as paid and client receipt logged.");
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["split-payment-summary"] });
    } catch (err: any) {
      setActionError(err?.message || "Could not mark instalment paid.");
    }
  };

  const handleSendReminder = async (instalmentId: string) => {
    setActionError(null);
    try {
      const res = await request<any>(`/api/v1/payments/instalments/${instalmentId}/remind`, {
        method: "POST",
      });
      setActionSuccess(res.message || "Payment reminder dispatched to client!");
      refetchSummary();
    } catch (err: any) {
      setActionError(err?.message || "Could not dispatch payment reminder.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-app-surface border border-app-line rounded-3xl w-full max-w-2xl p-5 sm:p-6 space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-app-line shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-hi">Split Payment & Instalment Manager</h3>
              <p className="text-xs text-app-mist">
                {clientName ? `Client: ${clientName}` : "Divide service package into scheduled instalments"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-app-line bg-app-base flex items-center justify-center text-app-mist hover:text-hi transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banners */}
        {actionError && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/70 text-rose-300 text-xs font-semibold shrink-0">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/70 text-emerald-300 text-xs font-semibold shrink-0">
            {actionSuccess}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1 scrollbar-thin">
          {/* Active Package Status if already exists */}
          {clientSummary?.active_package && (
            <div className="bg-app-base border border-app-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-hi">Active Split Package</span>
                  <p className="text-[11px] text-app-mist">{clientSummary.active_package.title}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {clientSummary.active_package.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-app-line text-xs">
                <div>
                  <span className="text-[10px] uppercase text-app-mist block">Total</span>
                  <span className="font-bold text-hi">₹{clientSummary.total_package_amount?.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-app-mist block">Paid</span>
                  <span className="font-bold text-emerald-400">₹{clientSummary.total_paid?.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-app-mist block">Pending</span>
                  <span className="font-bold text-amber-300">₹{clientSummary.pending_balance?.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Existing Instalments Actions */}
              <div className="space-y-2 pt-2 border-t border-app-line">
                <span className="text-[11px] font-bold uppercase tracking-wider text-app-mist">
                  Instalment Tracking & Reminders
                </span>
                {clientSummary.instalments?.map((inst: any) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-xl bg-app-surface border border-app-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-hi">Instalment #{inst.instalment_number}</span>
                        <span className="font-mono text-app-accent">₹{inst.amount?.toLocaleString("en-IN")}</span>
                        <span
                          className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                            inst.status === "paid" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {inst.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-app-mist mt-0.5">
                        Due: {new Date(inst.due_date).toLocaleDateString()} {inst.notes ? ` · ${inst.notes}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {inst.status !== "paid" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSendReminder(inst.id)}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Send 2-day reminder or manual alert"
                          >
                            <Bell className="w-3 h-3" /> Remind Client
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(inst.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-app-on-accent! text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Mark Paid
                          </button>
                        </>
                      ) : (
                        <span className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Split Package Form */}
          <form onSubmit={handleCreatePackage} className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-mist">
              {clientSummary?.active_package ? "Configure New Split Package" : "Configure Agreed Service Package"}
            </h4>

            {!initialClientId && (
              <div>
                <label className="block text-xs font-semibold text-app-ink-2 mb-1">Select Client</label>
                <CustomSelect
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  ariaLabel="Select Client"
                  className="w-full"
                  placeholder="-- Choose Client --"
                  options={[
                    { value: "", label: "-- Choose Client --" },
                    ...clients.map((c) => ({
                      value: c.client_id || c.id,
                      label: c.company_name || c.full_name || c.email,
                    })),
                  ]}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-app-ink-2 mb-1">Package Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 20K Quarterly Production Package"
                  className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-xs text-hi focus:outline-none focus:border-app-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-app-ink-2 mb-1">Total Agreed Amount (₹)</label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  placeholder="20000"
                  className="w-full bg-app-base border border-app-line rounded-xl px-3 py-2 text-xs text-hi font-mono focus:outline-none focus:border-app-accent"
                />
              </div>
            </div>

            {/* Instalments Breakdown Editor */}
            <div className="space-y-3 pt-2 border-t border-app-line">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-app-ink-2">Divide into Instalments</span>
                  <p className="text-[11px] text-app-mist">
                    Current Sum: ₹{currentSum.toLocaleString("en-IN")} of ₹{totalAmount.toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInstalmentDrafts([
                      ...instalmentDrafts,
                      {
                        amount: Math.max(0, totalAmount - currentSum),
                        due_date: (new Date().toISOString().split("T")[0] as string) || "",
                        notes: "",
                      },
                    ])
                  }
                  className="px-3 py-1 rounded-lg bg-app-accent text-app-base hover:bg-app-accent-soft text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Instalment
                </button>
              </div>

              <div className="space-y-2.5">
                {instalmentDrafts.map((draft, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-app-base border border-app-line rounded-2xl flex flex-col sm:flex-row items-center gap-2.5"
                  >
                    <span className="w-6 h-6 rounded-lg bg-app-surface text-app-accent flex items-center justify-center text-xs font-bold font-mono shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="number"
                        placeholder="Amount (₹)"
                        value={draft.amount}
                        onChange={(e) => {
                          const next = [...instalmentDrafts];
                          const target = next[idx];
                          if (target) {
                            next[idx] = { ...target, amount: Number(e.target.value) };
                            setInstalmentDrafts(next);
                          }
                        }}
                        className="bg-app-surface border border-app-line rounded-xl px-2.5 py-1.5 text-xs text-hi font-mono focus:border-app-accent focus:outline-none"
                      />
                      <input
                        type="date"
                        value={draft.due_date}
                        onChange={(e) => {
                          const next = [...instalmentDrafts];
                          const target = next[idx];
                          if (target) {
                            next[idx] = { ...target, due_date: e.target.value };
                            setInstalmentDrafts(next);
                          }
                        }}
                        className="bg-app-surface border border-app-line rounded-xl px-2.5 py-1.5 text-xs text-hi focus:border-app-accent focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Milestone note..."
                        value={draft.notes}
                        onChange={(e) => {
                          const next = [...instalmentDrafts];
                          const target = next[idx];
                          if (target) {
                            next[idx] = { ...target, notes: e.target.value };
                            setInstalmentDrafts(next);
                          }
                        }}
                        className="bg-app-surface border border-app-line rounded-xl px-2.5 py-1.5 text-xs text-hi focus:border-app-accent focus:outline-none"
                      />
                    </div>
                    {instalmentDrafts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setInstalmentDrafts(instalmentDrafts.filter((_, i) => i !== idx))}
                        className="text-app-mist hover:text-rose-400 p-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-app-line flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-app-line bg-app-base text-xs font-semibold text-hi hover:bg-app-surface transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Math.abs(currentSum - totalAmount) > 1}
                className="px-5 py-2 rounded-full bg-app-accent-soft hover:bg-hi text-app-base text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>Save & Activate Instalment Schedule</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
