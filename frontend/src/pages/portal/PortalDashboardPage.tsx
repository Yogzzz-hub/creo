import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { ResumeOnboardingBanner } from "../../components/portal/ResumeOnboardingBanner";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";

/* ── Types ── */
export interface TeamHandler {
  id: string;
  name: string;
  email: string;
  raw_role: string;
  role: string;
  is_primary?: boolean;
  pod_name?: string;
}

interface DashboardData {
  pending_deliverable_count: number;
  open_ticket_count: number;
  ai_summary_line: string | null;
  onboarding_stage: number;
  brand_summary: string | null;
  account_status?: string;
  active_plan?: {
    status: string;
    name?: string;
    price_minor?: number;
    monthly_price?: number;
    poster_quota?: number;
    reel_quota?: number;
    story_quota?: number;
    current_period_end?: string | null;
  } | null;
  company?: { name?: string } | null;
  created_at?: string | null;
  assigned_team?: TeamHandler[];
}




function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function PortalDashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const gate = useOnboardingGate();
  const isLocked = !gate.isComplete;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // The dashboard endpoint rejects clients that haven't finished onboarding, so don't call it until then
  const { data: dashboard, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: async () => {
      return await request<DashboardData>("/api/v1/portal/dashboard");
    },
    enabled: !isLocked,
    refetchInterval: 2 * 60_000,
  });

  const subscriptionActive = !!dashboard?.active_plan && ["active", "trialing"].includes(dashboard?.active_plan?.status);

  const { data: deliverablesData } = useQuery<{ items: any[]; waiting_on_you: number }>({
    queryKey: ["portal-dashboard-deliverables", user?.id],
    queryFn: async () => {
      try {
        return await request<any>("/api/v1/portal/deliverables?limit=6");
      } catch {
        return { items: [], waiting_on_you: 0 };
      }
    },
    enabled: subscriptionActive,
    refetchInterval: 2 * 60_000,
  });

  const { data: upcomingEntries = [] } = useQuery<any[]>({
    queryKey: ["portal-dashboard-calendar-upcoming", user?.id],
    queryFn: async () => {
      try {
        const res = await request<any[]>("/api/v1/calendar/entries");
        if (!Array.isArray(res)) return [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in7Days = new Date(now.getTime() + 7 * 86400000);
        return res
          .filter((e) => {
            const d = new Date(e.date);
            return d >= now && d <= in7Days;
          })
          .slice(0, 6);
      } catch {
        return [];
      }
    },
    enabled: subscriptionActive,
    refetchInterval: 2 * 60_000,
  });

  const { data: subData } = useQuery<any>({
    queryKey: ["client-subscription", user?.id],
    queryFn: async () => {
      try {
        return await request<any>("/api/v1/payments/subscription");
      } catch {
        return null;
      }
    },
    enabled: subscriptionActive,
    refetchInterval: 2 * 60_000,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApproveDeliverable = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await request(`/api/v1/deliverables/${id}/approve`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
      });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      showToast("Deliverable approved!");
    } catch {
      showToast("Approval failed or already processed");
    }
  };

  const [declineTarget, setDeclineTarget] = useState<{ id: string; title?: string } | null>(null);
  const [declineComment, setDeclineComment] = useState("");
  const [submittingDecline, setSubmittingDecline] = useState(false);

  const handleDeclineDeliverable = (id: string, e: React.MouseEvent, title?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeclineTarget({ id, title });
    setDeclineComment("");
  };

  const submitDeclineReason = async () => {
    if (!declineTarget || !declineComment.trim()) return;
    setSubmittingDecline(true);
    try {
      await request(
        `/api/v1/deliverables/${declineTarget.id}/request-changes?rejection_comment=${encodeURIComponent(
          declineComment.trim()
        )}`,
        { method: "POST" }
      );
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      showToast("Revision requested from pod");
      setDeclineTarget(null);
      setDeclineComment("");
    } catch {
      showToast("Change request failed");
    } finally {
      setSubmittingDecline(false);
    }
  };

  const pendingDeliverables = (deliverablesData?.items || []).filter(
    (d: any) => d.status === "pending_approval" || d.status === "in_production"
  );

  const companyName = dashboard?.company?.name || user?.company_name || user?.full_name || "Brand";
  const pendingCount = pendingDeliverables.length;
  
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const dateStr = today.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
  const daysRemaining = (dashboard?.active_plan as any)?.days_remaining ?? subData?.days_remaining ?? 30;
  const cycleDay = Math.max(1, Math.min(30, 30 - daysRemaining + 1));

  if (!gate.isReady || (!isLocked && (isDashboardLoading || !dashboard))) {
    return <CreoLoadingScreen label="Verifying session..." sublabel="Loading Workspace" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {/* Context date */}
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#97A0B3] mb-3">
            {dayName} {dateStr}
            {!isLocked && ` · CYCLE DAY ${cycleDay} OF 30`}
          </p>
          {/* Hero Title */}
          <h1 className="text-3xl sm:text-4xl font-normal text-[#F8FAFC] leading-tight">
            {isLocked ? "Welcome" : greetingForNow()}, {companyName}.{" "}
            <span className="font-bold italic">
              {isLocked
                ? "Let's finish setting up your workspace."
                : pendingCount > 0
                  ? `${pendingCount} piece${pendingCount > 1 ? "s are" : " is"} waiting for you.`
                  : "All clear for now."}
            </span>
          </h1>
        </div>
        <div className={`flex items-center gap-3 shrink-0 pt-1 ${isLocked ? "hidden" : ""}`}>
          <Link to="/portal/creative-pod" className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#2A3446] text-[13px] font-medium text-white hover:bg-[#161F2D] transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message your pod
          </Link>
          {pendingCount > 0 && (
            <Link
              to="/portal/deliverables"
              className="px-5 py-2.5 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors"
            >
              Review now
            </Link>
          )}
        </div>
      </div>

      {/* ── Resume onboarding (above the pipeline while setup is incomplete) ── */}
      <ResumeOnboardingBanner variant="hero" />

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batch Status + Asset List (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Batch Status Card */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">
                {pendingDeliverables.length > 0 
                  ? "Deliverables · Ready for Review" 
                  : upcomingEntries.length > 0 
                  ? "Publishing Cadence · On Track" 
                  : "Production Pipeline"}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#7FA0D6]/10 text-[#7FA0D6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7FA0D6]" />
                {isLocked
                  ? "Starts after setup"
                  : pendingDeliverables.length > 0
                    ? `${pendingDeliverables.length} awaiting review`
                    : "Active cycle"}
              </span>
            </div>

            {/* Progress Steps */}
            {(() => {
              const inProd = deliverablesData?.items?.filter((d: any) => d.status === "in_production" || d.status === "draft")?.length || 0;
              const hasScheduled = (upcomingEntries.length > 0) || (deliverablesData?.items?.some((d: any) => d.status === "scheduled" || d.status === "approved"));
              const hasReview = pendingDeliverables.length > 0;

              const dynamicSteps = [
                { label: "Brief", completed: !isLocked, active: false },
                { label: "Production", completed: hasReview || hasScheduled, active: inProd > 0 && !hasReview },
                { label: "Internal QA", completed: hasReview || hasScheduled, active: false },
                { label: "Your review", completed: hasScheduled && !hasReview, active: hasReview },
                { label: "Scheduled", completed: false, active: hasScheduled && !hasReview },
              ];

              return (
                <div className="flex gap-2 mb-8">
                  {dynamicSteps.map((step) => (
                    <div key={step.label} className="flex-1 flex flex-col">
                      <div
                        className={`h-1.5 w-full rounded-full mb-3 ${
                          step.completed || step.active
                            ? "bg-[#7FA0D6]"
                            : "bg-white/[0.08]"
                        }`}
                      />
                      <span
                        className={`text-[13px] text-center tracking-wide ${
                          step.active
                            ? "text-white font-bold"
                            : step.completed
                            ? "text-[#97A0B3] font-medium"
                            : "text-[#97A0B3] font-medium"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Alert Box (Only when review is needed) */}
            {pendingDeliverables.length > 0 && (
              <div className="bg-[#161F2D] rounded-xl p-4 mb-8">
                <p className="text-[13px] text-[#97A0B3] leading-relaxed">
                  You have <span className="text-white font-medium">{pendingDeliverables.length} {pendingDeliverables.length === 1 ? 'deliverable' : 'deliverables'}</span> awaiting your review. Approving or requesting changes keeps your batch on its delivery SLA.
                </p>
              </div>
            )}

            {/* Asset List */}
            {pendingDeliverables.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[#97A0B3]">
                  {isLocked
                    ? "Your production pipeline activates once setup is complete. Pieces waiting for your review will show up here."
                    : "No deliverables pending review right now."}
                </p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-white/[0.05]">
                {pendingDeliverables.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 py-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg bg-[#161F2D] overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnail_url || item.file_url ? (
                        <img
                          src={item.thumbnail_url || item.file_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-[#97A0B3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </svg>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase text-[#97A0B3] font-medium tracking-wider">
                        {item.asset_type || "Reel"} · {item.duration || "0:30"}
                      </p>
                      <p className="text-[15px] font-medium text-white truncate mt-0.5">
                        {item.title || "Untitled"}
                      </p>
                      <p className="text-[13px] text-[#97A0B3] truncate mt-0.5">
                        {item.description || "Ready for your review"}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleDeclineDeliverable(item.id, e, item.title)}
                        className="px-4 py-2 rounded-full border border-[#2A3446] text-[13px] font-medium text-white hover:bg-[#161F2D] transition-colors cursor-pointer"
                      >
                        Request change
                      </button>
                      <button
                        onClick={(e) => handleApproveDeliverable(item.id, e)}
                        className="px-4 py-2 rounded-full bg-[#BCCCE6] text-[#0B111C] text-[13px] font-bold hover:bg-white transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coming Up */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Coming up</h3>
              <span className="text-xs font-medium text-[#97A0B3]">
                next 7 days
              </span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 text-[11px] uppercase tracking-[0.1em] text-[#97A0B3] font-bold pb-2 border-b border-[#2A3446]">
              <span>When</span>
              <span>Format</span>
              <span>Post</span>
              <span className="text-right">Status</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/[0.04]">
              {upcomingEntries.length === 0 ? (
                <div className="py-8 text-center text-[#97A0B3] text-sm">
                  {isLocked
                    ? "Your 30-day content calendar is generated when setup is complete."
                    : "No upcoming posts scheduled in the next 7 days."}
                </div>
              ) : (
                upcomingEntries.map((entry: any, idx: number) => {
                  const d = new Date(entry.date);
                  const dayStr = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
                  const timeStr = entry.scheduled_time ? ` · ${entry.scheduled_time}` : "";
                  const statusLabel =
                    entry.status === "approved" ? "Approved" :
                    entry.status === "pending_approval" ? "Needs you" :
                    entry.status === "changes_requested" ? "In revision" :
                    "Scheduled";
                  const badgeColor =
                    statusLabel === "Needs you" ? "bg-[#D8BF9B]/15 text-[#D8BF9B]" :
                    statusLabel === "Approved" ? "bg-[#7FA0D6]/20 text-[#BCCCE6]" :
                    "bg-[#7FA0D6]/15 text-[#BCCCE6]";
                  return (
                    <div key={entry.id || idx} className="grid grid-cols-4 gap-4 py-3 text-sm items-center hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded-lg cursor-pointer">
                      <span className="text-[#97A0B3] text-[13px]">{dayStr}{timeStr}</span>
                      <span className="text-white text-[13px] capitalize">{entry.format_label || entry.type}</span>
                      <span className="text-[#97A0B3] text-[13px] truncate">{entry.topic || entry.title || "Scheduled post"}</span>
                      <span className="text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
                          {statusLabel}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Plan + Results + Pod */}
        <div className="space-y-6">
          {/* Your plan this cycle */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446]">
            <h3 className="text-base font-semibold text-white mb-5">Your plan this cycle</h3>
            {isLocked ? (
              <div className="space-y-4">
                <p className="text-sm text-[#97A0B3] leading-relaxed">
                  {gate.isPaid
                    ? "Your plan is active. Usage tracking starts with your first production cycle."
                    : "No active plan yet. Pick a plan to activate your creative pod and content pipeline."}
                </p>
                <Link
                  to={gate.isPaid ? "/portal/payments" : gate.resume.route}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#BCCCE6] text-[13px] font-bold text-[#0B111C] hover:bg-white transition-colors"
                >
                  {gate.isPaid ? "View plan & billing" : "Choose a plan"}
                </Link>
              </div>
            ) : (() => {
              const quotas = subData?.quotas || subData?.usage || {};
              const plan = dashboard?.active_plan;
              const renewalDateStr = subData?.subscription?.current_period_end
                ? new Date(subData.subscription.current_period_end).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : plan?.current_period_end
                ? new Date(plan.current_period_end).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : "Next cycle";

              const usageItems = [
                {
                  label: "Reels",
                  used: quotas.reel?.used ?? 0,
                  total: quotas.reel?.quota ?? plan?.reel_quota ?? 0,
                },
                {
                  label: "Posts",
                  used: (quotas.static_post?.used ?? quotas.poster?.used) ?? 0,
                  total: quotas.static_post?.quota ?? quotas.poster?.quota ?? plan?.poster_quota ?? 0,
                },
                {
                  label: "Stories",
                  used: quotas.story?.used ?? 0,
                  total: quotas.story?.quota ?? plan?.story_quota ?? 0,
                },
              ];

              return (
                <>
                  <div className="space-y-4">
                    {usageItems.map((item) => {
                      const totalSafe = item.total > 0 ? item.total : 1;
                      const pct = Math.min(100, Math.round((item.used / totalSafe) * 100));
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-[#97A0B3]">{item.label}</span>
                            <span className="text-sm text-white font-medium">
                              {item.used} <span className="text-[#97A0B3]">/ {item.total}</span>
                            </span>
                          </div>
                          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#7FA0D6] rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#2A3446]">
                    <p className="text-xs text-[#97A0B3]">
                      Renews {renewalDateStr} · <Link to="/portal/payments" className="text-white hover:underline">Add-ons available</Link>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Results */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446]">
            <h3 className="text-base font-semibold text-white mb-2">Results</h3>
            <p className="text-sm text-[#97A0B3] mb-5 leading-relaxed">
              Connect Instagram to see reach and saves for every post we publish. Until then we show nothing here rather than guess.
            </p>
            <Link to="/portal/account?tab=integrations" className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[#BCCCE6] text-[13px] font-bold text-[#0B111C] hover:bg-white transition-colors w-max">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              @ Connect Instagram
            </Link>
          </div>

          {/* From your pod */}
          <div className="bg-[#161F2D] rounded-2xl p-6 border border-[#2A3446]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">From your pod</h3>
              {!isLocked && (
                <Link
                  to="/portal/creative-pod"
                  className="px-4 py-1.5 rounded-full border border-[#2A3446] text-[13px] font-medium text-white hover:bg-[#161F2D] transition-colors"
                >
                  Open chat
                </Link>
              )}
            </div>

            {/* Real Pod Team or Empty State */}
            {(!dashboard?.assigned_team || dashboard.assigned_team.length === 0) ? (
              <div className="py-6 text-center text-sm text-[#97A0B3]">
                {isLocked
                  ? "Your dedicated creative pod is assigned when setup is complete."
                  : "Your dedicated creative pod is being allocated."}
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.assigned_team.slice(0, 3).map((member: any, i: number) => {
                  const initials = member.name.split(" ").filter((w: string) => w.length > 0).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                  const avatarBgs = ["bg-[#BCCCE6] text-[#0B111C]", "bg-white/[0.08] text-white", "bg-[#7FA0D6] text-white"];
                  return (
                    <div key={member.id || i} className="flex gap-3 items-center">
                      <div className={`w-8 h-8 rounded-full ${avatarBgs[i % avatarBgs.length]} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold text-white truncate">{member.name}</span>
                          <span className="text-xs text-[#97A0B3]">{member.is_primary ? "Lead" : "Pod"}</span>
                        </div>
                        <p className="text-[13px] text-[#97A0B3] truncate">
                          {member.role || "Creative execution"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revision Reason Modal Dialog */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <div className="bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A3446]">
              <h3 className="text-base font-bold text-white">
                Request Changes on {declineTarget.title || "Deliverable"}
              </h3>
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="text-[#97A0B3] hover:text-white text-xs font-bold px-2 py-1 rounded-lg bg-[#0B111C]"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-[#97A0B3]">
              Select quick feedback tags or describe what the creative pod should adjust in the next version:
            </p>

            <div className="flex flex-wrap gap-2">
              {["Less text", "Different music", "Stronger hook", "Colour feels off-brand", "Wrong product"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDeclineComment((prev) => (prev ? `${prev} · ${tag}` : tag))}
                  className="px-3 py-1 rounded-lg bg-[#0B111C] hover:bg-[#2A3446] border border-[#2A3446] text-xs font-semibold text-[#BCCCE6] transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              value={declineComment}
              onChange={(e) => setDeclineComment(e.target.value)}
              placeholder="Provide clear revision instructions for your creative team..."
              className="w-full bg-[#0B111C] border border-[#2A3446] rounded-xl p-3.5 text-xs text-white placeholder:text-[#97A0B3] focus:outline-none focus:border-[#7FA0D6] h-28 resize-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#97A0B3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeclineReason}
                disabled={!declineComment.trim() || submittingDecline}
                className="px-5 py-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white transition-colors disabled:opacity-50"
              >
                {submittingDecline ? "Submitting..." : "Submit Revision Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161F2D] text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#BCCCE6]" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
