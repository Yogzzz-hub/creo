import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { request } from "../../lib/http";
import { useConfirm } from "../ui/ConfirmDialog";

export function AutoPaySettings() {
  const queries = useQueryClient();
  const confirm = useConfirm();
  const status = useQuery({ queryKey: ["autopay-settings"], queryFn: () => request<{ autopay?: { enabled: boolean; recurring: boolean; provider_status: string; pause_request_status: string | null; paid_until: string } }>("/api/v1/payments/subscription"), refetchInterval: 30000 });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const auto = status.data?.autopay;
  const pending = auto?.pause_request_status === "pending";
  const paused = auto?.provider_status === "paused";
  async function act(resume: boolean) {
    if (resume && !await confirm({ title: pending ? "Withdraw pause request?" : "Resume Razorpay AutoPay?", description: "Automatic monthly charges will remain enabled under your Razorpay mandate.", confirmText: "Keep AutoPay enabled", tone: "info" })) return;
    setBusy(true); setMessage("");
    try {
      const result = await request<{ message: string }>(`/api/v1/payments/subscription/${resume ? "resume" : "pause"}`, { method: "POST", body: resume ? undefined : JSON.stringify({ reason: reason || "Pause next month" }) });
      setMessage(result.message); void status.refetch(); void queries.invalidateQueries({ queryKey: ["client-subscription"] });
    } catch (err) { setMessage(err instanceof Error ? err.message : "Billing request failed."); }
    finally { setBusy(false); }
  }
  return (
    <section className="rounded-xl md:rounded-[24px] border border-[#2A3446] bg-[#161F2D] p-3.5 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
      <div 
        onClick={() => setMobileOpen(prev => !prev)}
        className="flex items-center justify-between cursor-pointer md:cursor-default select-none"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <CreditCard className="size-5 sm:size-6 text-[#7FA0D6]" />
          <div>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-white">Razorpay AutoPay</h2>
            <p className="text-xs sm:text-sm text-[#97A0B3]">Monthly renewal and next-cycle pause requests</p>
          </div>
        </div>
        <div className="md:hidden text-[#7FA0D6] p-0.5">
          {mobileOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </div>
      <div className={`${mobileOpen ? "block" : "hidden md:block"} space-y-3 sm:space-y-4`}>
        {status.isPending && <p role="status" className="text-xs sm:text-sm">Loading renewal settings…</p>}
        {status.isError && <p role="alert" className="text-xs sm:text-sm text-[#D8BF9B]">{status.error.message}<button onClick={() => void status.refetch()} className="ml-2 underline">Retry</button></p>}
        {auto && (
          <>
            <p className="text-xs sm:text-sm text-[#BCCCE6] flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0" />
              <span>{pending ? "Pause requested — awaiting admin approval" : paused ? "Future renewal charges paused" : auto.enabled ? "Monthly AutoPay active" : auto.recurring ? "Mandate awaiting confirmation" : "No recurring AutoPay mandate linked"}</span>
            </p>
            <p className="text-xs sm:text-sm text-[#97A0B3] leading-relaxed">
              {auto.paid_until && <>Current paid access ends {new Date(auto.paid_until).toLocaleDateString()}. </>}
              Submitting a request keeps AutoPay active. Your admin must approve before future charges stop. An approved pause remains in place until you resume.
            </p>
            {auto.recurring && !pending && !paused && (
              <>
                <label className="block text-xs sm:text-sm text-[#97A0B3]">
                  Reason for pausing next month
                  <textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={1000} rows={2} className="mt-1.5 w-full rounded-xl border border-[#2A3446] bg-[#0B111C] p-2.5 sm:p-3 text-xs sm:text-sm text-white resize-none" />
                </label>
                <button disabled={busy || !auto.enabled} onClick={() => void act(false)} className="rounded-xl border border-[#D8BF9B] px-3.5 sm:px-4 py-2 text-xs sm:text-sm text-[#D8BF9B] disabled:opacity-50 cursor-pointer">
                  {busy ? "Sending…" : "Request pause for next month"}
                </button>
              </>
            )}
            {(pending || paused) && (
              <button disabled={busy} onClick={() => void act(true)} className="rounded-xl bg-[#BCCCE6] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#0B111C] disabled:opacity-50 cursor-pointer">
                {busy ? "Updating…" : pending ? "Withdraw pause request" : "Resume monthly AutoPay"}
              </button>
            )}
          </>
        )}
        {message && <p role="status" className="text-xs sm:text-sm text-[#D8BF9B]">{message}</p>}
      </div>
    </section>
  );
}
