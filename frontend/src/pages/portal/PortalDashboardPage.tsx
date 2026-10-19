import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpError, request } from "../../lib/http";
import { approveDeliverable, requestChanges } from "../../lib/deliverables-api";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import { ResumeOnboardingBanner } from "../../components/portal/ResumeOnboardingBanner";
import { Instagram, ExternalLink } from "lucide-react";

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
  instagram_username?: string | null;
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
      await approveDeliverable(id, user?.id || "", crypto.randomUUID());
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "dashboard"] });
      showToast("Deliverable approved — download it from Review or Library.");
    } catch (err) {
      showToast(err instanceof HttpError ? err.message : "Approval failed. Please retry.");
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
      await requestChanges(declineTarget.id, user?.id || "", declineComment.trim());
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard-deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "deliverables"] });
      queryClient.invalidateQueries({ queryKey: ["portal", "dashboard"] });
      showToast("Revision requested from pod");
      setDeclineTarget(null);
      setDeclineComment("");
    } catch (err) {
      showToast(err instanceof HttpError ? err.message : "Change request failed");
    } finally {
      setSubmittingDecline(false);
    }
  };

  const pendingDeliverables = (deliverablesData?.items || []).filter(
    (d: any) => d.status === "pending_approval"
  );

  const displayName =
    user?.full_name?.trim() ||
    user?.company_name?.trim() ||
    dashboard?.company?.name?.trim() ||
    "Client";
  const pendingCount = pendingDeliverables.length;

  if (!gate.isReady || (!isLocked && (isDashboardLoading || !dashboard))) {
    return <CreoLoadingScreen fullScreen={false} label="Loading Workspace" className="min-h-[45vh]" />;
  }

  return (
    <div className="w-full min-w-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-app-ink tracking-tight">
            Hi, {displayName}
          </h1>
        </div>
        <div className={`flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 pt-1 ${isLocked ? "hidden" : ""}`}>
          <Link to="/portal/slack" className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-app-line text-[13px] font-medium text-hi hover:bg-app-surface transition-colors">
            <svg className="w-4 h-4 text-app-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Message your pod
          </Link>
          {pendingCount > 0 && (
            <Link
              to="/portal/deliverables"
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-app-accent-soft text-app-base text-[13px] font-bold hover:bg-hi transition-colors"
            >
              Review now
            </Link>
          )}
        </div>
      </div>

      {/* ── Resume onboarding (above the pipeline while setup is incomplete) ── */}
      {isLocked && <ResumeOnboardingBanner variant="hero" />}

      {/* ── Main Content Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Batch Status + Asset List (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Batch Status Card */}
          <div className="bg-app-surface rounded-2xl p-5 sm:p-6 border border-app-line">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-hi">
                {pendingDeliverables.length > 0 
                  ? "Deliverables · Ready for Review" 
                  : upcomingEntries.length > 0 
                  ? "Publishing Cadence · On Track" 
                  : "Production Pipeline"}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-app-accent/10 text-app-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-app-accent" />
                {isLocked
                  ? "Starts after setup"
                  : pendingDeliverables.length > 0
                    ? `${pendingDeliverables.length} awaiting review`
                    : "Active cycle"}
              </span>
            </div>

            {/* Progress Steps */}
            {(() => {
              // Internal drafts are never sent to clients; open revisions are the visible "in production" work.
              const inProd = deliverablesData?.items?.filter((d: any) => d.status === "revision_requested")?.length || 0;
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
                            ? "bg-app-accent"
                            : "bg-hi/[0.08]"
                        }`}
                      />
                      <span
                        className={`text-[13px] text-center tracking-wide ${
                          step.active
                            ? "text-hi font-bold"
                            : step.completed
                            ? "text-app-mist font-medium"
                            : "text-app-mist font-medium"
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
              <div className="bg-app-surface rounded-xl p-4 mb-8">
                <p className="text-[13px] text-app-mist leading-relaxed">
                  You have <span className="text-hi font-medium">{pendingDeliverables.length} {pendingDeliverables.length === 1 ? 'deliverable' : 'deliverables'}</span> awaiting your review. Approving or requesting changes keeps your batch on its delivery SLA.
                </p>
              </div>
            )}

            {/* Asset List */}
            {pendingDeliverables.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-app-mist">
                  {isLocked
                    ? "Your production pipeline activates once setup is complete. Pieces waiting for your review will show up here."
                    : "No deliverables pending review right now."}
                </p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-hi/[0.05]">
                {pendingDeliverables.slice(0, 3).map((item: any) => (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 py-4">
                    {/* Thumbnail + Info */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <Link
                        to={`/portal/deliverables/${item.id}`}
                        aria-label={`Review ${item.title}`}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-app-base border border-app-line overflow-hidden shrink-0 flex items-center justify-center"
                      >
                        {item.file_url && item.is_video ? (
                          <video src={`${item.file_url}#t=0.5`} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        ) : item.file_url ? (
                          <img
                            src={item.file_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-6 h-6 text-app-mist" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                          </svg>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] sm:text-xs uppercase text-app-accent font-bold tracking-wider">
                          {item.type_label || "Deliverable"} · v{item.version || 1}
                        </p>
                        <Link
                          to={`/portal/deliverables/${item.id}`}
                          className="block text-sm sm:text-[15px] font-bold text-hi truncate mt-0.5 hover:underline"
                        >
                          {item.title || "Untitled"}
                        </Link>
                        <p className="text-xs sm:text-[13px] text-app-mist truncate mt-0.5">
                          Ready for your review
                        </p>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
                      <button
                        onClick={(e) => handleDeclineDeliverable(item.id, e, item.title)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-full border border-app-line bg-app-base text-xs sm:text-[13px] font-medium text-hi hover:bg-app-surface transition-colors cursor-pointer text-center"
                      >
                        Request change
                      </button>
                      <button
                        onClick={(e) => handleApproveDeliverable(item.id, e)}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-app-accent-soft text-app-base text-xs sm:text-[13px] font-bold hover:bg-hi transition-colors cursor-pointer text-center"
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
          <div className="bg-app-surface rounded-2xl p-5 sm:p-6 border border-app-line">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-hi">Coming up</h3>
              <span className="text-xs font-medium text-app-mist">
                next 7 days
              </span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 text-[11px] uppercase tracking-[0.1em] text-app-mist font-bold pb-2 border-b border-app-line">
              <span>When</span>
              <span>Format</span>
              <span>Post</span>
              <span className="text-right">Status</span>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-hi/[0.04]">
              {upcomingEntries.length === 0 ? (
                <div className="py-8 text-center text-app-mist text-sm">
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
                    statusLabel === "Needs you" ? "bg-app-warm/15 text-app-warm" :
                    statusLabel === "Approved" ? "bg-app-accent/20 text-app-accent-soft" :
                    "bg-app-accent/15 text-app-accent-soft";
                  return (
                    <div key={entry.id || idx} className="grid grid-cols-4 gap-4 py-3 text-sm items-center hover:bg-hi/[0.02] transition-colors -mx-2 px-2 rounded-lg cursor-pointer">
                      <span className="text-app-mist text-[13px]">{dayStr}{timeStr}</span>
                      <span className="text-hi text-[13px] capitalize">{entry.format_label || entry.type}</span>
                      <span className="text-app-mist text-[13px] truncate">{entry.topic || entry.title || "Scheduled post"}</span>
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
        <div className="space-y-4">
          {/* Your plan this cycle */}
          <div className="bg-app-surface rounded-2xl p-5 sm:p-6 border border-app-line">
            <h3 className="text-base font-semibold text-hi mb-5">Your plan this cycle</h3>
            {isLocked ? (
              <div className="space-y-4">
                <p className="text-sm text-app-mist leading-relaxed">
                  {gate.isPaid
                    ? "Your plan is active. Usage tracking starts with your first production cycle."
                    : "No active plan yet. Pick a plan to activate your creative pod and content pipeline."}
                </p>
                <Link
                  to={gate.isPaid ? "/portal/payments" : gate.resume.route}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-app-accent-soft text-[13px] font-bold text-app-base hover:bg-hi transition-colors"
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
                            <span className="text-sm text-app-mist">{item.label}</span>
                            <span className="text-sm text-hi font-medium">
                              {item.used} <span className="text-app-mist">/ {item.total}</span>
                            </span>
                          </div>
                          <div className="h-2 bg-hi/[0.04] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-app-accent rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 pt-4 border-t border-app-line">
                    <p className="text-xs text-app-mist">
                      Renews {renewalDateStr} · <Link to="/portal/payments" className="text-hi hover:underline">Add-ons available</Link>
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Results & Instagram Publishing */}
          <div className="bg-app-surface rounded-2xl p-6 border border-app-line">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-hi">Results & Publishing</h3>
              {dashboard?.instagram_username && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Meta Synced
                </span>
              )}
            </div>

            {dashboard?.instagram_username ? (
              <div className="space-y-4">
                <p className="text-sm text-app-mist leading-relaxed">
                  Your workspace is linked to Instagram. Approved deliverables are auto-published directly to your account.
                </p>
                <div className="p-3.5 rounded-xl bg-app-base border border-app-line flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
                      <div className="size-full rounded-full bg-app-base flex items-center justify-center text-hi">
                        <Instagram className="size-4 text-rose-400" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-hi leading-tight">
                        @{dashboard.instagram_username.replace(/^@/, "")}
                      </p>
                      <p className="text-[11px] text-app-accent">Auto-Publishing Active</p>
                    </div>
                  </div>
                  <a
                    href={`https://www.instagram.com/${dashboard.instagram_username.replace(/^@/, "")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-app-surface hover:bg-app-line text-app-accent-soft text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>View</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Link
                    to="/portal/account?tab=integrations"
                    className="text-xs text-app-accent hover:text-app-accent-soft hover:underline font-semibold flex items-center gap-1"
                  >
                    Manage Instagram Integration ⚙
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-app-mist mb-4 leading-relaxed">
                  Connect Instagram to see reach and saves for every post we publish, and enable direct publishing of approved deliverables.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Link
                    to="/portal/account?tab=integrations"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-app-accent-soft text-[13px] font-bold text-app-base hover:bg-hi transition-colors w-max"
                  >
                    <Instagram className="w-4 h-4" />
                    @ Connect Instagram
                  </Link>
                  <a
                    href="https://www.instagram.com/accounts/emailsignup/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-app-mist hover:text-hi transition-colors underline flex items-center gap-1"
                  >
                    <span>Need an account? Create an Instagram ID ↗</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* From your pod */}
          <div className="bg-app-surface rounded-2xl p-5 sm:p-6 border border-app-line">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-hi">From your pod</h3>
              {!isLocked && (
                <Link
                  to="/portal/slack"
                  className="px-4 py-1.5 rounded-full border border-app-line text-[13px] font-medium text-hi hover:bg-app-surface transition-colors"
                >
                  Open chat
                </Link>
              )}
            </div>

            {/* Real Pod Team or Empty State */}
            {(!dashboard?.assigned_team || dashboard.assigned_team.length === 0) ? (
              <div className="py-6 text-center text-sm text-app-mist">
                {isLocked
                  ? "Your dedicated creative pod is assigned when setup is complete."
                  : "Your dedicated creative pod is being allocated."}
              </div>
            ) : (
              <div className="space-y-4">
                {dashboard.assigned_team.slice(0, 3).map((member: any, i: number) => {
                  const initials = member.name.split(" ").filter((w: string) => w.length > 0).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
                  const avatarBgs = ["bg-app-accent-soft text-app-base", "bg-hi/[0.08] text-hi", "bg-app-accent text-white"];
                  return (
                    <div key={member.id || i} className="flex gap-3 items-center">
                      <div className={`w-8 h-8 rounded-full ${avatarBgs[i % avatarBgs.length]} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-bold text-hi truncate">{member.name}</span>
                          <span className="text-xs text-app-mist">{member.is_primary ? "Lead" : "Pod"}</span>
                        </div>
                        <p className="text-[13px] text-app-mist truncate">
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
          <div className="bg-app-surface border border-app-line rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-app-line">
              <h3 className="text-base font-bold text-hi">
                Request Changes on {declineTarget.title || "Deliverable"}
              </h3>
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="text-app-mist hover:text-hi text-xs font-bold px-2 py-1 rounded-lg bg-app-base"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-app-mist">
              Select quick feedback tags or describe what the creative pod should adjust in the next version:
            </p>

            <div className="flex flex-wrap gap-2">
              {["Less text", "Different music", "Stronger hook", "Colour feels off-brand", "Wrong product"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDeclineComment((prev) => (prev ? `${prev} · ${tag}` : tag))}
                  className="px-3 py-1 rounded-lg bg-app-base hover:bg-app-line border border-app-line text-xs font-semibold text-app-accent-soft transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              value={declineComment}
              onChange={(e) => setDeclineComment(e.target.value)}
              placeholder="Provide clear revision instructions for your creative team..."
              className="w-full bg-app-base border border-app-line rounded-xl p-3.5 text-xs text-hi placeholder:text-app-mist focus:outline-none focus:border-app-accent h-28 resize-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="px-4 py-2 rounded-xl border border-app-line text-xs font-bold text-app-mist hover:text-hi"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDeclineReason}
                disabled={!declineComment.trim() || submittingDecline}
                className="px-5 py-2 rounded-xl bg-app-accent-soft text-app-base text-xs font-bold hover:bg-hi transition-colors disabled:opacity-50"
              >
                {submittingDecline ? "Submitting..." : "Submit Revision Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-app-surface text-hi px-5 py-3 rounded-xl shadow-2xl border border-hi/[0.1] text-sm font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-app-accent-soft" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
