import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useConfirm } from "../ui/ConfirmDialog";
type PauseRequest = { id: string; client_name: string; reason: string; effective_at: string; status: string };
export function BillingPauseRequests() {
  const confirm = useConfirm();
  const requests = useQuery({ queryKey: ["billing-pause-requests"], queryFn: () => request<PauseRequest[]>("/api/v1/payments/subscription/pause-requests"), refetchInterval: 30000 });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  async function review(item: PauseRequest, approve: boolean) {
    if (!await confirm({ title: approve ? "Approve AutoPay pause?" : "Decline pause request?", description: approve ? `Razorpay will stop future charges for ${item.client_name}. Current paid access continues until ${new Date(item.effective_at).toLocaleDateString()}.` : "The client’s AutoPay remains active.", confirmText: approve ? "Approve and pause renewal" : "Decline request", tone: "warning" })) return;
    setBusy(item.id); setError("");
    try { await request(`/api/v1/payments/subscription/pause-requests/${item.id}/review`, { method: "POST", body: JSON.stringify({ approve }) }); void requests.refetch(); }
    catch (err) { setError(err instanceof Error ? err.message : "Razorpay did not confirm this change."); }
    finally { setBusy(""); }
  }
  return <section className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-5 space-y-4"><h2 className="text-lg font-bold text-white">AutoPay pause approvals</h2><p className="text-sm text-[#97A0B3]">Clients remain on automatic renewal until you approve and Razorpay confirms the pause.</p>{(error || requests.isError) && <p role="alert" className="text-[#D8BF9B]">{error || requests.error?.message}</p>}{requests.isPending && <p>Loading requests…</p>}{requests.data?.length === 0 && <p className="text-sm text-[#97A0B3]">No pause requests.</p>}{requests.data?.map(item => <article key={item.id} className="rounded-xl border border-[#2A3446] p-4 space-y-2"><div className="flex justify-between gap-3"><h3 className="font-semibold text-white">{item.client_name || "Client"}</h3><span className="capitalize text-sm text-[#BCCCE6]">{item.status}</span></div><p className="text-sm text-[#97A0B3]">Next renewal: {new Date(item.effective_at).toLocaleDateString()}</p><p className="text-sm text-white whitespace-pre-wrap">{item.reason}</p>{item.status === "pending" && <div className="flex gap-3"><button disabled={!!busy} onClick={() => void review(item, true)} className="rounded-lg bg-[#BCCCE6] px-4 py-2 text-[#0B111C] disabled:opacity-50">{busy === item.id ? "Checking Razorpay…" : "Approve pause"}</button><button disabled={!!busy} onClick={() => void review(item, false)} className="rounded-lg border border-[#2A3446] px-4 py-2 text-[#D8BF9B]">Decline</button></div>}</article>)}</section>;
}
