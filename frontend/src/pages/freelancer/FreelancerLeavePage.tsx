import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  CalendarCheck2,
  ArrowRight,
  Palmtree,
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { AdminTopHeader } from "../../components/admin/AdminTopHeader";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface FreelancerLeaveItem {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  is_self: boolean;
  can_cancel: boolean;
  team_lead_name: string;
  created_at_ist?: string;
}

const btnTap = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.96 },
};

export function FreelancerLeavePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("Planned Holiday / Break");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const leavesQuery = useQuery({
    queryKey: ["staff-leave", user?.id],
    queryFn: () => request<FreelancerLeaveItem[]>("/api/v1/admin/leave"),
    staleTime: 30_000,
  });

  const myLeaves = (leavesQuery.data ?? []).filter((l) => l.is_self);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff-leave"] });
    void queryClient.invalidateQueries({ queryKey: ["admin_leave_requests"] });
  };

  const submitMutation = useMutation({
    mutationFn: () =>
      request("/api/v1/admin/leave", {
        method: "POST",
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          reason: `[Freelancer Blackout: ${category}] ${reason.trim()}`,
        }),
      }),
    onSuccess: () => {
      setNotice({ type: "success", text: "Unavailability period registered & sent to Project Leads." });
      setReason("");
      setStartDate("");
      setEndDate("");
      refresh();
    },
    onError: (err: any) => {
      setNotice({ type: "error", text: err?.message || "Failed to schedule unavailability period." });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => request(`/api/v1/admin/leave/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setNotice({ type: "success", text: "Blackout period cancelled successfully." });
      refresh();
    },
    onError: (err: any) => {
      setNotice({ type: "error", text: err?.message || "Failed to cancel request." });
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const calcDays = (s: string, e: string) => {
    const diff = new Date(e).getTime() - new Date(s).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const activePeriods = myLeaves.filter(
    (l) => l.status === "approved" && new Date(l.end_date) >= new Date()
  );
  const pendingLeaves = myLeaves.filter((l) => l.status === "pending");
  const totalApprovedDays = activePeriods.reduce((acc, l) => acc + calcDays(l.start_date, l.end_date), 0);
  const totalPendingDays = pendingLeaves.reduce((acc, l) => acc + calcDays(l.start_date, l.end_date), 0);

  return (
    <div className="min-h-screen bg-app-base text-slate-100 flex flex-col overflow-x-hidden">
      <AdminTopHeader activeTab="Time Off & Blackout" hideTitle />

      <main className="max-w-[1600px] w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 space-y-6 flex-1">
        {/* Status & Workload Impact Overview: Responsive Side-by-Side Cards (Mobile: 2 cols, Desktop: 5/7 aligned with bottom grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6 w-full">
          {/* Card 1: Upcoming Blackout Windows (aligns with Form - col-span-5) */}
          <motion.div
            whileHover={{ y: -2 }}
            className="col-span-1 lg:col-span-5 bg-app-surface border border-app-line hover:border-app-accent/50 rounded-2xl p-3.5 sm:p-5 lg:p-6 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-black text-app-mist uppercase tracking-wider leading-tight">
                  UPCOMING BLACKOUT WINDOWS
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-app-accent/15 text-app-accent flex items-center justify-center shrink-0">
                  <Palmtree className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-lg sm:text-2xl lg:text-3xl font-black text-app-accent tracking-tight">
                  {activePeriods.length} Scheduled
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-app-mist">
                  ({totalApprovedDays} {totalApprovedDays === 1 ? "day" : "days"} total)
                </span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-app-line text-[10px] sm:text-xs font-bold text-app-accent flex items-center gap-1.5 leading-snug">
              <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate sm:whitespace-normal">Out-of-office locked with Team Lead</span>
            </div>
          </motion.div>

          {/* Card 2: Pending Coordination (aligns with History - col-span-7) */}
          <motion.div
            whileHover={{ y: -2 }}
            className="col-span-1 lg:col-span-7 bg-app-surface border border-app-line hover:border-amber-500/50 rounded-2xl p-3.5 sm:p-5 lg:p-6 transition-all shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-black text-app-mist uppercase tracking-wider leading-tight">
                  PENDING COORDINATION
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                <span className="text-lg sm:text-2xl lg:text-3xl font-black text-amber-400 tracking-tight">
                  {pendingLeaves.length} Under Review
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-app-mist">
                  ({totalPendingDays} {totalPendingDays === 1 ? "day" : "days"} requested)
                </span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-app-line text-[10px] sm:text-xs font-bold text-amber-400 flex items-center gap-1.5 leading-snug">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate sm:whitespace-normal">Awaiting Team Lead & Admin coordination sign-off</span>
            </div>
          </motion.div>
        </div>

        {/* Notice feedback */}
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                notice.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {notice.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span>{notice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="opacity-70 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Blackout Application Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-5 bg-app-surface border-2 border-app-accent rounded-2xl p-4 sm:p-6 shadow-[0_0_20px_rgba(127,160,214,0.22)] hover:shadow-[0_0_30px_rgba(127,160,214,0.35)] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2.5 pb-4 border-b border-app-line">
                <Palmtree className="w-5 h-5 text-app-accent" />
                <div>
                  <h2 className="text-sm font-bold text-hi uppercase tracking-wider">
                    Schedule Blackout Period
                  </h2>
                  <p className="text-[11px] text-app-mist">Inform team leads of unavailable dates</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotice(null);
                  submitMutation.mutate();
                }}
                className="space-y-4 pt-4"
              >
                {/* Category */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-app-mist mb-1.5">
                    Blackout Reason
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Holiday / Vacation",
                      "Personal Commitment",
                      "Studio Maintenance",
                      "Medical / Rest",
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-2.5 sm:px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold text-center transition-all cursor-pointer border ${
                          category === cat
                            ? "bg-app-accent text-app-base border-app-accent font-bold shadow-md shadow-app-accent/20"
                            : "bg-app-base border-app-line text-app-mist hover:text-hi hover:border-app-accent/50"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-app-mist mb-1">
                      Start Date
                    </label>
                    <input
                      required
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-app-base border border-app-line focus:border-app-accent rounded-xl px-3 py-2 text-xs text-hi [color-scheme:dark] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-app-mist mb-1">
                      End Date
                    </label>
                    <input
                      required
                      type="date"
                      min={startDate || today}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-app-base border border-app-line focus:border-app-accent rounded-xl px-3 py-2 text-xs text-hi [color-scheme:dark] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Duration */}
                {startDate && endDate && (
                  <div className="bg-app-base border border-app-accent/40 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
                    <span className="text-app-mist">Unavailable Duration:</span>
                    <span className="text-app-accent font-bold font-mono">
                      {calcDays(startDate, endDate)} Day(s)
                    </span>
                  </div>
                )}

                {/* Notes for Project Leads */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-app-mist mb-1">
                    Notes for Project Leads
                  </label>
                  <textarea
                    required
                    maxLength={1500}
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="E.g., will deliver all active drafts before departure; emergency contact if necessary..."
                    className="w-full bg-app-base border border-app-line focus:border-app-accent rounded-xl p-3 text-xs text-hi placeholder:text-[#97A0B3]/50 outline-none transition-colors"
                  />
                </div>

                <motion.button
                  type="submit"
                  {...btnTap}
                  disabled={submitMutation.isPending || !startDate || !endDate || !reason.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-app-accent to-hi text-app-base text-xs font-black shadow-lg shadow-app-accent/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitMutation.isPending ? "Submitting..." : "Confirm Blackout Dates"}</span>
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Scheduled Blackout History */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 bg-app-surface border-2 border-app-accent rounded-2xl p-4 sm:p-6 shadow-[0_0_20px_rgba(127,160,214,0.22)] hover:shadow-[0_0_30px_rgba(127,160,214,0.35)] transition-all flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-app-line">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-app-accent" />
                <div>
                  <h2 className="text-sm font-bold text-hi uppercase tracking-wider">
                    Scheduled Blackout Windows
                  </h2>
                  <p className="text-[11px] text-app-mist">{myLeaves.length} Total record(s)</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex-1 space-y-3 overflow-y-auto max-h-[580px] pr-1">
              {leavesQuery.isPending && (
                <CreoInlineLoader compact label="Loading schedule" />
              )}

              {!leavesQuery.isPending && myLeaves.length === 0 && (
                <div className="py-16 text-center border border-dashed border-app-line rounded-2xl space-y-2">
                  <CalendarCheck2 className="w-8 h-8 text-[#97A0B3]/40 mx-auto" />
                  <p className="text-xs font-bold text-app-mist">No blackout dates scheduled.</p>
                  <p className="text-[11px] text-[#97A0B3]/60">You are currently marked as available for projects.</p>
                </div>
              )}

              {myLeaves.map((leave) => {
                const days = calcDays(leave.start_date, leave.end_date);
                const isPending = leave.status === "pending";
                const isApproved = leave.status === "approved";

                return (
                  <motion.div
                    key={leave.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-app-base border border-app-line hover:border-app-accent/60 rounded-xl p-3.5 sm:p-4 space-y-3 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <CalendarIcon className="w-4 h-4 text-app-accent shrink-0" />
                        <span className="text-xs font-bold text-hi whitespace-nowrap">
                          {leave.start_date} <ArrowRight className="w-3 h-3 inline mx-0.5 text-app-mist" /> {leave.end_date}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-app-accent/10 text-app-accent border border-app-accent/20 shrink-0 whitespace-nowrap">
                          {days} Day{days > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center self-start sm:self-auto">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : isApproved
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-app-mist leading-relaxed break-words">{leave.reason}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-app-line/60 text-[11px]">
                      <span className="text-app-mist/80">
                        Reviewer: <span className="text-hi font-medium">{leave.team_lead_name || "Creative Pod Lead"}</span>
                      </span>

                      {leave.can_cancel && (
                        <motion.button
                          type="button"
                          {...btnTap}
                          disabled={cancelMutation.isPending}
                          onClick={() => cancelMutation.mutate(leave.id)}
                          className="px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-[10px] font-bold transition-all cursor-pointer shrink-0"
                        >
                          Withdraw Blackout
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
