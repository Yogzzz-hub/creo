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
    queryKey: ["portal-sub-usage", user?.id],
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

  const handleDeclineDeliverable = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await request(`/api/v1/deliverables/${id}/request-changes?rejection_comment=Changes requested from dashboard`, {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      showToast("Revision requested from pod");
    } catch {
      showToast("Change request failed");
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
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-nebula-mist mb-3">
            {dayName} {dateStr}
            {!isLocked && ` · CYCLE DAY ${cycleDay} OF 30`}
          </p>
          {/* Hero Title */}
          <h1 className="text-3xl sm:text-4xl font-normal text-slate-50 leading-tight">
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
          <Link to="/portal/creative-pod" className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-nebula-steel text-[13px] font-medium text-white hover:bg-nebula-surface transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message your pod
          </Link>
          {pendingCount > 0 && (
            <Link
              to="/portal/deliverables"
              className="px-5 py-2.5 rounded-full bg-nebula-periwinkle text-nebula-navy text-[13px] font-bold hover:bg-white transition-colors"
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
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">
                {pendingDeliverables.length > 0 
                  ? "Deliverables · Ready for Review" 
                  : upcomingEntries.length > 0 
                  ? "Publishing Cadence · On Track" 
                  : "Production Pipeline"}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-nebula-glow/10 text-nebula-glow">
                <span className="w-1.5 h-1.5 rounded-full bg-nebula-glow" />
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
                            ? "bg-nebula-glow"
                            : "bg-white/[0.08]"
                        }`}
                      />
                      <span
                        className={`text-[13px] text-center tracking-wide ${
                          step.active
                            ? "text-white font-bold"
                            : step.completed
                            ? "text-nebula-mist font-medium"
                            : "text-nebula-mist font-medium"
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
              <div className="bg-nebula-surface rounded-xl p-4 mb-8">
                <p className="text-[13px] text-nebula-mist leading-relaxed">
                  You have <span className="text-white font-medium">{pendingDeliverables.length} {pendingDeliverables.length === 1 ? 'deliverable' : 'deliverables'}</span> awaiting your review. Approving or requesting changes keeps your batch on its delivery SLA.
                </p>
              </div>
            )}

            {/* Asset List */}
            {pendingDeliverables.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-nebula-mist">
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
                    <div className="w-16 h-16 rounded-lg bg-nebula-surface overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnail_url || item.file_url ? (
                        <img
                          src={item.thumbnail_url || item.file_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-6 h-6 text-nebula-mist" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </svg>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase text-nebula-mist font-medium tracking-wider">
                        {item.asset_type || "Reel"} · {item.duration || "0:30"}
                      </p>
                      <p className="text-[15px] font-medium text-white truncate mt-0.5">
                        {item.title || "Untitled"}
                      </p>
                      <p className="text-[13px] text-nebula-mist truncate mt-0.5">
                        {item.description || "Ready for your review"}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleDeclineDeliverable(item.id, e)}
                        className="px-4 py-2 rounded-full border border-nebula-steel text-[13px] font-medium text-white hover:bg-nebula-surface transition-colors"
                      >
                        Request change
                      </button>
                      <button
                        onClick={(e) => handleApproveDeliverable(item.id, e)}
                        className="px-4 py-2 rounded-full bg-nebula-periwinkle text-nebula-navy text-[13px] font-bold hover:bg-white transition-colors"
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
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">Coming up</h3>
              <span className="text-xs font-medium text-nebula-mist">
                next 7 days
              </span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 text-[11px] uppercase tracking-[0.1em] text-nebula-mist font-bold pb-2 border-b border-nebula-steel">
              <span>When</span>
              <span>Format</span>
              <span>Post</span>
              <span className="text-right">Status</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-white/[0.04]">
              {upcomingEntries.length === 0 ? (
                <div className="py-8 text-center text-nebula-mist text-sm">
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
                    statusLabel === "Needs you" ? "bg-nebula-sand/15 text-nebula-sand" :
                    statusLabel === "Approved" ? "bg-nebula-glow/20 text-nebula-periwinkle" :
                    "bg-nebula-glow/15 text-nebula-periwinkle";
                  return (
                    <div key={entry.id || idx} className="grid grid-cols-4 gap-4 py-3 text-sm items-center hover:bg-white/[0.02] transition-colors -mx-2 px-2 rounded-lg cursor-pointer">
                      <span className="text-nebula-mist text-[13px]">{dayStr}{timeStr}</span>
                      <span className="text-white text-[13px] capitalize">{entry.format_label || entry.type}</span>
                      <span className="text-nebula-mist text-[13px] truncate">{entry.topic || entry.title || "Scheduled post"}</span>
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
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            <h3 className="text-base font-semibold text-white mb-5">Your plan this cycle</h3>
            {isLocked ? (
              <div className="space-y-4">
                <p className="text-sm text-nebula-mist leading-relaxed">
                  {gate.isPaid
                    ? "Your plan is active. Usage tracking starts with your first production cycle."
                    : "No active plan yet. Pick a plan to activate your creative pod and content pipeline."}
                </p>
                <Link
                  to={gate.isPaid ? "/portal/payments" : gate.resume.route}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-nebula-periwinkle text-[13px] font-bold text-nebula-navy hover:bg-white transition-colors"
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
                            <span className="text-sm text-nebula-mist">{item.label}</span>
                            <span className="text-sm text-white font-medium">
                              {item.used} <span className="text-nebula-mist">/ {item.total}</span>
                            </span>
                          </div>
                          <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-nebula-glow rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 pt-4 border-t border-nebula-steel">
                    <p className="text-xs text-nebula-mist">
                      Renews {renewalDateStr} · <Link to="/portal/payments" className="text-white hover:underline">Add-ons available</Link>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Results */}
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            <h3 className="text-base font-semibold text-white mb-2">Results</h3>
            <p className="text-sm text-nebula-mist mb-5 leading-relaxed">
              Connect Instagram to see reach and saves for every post we publish. Until then we show nothing here rather than guess.
            </p>
            <Link to="/portal/account?tab=integrations" className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-nebula-periwinkle text-[13px] font-bold text-nebula-navy hover:bg-white transition-colors w-max">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              @ Connect Instagram
            </Link>
          </div>

          {/* From your pod */}
          <div className="bg-nebula-surface rounded-2xl p-6 border border-nebula-steel">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">From your pod</h3>
              {!isLocked && (
                <Link
                  to="/portal/creative-pod"
                  className="px-4 py-1.5 rounded-full border border-nebula-steel text-[13px] font-medium text-white hover:bg-nebula-surface transition-colors"
                >
                  Open chat
                </Link>
              )}
            </div>

            {/* Real Pod Team or Empty State */}
            {(!dashboard?.assigned_team || dashboard.assigned_team.length === 0) ? (
              <div className="py-6 text-center text-sm text-nebula-mist">
                {isLocked
                  ? "Your dedicated creative pod is assigned when setup is complete."
                  : "Your dedicated creative pod is being allocated."}
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.assigned_team.slice(0, 3).map((member: any, i: number) => {
                  const initials = member.name.split(" ").filter((w: string) => w.length > 0).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                  const avatarBgs = ["bg-nebula-periwinkle text-nebula-navy", "bg-white/[0.08] text-white", "bg-nebula-glow text-white"];
                  return (
                    <div key={member.id || i} className="flex gap-3 items-center">
                      <div className={`w-8 h-8 rounded-full ${avatarBgs[i % avatarBgs.length]} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold text-white truncate">{member.name}</span>
                          <span className="text-xs text-nebula-mist">{member.is_primary ? "Lead" : "Pod"}</span>
                        </div>
                        <p className="text-[13px] text-nebula-mist truncate">
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

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-nebula-surface text-white px-5 py-3 rounded-xl shadow-2xl border border-white/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-nebula-periwinkle" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
