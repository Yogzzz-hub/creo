import { Link } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { AdminCalendarPage } from "../../features/admin/AdminCalendarPage";
import { approveLeaveRequest, rejectLeaveRequest } from "../../lib/ops-api";

type Leave = { id: string; employee_name: string; start_date: string; end_date: string; reason: string; status: string; can_approve: boolean; can_reject: boolean; is_self: boolean };

export function PodScheduleLeavePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const leaves = useQuery({ queryKey: ["staff-leave", user?.id], queryFn: () => request<Leave[]>("/api/v1/admin/leave"), enabled: !!user?.id, staleTime: 30_000 });
  const review = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) => decision === "approve" ? approveLeaveRequest(id) : rejectLeaveRequest(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff-leave"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_leave_requests"] });
      void queryClient.invalidateQueries({ queryKey: ["pod_dashboard"] });
    },
  });
  const pending = (leaves.data ?? []).filter((leave) => leave.status === "pending");
  const history = (leaves.data ?? []).filter((leave) => leave.status !== "pending");
  return <div data-surface="ops" className="min-h-screen bg-[#0B111C] text-slate-100">
    <AdminTopHeader title="Team Schedule & Leave" activeTab="Team Details" />
    <main className="max-w-7xl mx-auto p-3 sm:p-6 pb-24 space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#161F2D] p-4 sm:p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4"><h2 className="text-xl font-semibold">Pending leave requests</h2><Link to="/workstation/schedule" className="min-h-11 inline-flex items-center px-4 rounded-xl bg-blue-500 text-sm">Request my leave</Link></div>
        {leaves.isPending && <p role="status" className="text-slate-400">Loading requests...</p>}
        {(leaves.error || review.error) && <p role="alert" className="text-rose-300 mb-3">{(leaves.error ?? review.error)?.message}</p>}
        {!leaves.isPending && !leaves.isError && pending.length === 0 && <p className="text-sm text-slate-400">No pending leave requests.</p>}
        <div className="grid sm:grid-cols-2 gap-3">{pending.map((leave) => <article key={leave.id} className="min-w-0 rounded-xl border border-slate-700 p-3 break-words"><h3 className="font-medium">{leave.employee_name}{leave.is_self ? " (you)" : ""}</h3><p className="text-sm text-slate-400 mt-1">{leave.start_date} → {leave.end_date}</p><p className="text-sm text-slate-300 mt-2">{leave.reason}</p><div className="flex flex-wrap gap-2 mt-3">{leave.can_approve && <button disabled={review.isPending} onClick={() => review.mutate({ id: leave.id, decision: "approve" })} className="min-h-11 px-4 rounded-lg bg-blue-500 disabled:opacity-50">Approve</button>}{leave.can_reject && <button disabled={review.isPending} onClick={() => review.mutate({ id: leave.id, decision: "reject" })} className="min-h-11 px-4 rounded-lg border border-slate-600 disabled:opacity-50">Reject</button>}</div></article>)}</div>
      </section>
      <AdminCalendarPage embedded />
      <section className="rounded-2xl border border-slate-800 p-4 sm:p-5"><h2 className="text-lg font-semibold mb-3">Leave history</h2>{!leaves.isPending && history.length === 0 && <p className="text-sm text-slate-400">No reviewed leave requests.</p>}<div className="space-y-2">{history.map((leave) => <div key={leave.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-[#161F2D] p-3 text-sm"><span>{leave.employee_name} • {leave.start_date} → {leave.end_date}</span><span className="capitalize text-slate-400">{leave.status}</span></div>)}</div></section>
    </main>
  </div>;
}
