import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpError, request } from "../../lib/http";
import { approveDeliverable, requestChanges } from "../../lib/deliverables-api";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { CreoLoadingScreen } from "../../components/ui/CreoLoadingScreen";
import { ResumeOnboardingBanner } from "../../components/portal/ResumeOnboardingBanner";
import { ArrowRight, ExternalLink, Film, MessageSquare, X } from "lucide-react";
import { Instagram } from "../../ui/brand-icons";
import { PANEL_TITLE, PORTAL_EYEBROW, PORTAL_PANEL, PortalPageHeader, PortalPill } from "../../components/portal/PortalPieces";

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
  instagram_connected?: boolean;
  quotas?: Record<string, { quota: number; used: number; remaining?: number }>;
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

  const firstName = displayName.split(" ")[0] || displayName;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
  const planName = dashboard?.active_plan?.name;
  const lead = isLocked
    ? "Finish setting up and your pod starts on your first batch."
    : pendingCount > 0
      ? `${pendingCount} ${pendingCount === 1 ? "piece is" : "pieces are"} waiting for your review.`
      : "You're all caught up. Your pod is working on the next batch.";

  const hasReview = pendingDeliverables.length > 0;
  // Each step maps to real DeliverableStatus values from the backend, so the
  // tracker cannot drift from what the pipeline actually reports.
  const STAGE_OF: Record<string, number> = {
    draft: 1, in_production: 1,
    pending_qa: 2, qa_rejected: 2,
    pending_approval: 3, revision_requested: 3,
    approved: 4, scheduled: 4, publishing: 4, published: 4,
  };
  const batchItems: any[] = deliverablesData?.items || [];
  // Furthest stage this cycle reached; a booked calendar slot also counts as
  // scheduled even when its deliverable row is not loaded here.
  const reached = batchItems.reduce(
    (max, d) => Math.max(max, STAGE_OF[d.status as string] ?? 0),
    upcomingEntries.length > 0 ? 4 : 0,
  );
  // Work waiting on the client outranks later work: that is the step to show.
  const activeStep = isLocked
    ? 0
    : batchItems.some((d) => d.status === "pending_approval")
    ? 3
    : Math.max(reached, 1);
  const steps = ["Brief", "Production", "Internal QA", "Your review", "Scheduled"].map((label, i) => ({
    label,
    completed: i < activeStep,
    active: i === activeStep,
  }));

  return (
    <div className="w-full min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <PortalPageHeader
        eyebrow={planName ? `${today} · ${planName} plan` : today}
        title={`${greeting}, ${firstName}.`}
        lead={lead}
        actions={
          isLocked ? undefined : (
            <>
              <PortalPill variant="outline" to="/portal/slack" icon={<MessageSquare className="size-4 text-app-accent" />}>
                Message your pod
              </PortalPill>
              {pendingCount > 0 && <PortalPill to="/portal/deliverables">Review now</PortalPill>}
            </>
          )
        }
      />

      {/* ── Resume onboarding (above the pipeline while setup is incomplete) ── */}
      {isLocked && (
        <div className="mb-5">
          <ResumeOnboardingBanner variant="hero" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="min-w-0 space-y-5 lg:col-span-2">
          {/* This week's batch: where it is in the pipeline and what needs you */}
          <section className={PORTAL_PANEL}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={PORTAL_EYEBROW}>This week's batch</p>
                <h2 className={`mt-2 ${PANEL_TITLE}`}>
                  {hasReview ? "Ready for your review" : upcomingEntries.length > 0 ? "Publishing on track" : "In production"}
                </h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-app-line px-3 py-1.5 text-xs font-semibold text-app-mist">
                <span className={`size-2 rounded-full ${hasReview ? "bg-[var(--portal-amber)]" : "bg-app-mist"}`} />
                {isLocked ? "Starts after setup" : hasReview ? `${pendingDeliverables.length} awaiting review` : "Active cycle"}
              </span>
            </div>

            <ol className="mt-7 grid grid-cols-5 gap-2" aria-label="Batch progress">
              {steps.map((step) => (
                <li key={step.label} aria-current={step.active ? "step" : undefined} className="min-w-0">
                  <div
                    className={`h-1 w-full rounded-full ${
                      step.active ? "bg-[var(--portal-amber)]" : step.completed ? "bg-app-accent/60" : "bg-hi/[0.08]"
                    }`}
                  />
                  <span
                    className={`mt-3 hidden truncate text-[13px] sm:block ${
                      step.active ? "font-semibold text-hi" : "font-medium text-app-mist"
                    }`}
                  >
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
            {/* Phones: one line for the current step instead of five cramped labels */}
            {(() => {
              const current = steps.findIndex((step) => step.active);
              if (current < 0) return null;
              return (
                <p className="mt-3 text-sm text-app-mist sm:hidden">
                  Step {current + 1} of {steps.length} · <span className="font-semibold text-hi">{steps[current]?.label}</span>
                </p>
              );
            })()}

            {pendingDeliverables.length === 0 ? (
              <p className="mt-8 border-t border-app-line/60 pt-8 text-center text-sm text-app-mist">
                {isLocked
                  ? "Your production pipeline activates once setup is complete. Pieces waiting for your review will show up here."
                  : "Nothing is waiting on you right now."}
              </p>
            ) : (
              <ul className="mt-8 divide-y divide-app-line/60 border-t border-app-line/60">
                {pendingDeliverables.slice(0, 3).map((item: any) => (
                  <li key={item.id} className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <Link
                        to={`/portal/deliverables/${item.id}`}
                        aria-label={`Review ${item.title}`}
                        className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-app-base sm:size-[4.5rem]"
                      >
                        {item.file_url && item.is_video ? (
                          <video src={`${item.file_url}#t=0.5`} muted playsInline preload="metadata" className="size-full object-cover" />
                        ) : item.file_url ? (
                          <img src={item.file_url} alt={item.title} className="size-full object-cover" />
                        ) : (
                          <Film className="size-6 text-app-mist" />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-app-accent">
                          {item.type_label || "Deliverable"} · v{item.version || 1}
                        </p>
                        <Link
                          to={`/portal/deliverables/${item.id}`}
                          className="mt-1 line-clamp-2 text-lg font-medium leading-snug tracking-[-0.02em] text-hi hover:underline"
                        >
                          {item.title || "Untitled"}
                        </Link>
                        <p className="mt-0.5 truncate text-sm text-app-mist">Ready for your review</p>
                      </div>
                    </div>
                    <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                      <button
                        type="button"
                        onClick={(e) => handleDeclineDeliverable(item.id, e, item.title)}
                        className="min-h-10 flex-1 cursor-pointer whitespace-nowrap rounded-full border-2 border-app-line px-3 text-sm font-semibold text-hi transition-colors hover:border-app-accent sm:flex-initial sm:px-4"
                      >
                        Request change
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleApproveDeliverable(item.id, e)}
                        className="min-h-10 flex-1 cursor-pointer whitespace-nowrap rounded-full bg-app-ink px-3 text-sm font-semibold text-app-base transition-opacity hover:opacity-90 sm:flex-initial sm:px-5"
                      >
                        Approve
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Coming up */}
          <section className={PORTAL_PANEL}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={PORTAL_EYEBROW}>Next 7 days</p>
                <h2 className={`mt-2 ${PANEL_TITLE}`}>Coming up</h2>
              </div>
              {!isLocked && (
                <Link
                  to="/portal/calendar"
                  className="group inline-flex items-center gap-1.5 pt-1 text-sm font-semibold text-hi underline decoration-hi/25 underline-offset-4 hover:decoration-current"
                >
                  Open calendar
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>

            {upcomingEntries.length === 0 ? (
              <p className="mt-8 border-t border-app-line/60 pt-8 text-center text-sm text-app-mist">
                {isLocked
                  ? "Your 30-day content calendar is generated when setup is complete."
                  : "No posts scheduled in the next 7 days."}
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-app-line/60 border-t border-app-line/60">
                {upcomingEntries.map((entry: any, idx: number) => {
                  const d = new Date(entry.date);
                  const statusLabel =
                    entry.status === "approved" ? "Approved" :
                    entry.status === "pending_approval" ? "Needs you" :
                    entry.status === "changes_requested" ? "In revision" :
                    "Scheduled";
                  const badge =
                    statusLabel === "Needs you"
                      ? "bg-[var(--portal-amber)] text-[var(--portal-on-amber)]"
                      : statusLabel === "In revision"
                        ? "border border-app-warm/50 text-app-warm"
                        : statusLabel === "Approved"
                          ? "border border-app-accent/50 text-app-accent"
                          : "border border-app-line text-app-mist";
                  return (
                    <li key={entry.id || idx} className="flex items-center gap-4 py-4">
                      <div className="w-12 shrink-0 text-center">
                        <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-app-mist">
                          {d.toLocaleDateString("en-US", { weekday: "short" })}
                        </span>
                        <span className="block text-2xl font-medium leading-tight tracking-[-0.03em] text-hi">{d.getDate()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-app-accent">
                          {entry.format_label || entry.type}
                          {entry.scheduled_time ? <span className="text-app-mist"> · {entry.scheduled_time}</span> : null}
                        </p>
                        <p className="mt-0.5 truncate text-[15px] text-hi">{entry.topic || entry.title || "Scheduled post"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${badge}`}>{statusLabel}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          {/* Your plan this cycle: the gold card */}
          <section className="rounded-[1.75rem] bg-[var(--portal-amber)] p-6 text-[var(--portal-on-amber)] sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--portal-on-amber)]/70">Your plan this cycle</p>
            {isLocked ? (
              <>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.03em]">{gate.isPaid ? "Plan active" : "No plan yet"}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--portal-on-amber)]/80">
                  {gate.isPaid
                    ? "Your plan is active. Usage tracking starts with your first production cycle."
                    : "Pick a plan to activate your creative pod and content pipeline."}
                </p>
                <Link
                  to={gate.isPaid ? "/portal/payments" : gate.resume.route}
                  className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--portal-on-amber)] px-5 text-sm font-semibold text-[var(--portal-ivory)]"
                >
                  {gate.isPaid ? "View plan & billing" : "Choose a plan"}
                  <ArrowRight className="size-4" />
                </Link>
              </>
            ) : (() => {
              const quotas = dashboard?.quotas || subData?.quotas || subData?.usage || {};
              const plan = dashboard?.active_plan;
              const renewalDateStr = subData?.subscription?.current_period_end
                ? new Date(subData.subscription.current_period_end).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : plan?.current_period_end
                ? new Date(plan.current_period_end).toLocaleDateString("en-US", { day: "numeric", month: "short" })
                : "next cycle";

              const usageItems = [
                { label: "Reels", used: quotas.reel?.used ?? 0, total: quotas.reel?.quota ?? plan?.reel_quota ?? 0 },
                {
                  label: "Posts",
                  used: (quotas.static_post?.used ?? quotas.poster?.used) ?? 0,
                  total: quotas.static_post?.quota ?? quotas.poster?.quota ?? plan?.poster_quota ?? 0,
                },
                {
                  label: "Stories",
                  used: (quotas.story?.used ?? quotas.carousel?.used) ?? 0,
                  total: quotas.story?.quota ?? quotas.carousel?.quota ?? plan?.story_quota ?? 0,
                },
              ];

              return (
                <>
                  <h2 className="mt-2 text-3xl font-medium tracking-[-0.04em]">{plan?.name || "Your plan"}</h2>
                  <ul className="mt-6 space-y-4">
                    {usageItems.map((item) => {
                      const totalSafe = item.total > 0 ? item.total : 1;
                      const pct = Math.min(100, Math.round((item.used / totalSafe) * 100));
                      return (
                        <li key={item.label}>
                          <div className="mb-1.5 flex items-baseline justify-between">
                            <span className="text-sm font-medium">{item.label}</span>
                            <span className="text-sm font-semibold">
                              {item.used} <span className="font-medium opacity-60">/ {item.total}</span>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--portal-on-amber)]/15">
                            <div
                              className="h-full rounded-full bg-[var(--portal-on-amber)] transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-6 border-t border-[var(--portal-on-amber)]/15 pt-4 text-sm text-[var(--portal-on-amber)]/80">
                    Renews {renewalDateStr} ·{" "}
                    <Link to="/portal/payments" className="font-semibold text-[var(--portal-on-amber)] underline underline-offset-4">
                      Add-ons
                    </Link>
                  </p>
                </>
              );
            })()}
          </section>

          {/* Results & Instagram publishing */}
          <section className={PORTAL_PANEL}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={PORTAL_EYEBROW}>Publishing</p>
                <h2 className={`mt-2 ${PANEL_TITLE}`}>Results & Instagram</h2>
              </div>
              {dashboard?.instagram_connected && dashboard?.instagram_username && (
                <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-app-accent/40 px-2.5 py-1 text-[11px] font-semibold text-app-accent">
                  <span className="size-1.5 animate-pulse rounded-full bg-app-accent text-app-on-accent!" />
                  Synced
                </span>
              )}
            </div>

            {dashboard?.instagram_connected && dashboard?.instagram_username ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-relaxed text-app-mist">
                  Your workspace is linked to Instagram. Approved deliverables publish straight to your account.
                </p>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-app-base p-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="size-10 shrink-0 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
                      <div className="flex size-full items-center justify-center rounded-full bg-app-base text-hi">
                        <Instagram className="size-4" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold leading-tight text-hi">
                        @{dashboard.instagram_username.replace(/^@/, "")}
                      </p>
                      <p className="text-xs text-app-accent">Auto-publishing on</p>
                    </div>
                  </div>
                  <a
                    href={`https://www.instagram.com/${dashboard.instagram_username.replace(/^@/, "")}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-app-line px-3.5 text-xs font-semibold text-hi transition-colors hover:border-app-accent"
                  >
                    View
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <Link
                  to="/portal/account?tab=integrations"
                  className="inline-block text-sm font-semibold text-hi underline decoration-hi/25 underline-offset-4 hover:decoration-current"
                >
                  Manage Instagram connection
                </Link>
              </div>
            ) : (
              <div className="mt-5">
                <p className="mb-5 text-sm leading-relaxed text-app-mist">
                  Connect Instagram to see reach and saves for every post we publish, and enable direct publishing of approved deliverables.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <PortalPill to="/portal/account?tab=integrations">Connect Instagram</PortalPill>
                  <a
                    href="https://www.instagram.com/accounts/emailsignup/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-app-mist underline underline-offset-4 transition-colors hover:text-hi"
                  >
                    Need an account? Create one ↗
                  </a>
                </div>
              </div>
            )}
          </section>

          {/* From your pod */}
          <section className={PORTAL_PANEL}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={PORTAL_EYEBROW}>Your team</p>
                <h2 className={`mt-2 ${PANEL_TITLE}`}>Your pod</h2>
              </div>
              {!isLocked && (
                <Link
                  to="/portal/slack"
                  className="inline-flex min-h-9 shrink-0 items-center rounded-full border-2 border-app-line px-4 text-sm font-semibold text-hi transition-colors hover:border-app-accent"
                >
                  Open chat
                </Link>
              )}
            </div>

            {!dashboard?.assigned_team || dashboard.assigned_team.length === 0 ? (
              <p className="mt-6 border-t border-app-line/60 pt-6 text-center text-sm text-app-mist">
                {isLocked
                  ? "Your dedicated creative pod is assigned when setup is complete."
                  : "Your dedicated creative pod is being allocated."}
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-app-line/60 border-t border-app-line/60">
                {dashboard.assigned_team.slice(0, 3).map((member: any, i: number) => {
                  const memberInitials = member.name
                    .split(" ")
                    .filter((w: string) => w.length > 0)
                    .map((w: string) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  return (
                    <li key={member.id || i} className="flex items-center gap-3 py-3.5">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-[var(--portal-amber)] text-[var(--portal-on-amber)]" : "bg-hi/[0.08] text-hi"
                        }`}
                      >
                        {memberInitials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-hi">{member.name}</p>
                        <p className="truncate text-sm text-app-mist">{member.role || "Creative execution"}</p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-app-mist">{member.is_primary ? "Lead" : "Pod"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Revision request dialog */}
      {declineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]">
          <dialog
            open
            aria-modal="true"
            aria-labelledby="decline-title"
            className="static m-0 w-full max-w-lg rounded-[2rem] border border-app-line/60 bg-app-surface p-7 text-hi shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={PORTAL_EYEBROW}>Request a change</p>
                <h3 id="decline-title" className="mt-2 truncate text-2xl font-medium tracking-[-0.03em] text-hi">
                  {declineTarget.title || "Deliverable"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                aria-label="Close"
                className="-mr-2 -mt-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-app-mist transition-colors hover:text-hi"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-app-mist">
              Pick quick notes or describe what the pod should change in the next version.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {["Less text", "Different music", "Stronger hook", "Colour feels off-brand", "Wrong product"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setDeclineComment((prev) => (prev ? `${prev} · ${tag}` : tag))}
                  className="cursor-pointer rounded-full border border-app-line px-3.5 py-1.5 text-xs font-semibold text-hi transition-colors hover:border-app-accent"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <textarea
              value={declineComment}
              onChange={(e) => setDeclineComment(e.target.value)}
              placeholder="What should your pod change?"
              aria-label="Revision notes"
              className="mt-5 h-28 w-full resize-none rounded-2xl border border-app-line bg-app-base p-4 text-sm text-hi placeholder:text-app-mist focus:border-app-accent focus:outline-none"
            />

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeclineTarget(null)}
                className="min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold text-app-mist transition-colors hover:text-hi"
              >
                Cancel
              </button>
              <PortalPill onClick={submitDeclineReason} disabled={!declineComment.trim() || submittingDecline}>
                {submittingDecline ? "Sending..." : "Send to your pod"}
              </PortalPill>
            </div>
          </dialog>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <output className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-app-ink px-5 py-3 text-sm font-medium text-app-base shadow-2xl">
          <span className="size-2 rounded-full bg-[var(--portal-amber)]" />
          {toastMessage}
        </output>
      )}
    </div>
  );
}
