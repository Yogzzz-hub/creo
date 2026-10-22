import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { request } from "../../lib/http";
import { openRazorpayCheckout } from "../../lib/razorpay";

export interface SplitSummaryData {
  total_package_amount: number;
  total_paid: number;
  pending_balance: number;
  currency: string;
  next_due_date: string | null;
  active_package?: {
    id: string;
    title: string;
    total_package_amount: number;
    currency: string;
    instalments_count: number;
    status: string;
    created_at: string;
  } | null;
  instalments: Array<{
    id: string;
    instalment_number: number;
    amount: number;
    due_date: string;
    payment_date: string | null;
    status: "pending" | "paid" | "overdue" | "cancelled" | string;
    paid_transaction_id: string | null;
    notes: string | null;
  }>;
  payment_history: Array<{
    instalment_number: number;
    amount: number;
    payment_date: string | null;
    transaction_id: string | null;
    status: string;
    notes: string | null;
  }>;
}

export function SplitPaymentCard() {
  const queryClient = useQueryClient();
  const [payingInstalmentId, setPayingInstalmentId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data, isLoading } = useQuery<SplitSummaryData>({
    queryKey: ["split-payment-summary"],
    queryFn: () => request<SplitSummaryData>("/api/v1/payments/split-summary"),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return null;
  }

  // If client hasn't opted for split payment or no active package configured, do not render
  if (!data || !data.active_package || data.total_package_amount === 0) {
    return null;
  }

  const { total_package_amount, total_paid, pending_balance, currency, instalments, payment_history, next_due_date, active_package } = data;
  const pctPaid = total_package_amount > 0 ? Math.round((total_paid / total_package_amount) * 100) : 0;

  const handlePayInstalment = async (instalment: SplitSummaryData["instalments"][0]) => {
    setPayingInstalmentId(instalment.id);
    setActionMessage(null);
    try {
      await openRazorpayCheckout(
        {
          key: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "rzp_test_placeholder",
          amount: Math.round(instalment.amount * 100),
          currency: currency || "INR",
          name: `Creo · ${active_package.title}`,
          description: `Payment for Instalment #${instalment.instalment_number}`,
        },
        async (res) => {
          await request(`/api/v1/payments/instalments/${instalment.id}/mark-paid`, {
            method: "POST",
            body: JSON.stringify({ transaction_id: res.razorpay_payment_id, notes: "Paid via integrated gateway" }),
          });
          queryClient.invalidateQueries({ queryKey: ["split-payment-summary"] });
          queryClient.invalidateQueries({ queryKey: ["client-subscription"] });
          setActionMessage(`Payment confirmed! Instalment #${instalment.instalment_number} marked paid.`);
        },
        () => {
          setPayingInstalmentId(null);
        }
      );
    } catch (err: any) {
      setActionMessage(err?.message || "Could not launch payment gateway.");
    } finally {
      setPayingInstalmentId(null);
    }
  };

  return (
    <div className="bg-app-surface border border-app-line rounded-xl md:rounded-2xl p-3 sm:p-5 space-y-3.5">
      {/* Header */}
      <div
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex items-center justify-between cursor-pointer md:cursor-default select-none border-b border-app-line pb-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent shrink-0">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-base font-bold text-hi truncate">{active_package.title || "Split Payment Package"}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                {active_package.status}
              </span>
            </div>
            <p className="text-xs text-app-mist hidden sm:block">
              {instalments.length} Agreed Instalments · Balance and automated deadline alerts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {next_due_date && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-app-base border border-app-line text-xs font-semibold text-app-accent-soft">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Next Due: {new Date(next_due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
          )}
          <span className="text-app-accent md:hidden">
            {mobileOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </div>
      </div>

      <div className={`${mobileOpen ? "space-y-4" : "hidden md:block md:space-y-4"}`}>
        {actionMessage && (
          <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800/70 text-blue-300 text-xs font-semibold">
          {actionMessage}
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-app-base border border-app-line rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-app-mist">
            Total Package Amount
          </span>
          <p className="text-xl sm:text-2xl font-black text-hi">
            ₹{total_package_amount.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-app-mist">Agreed service package</p>
        </div>

        <div className="bg-app-base border border-emerald-500/20 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
            Amount Paid
          </span>
          <p className="text-xl sm:text-2xl font-black text-emerald-400">
            ₹{total_paid.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-app-mist">{pctPaid}% of total package cleared</p>
        </div>

        <div className="bg-app-base border border-amber-500/20 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
            Pending Balance
          </span>
          <p className="text-xl sm:text-2xl font-black text-amber-300">
            ₹{pending_balance.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-app-mist">Remaining to be collected</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-app-mist">
          <span className="font-semibold text-hi">Package Payment Progress</span>
          <span className="font-mono text-emerald-400 font-bold">{pctPaid}% Paid</span>
        </div>
        <div className="w-full h-2 rounded-full bg-app-base overflow-hidden border border-app-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-app-accent transition-all duration-500 text-app-on-accent!"
            style={{ width: `${Math.min(pctPaid, 100)}%` }}
          />
        </div>
      </div>

      {/* Instalments List */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-app-mist">
          Instalments Schedule & Deadlines
        </h4>
        <div className="space-y-2.5">
          {instalments.map((inst) => {
            const isPaid = inst.status === "paid";
            const isOverdue = inst.status === "overdue";
            const dueDate = new Date(inst.due_date);
            const isPaying = payingInstalmentId === inst.id;

            return (
              <div
                key={inst.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isPaid
                    ? "bg-app-base/60 border-emerald-500/30"
                    : isOverdue
                    ? "bg-rose-950/20 border-rose-500/40"
                    : "bg-app-base border-app-line"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                      isPaid
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : isOverdue
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : "bg-app-surface text-app-accent border border-app-line"
                    }`}
                  >
                    #{inst.instalment_number}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-hi">
                        ₹{inst.amount.toLocaleString("en-IN")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isPaid
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : isOverdue
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {inst.status}
                      </span>
                    </div>
                    <p className="text-xs text-app-mist mt-0.5">
                      {isPaid && inst.payment_date ? (
                        <>Paid on {new Date(inst.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
                      ) : (
                        <>Due date: {dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
                      )}
                      {inst.notes ? ` · ${inst.notes}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isPaying}
                      onClick={() => handlePayInstalment(inst)}
                      className="px-4 py-2 rounded-xl bg-app-accent hover:bg-app-accent text-app-base text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isPaying ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          Pay Now <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History Log */}
      {payment_history && payment_history.length > 0 && (
        <div className="pt-2 border-t border-app-line space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-app-mist">
              Instalment Payment History
            </h4>
            <span className="text-[11px] text-app-mist font-mono">{payment_history.length} records</span>
          </div>
          <div className="space-y-1.5">
            {payment_history.map((hist, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-app-base border border-app-line text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-hi font-medium">Instalment #{hist.instalment_number}</span>
                  <span className="text-app-mist">· ₹{hist.amount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex items-center gap-3 text-app-mist font-mono text-[11px]">
                  <span>{hist.payment_date ? new Date(hist.payment_date).toLocaleDateString() : "Recorded"}</span>
                  <span className="px-2 py-0.5 rounded-md bg-app-surface text-app-accent border border-app-line">
                    {hist.transaction_id ? hist.transaction_id.slice(0, 10) : "Verified"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
