import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Calendar,
  HelpCircle,
  FileImage,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Search,
} from "lucide-react";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";

import { PortalAnnouncements } from "../../components/portal/PortalAnnouncements";

interface DashboardData {
  pending_deliverable_count: number;
  open_ticket_count: number;
  ai_summary_line: string | null;
  onboarding_stage: number;
  brand_summary: string | null;
  account_status?: string;
  terms_accepted?: boolean;
  active_plan?: { status: string; name?: string } | null;
  created_at?: string | null;
}


export function PortalDashboardPage() {
  const { user } = useAuth();

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: async () => {
      return await request<DashboardData>("/api/v1/portal/dashboard");
    },
    refetchInterval: 15000,
  });

  const stage = dashboard?.onboarding_stage ?? user?.onboarding_stage ?? 1;
  const pendingCount = dashboard?.pending_deliverable_count ?? 0;
  const ticketCount = dashboard?.open_ticket_count ?? 0;
  const termsAccepted = dashboard?.terms_accepted ?? false;
  const subscriptionActive = !!dashboard?.active_plan && ["active", "trialing"].includes(dashboard?.active_plan?.status);
  const progressPercent = stage >= 4 ? 100 : Math.min(100, Math.round((stage / 4) * 100));

  return (
    <div className="space-y-4 sm:space-y-5 animate-page-in">
      {/* ── Welcome & Status Banner ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0D2137] tracking-tight">
            Welcome back, {user?.full_name?.split(" ")[0] || "Partner"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Here is what is happening with your brand pipeline today.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            System Active
          </div>
          <Link
            to="/portal/deliverables"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <FileImage className="size-3.5" />
            Deliverables
          </Link>
        </div>
      </div>

      {/* ── Action Required Alert (if setup incomplete) ─────────────────── */}
      {stage < 4 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-900 flex items-start gap-3">
          <AlertCircle className="size-4.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-bold">Action Required</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Please complete your account setup to fully unlock your automated creative workflow.
            </p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-900 shrink-0"
          >
            Resume Setup
            <ArrowRight className="size-3" />
          </Link>
        </div>
      )}

      {/* ── Onboarding Progress Card ─────────────────────────────────────── */}
      {stage < 4 && (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="bg-[#E8F4FD]/50 p-4 pb-3 border-b border-[#C9DFF0]/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0D2137] flex items-center gap-2">
                  <Sparkles className="size-4 text-[#2B7BC4]" />
                  Setup Progress
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Complete these steps to start generating leads and automated creatives
                </p>
              </div>
              <div className="text-xl font-bold text-[#2B7BC4]">
                {progressPercent}%
              </div>
            </div>
            <div className="w-full bg-[#E8F4FD] border border-[#C9DFF0] h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-[#2B7BC4] h-full transition-all duration-500 ease-in-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-white">
            <StepItem
              number={1}
              title="Create Account"
              description="Verified email"
              status="completed"
            />
            <StepItem
              number={2}
              title="Service Agreement"
              description="Review and accept terms"
              status={stage >= 2 ? "completed" : "current"}
              to="/onboarding"
            />
            <StepItem
              number={3}
              title="Payment Setup"
              description="Activate subscription"
              status={stage >= 3 ? "completed" : stage >= 2 ? "current" : "upcoming"}
              to="/portal/payments"
            />
            <StepItem
              number={4}
              title="Brand Profile"
              description="Complete questionnaire"
              status={stage >= 4 ? "completed" : stage >= 3 ? "current" : "upcoming"}
              to="/portal/account"
            />
          </div>
        </div>
      )}

      {/* ── Retainer Notice (if no active plan) ─────────────────── */}
      {!subscriptionActive && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/50 p-4 text-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-[#2B7BC4] shrink-0">
              <Sparkles className="size-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0D2137]">Creative Retainer Required</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Deliverables and Calendar workflows are locked. Activate a monthly retainer to unlock full content production.
              </p>
            </div>
          </div>
          <Link
            to="/portal/payments"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] px-4 py-2 text-xs font-bold text-white hover:brightness-110 active:scale-95 transition-all shrink-0 shadow-md shadow-blue-500/20"
          >
            Choose Plan
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* ── Agency & Technical Bulletins ───────────────────────────────── */}
      <PortalAnnouncements />

      {/* ── Stat Metric Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Upcoming Posts"
          value={subscriptionActive ? pendingCount.toString() : "0"}
          description={subscriptionActive ? "Scheduled for this week" : "Requires active plan"}
          icon={<Calendar className="size-4" />}
        />
        <StatCard
          title="Open Tickets"
          value={ticketCount.toString()}
          description="Awaiting response"
          icon={<HelpCircle className="size-4" />}
        />
        <StatCard
          title="Review Pending"
          value={subscriptionActive && pendingCount > 0 ? pendingCount.toString() : "0"}
          description="Deliverables awaiting your sign-off"
          icon={<Clock className="size-4" />}
        />
        <StatCard
          title="Brand Status"
          value={subscriptionActive ? "Active" : "No Plan"}
          description={subscriptionActive ? "Weekly publishing cadence" : "Retainer required"}
          icon={<Sparkles className="size-4" />}
        />
      </div>

      {/* ── Recent Activity & Quick Links ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Recent Activity Card */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-[#0D2137]">Recent Activity</h3>
            <p className="text-[11px] text-slate-500">Your latest workspace updates and delivery milestones</p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3.5">
              <div className="bg-[#E8F4FD] p-2 rounded-full text-[#2B7BC4]">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <p className="text-sm font-semibold text-[#0D2137]">Account Configured</p>
                <p className="text-xs text-slate-500">Welcome to Creo! Your brand workspace is live.</p>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="size-3" />
                Active
              </div>
            </div>

            {!termsAccepted && (
              <div className="flex items-center gap-3.5">
                <div className="bg-amber-500/10 p-2 rounded-full text-amber-600">
                  <AlertCircle className="size-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="text-sm font-semibold text-[#0D2137]">Terms Review Required</p>
                  <p className="text-xs text-slate-500">Please review and accept our service agreement.</p>
                </div>
                <Link
                  to="/onboarding"
                  className="text-xs font-semibold text-[#2B7BC4] hover:underline flex items-center gap-1"
                >
                  Review <ArrowRight className="size-3" />
                </Link>
              </div>
            )}

            {subscriptionActive ? (
              <div className="flex items-center gap-3.5">
                <div className="bg-[#E8F4FD] p-2 rounded-full text-[#2B7BC4]">
                  <Sparkles className="size-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="text-sm font-semibold text-[#0D2137]">Weekly Creative Pipeline</p>
                  <p className="text-xs text-slate-500">
                    {pendingCount > 0 ? `${pendingCount} assets pending client review.` : "Brand production pipeline running."}
                  </p>
                </div>
                <Link
                  to="/portal/deliverables"
                  className="text-xs font-semibold text-[#2B7BC4] hover:underline flex items-center gap-1"
                >
                  View <ArrowRight className="size-3" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3.5">
                <div className="bg-slate-100 p-2 rounded-full text-slate-400">
                  <Clock className="size-4" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="text-sm font-semibold text-[#0D2137]">Creative Production Pending</p>
                  <p className="text-xs text-slate-500">Subscribe to a plan in Payments to start creative deliverables.</p>
                </div>
                <Link
                  to="/portal/payments"
                  className="text-xs font-semibold text-[#2B7BC4] hover:underline flex items-center gap-1"
                >
                  Subscribe <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links Card */}
        <div className="lg:col-span-3 rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-[#0D2137]">Quick Links</h3>
            <p className="text-[11px] text-slate-500">Frequently accessed tools and settings</p>
          </div>

          <div className="space-y-2">
            <Link
              to="/portal/account"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 hover:border-[#2B7BC4]/50 hover:bg-[#E8F4FD]/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Search className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0D2137] group-hover:text-[#2B7BC4]">Brand Summary</p>
                  <p className="text-[11px] text-slate-500">View your AI brand profile & DNA</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#2B7BC4] transition-all" />
            </Link>

            <Link
              to="/portal/support"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 hover:border-[#2B7BC4]/50 hover:bg-[#E8F4FD]/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <MessageSquare className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0D2137] group-hover:text-[#2B7BC4]">Support Desk</p>
                  <p className="text-[11px] text-slate-500">Message your dedicated account manager</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#2B7BC4] transition-all" />
            </Link>

            <Link
              to="/portal/calendar"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200/60 hover:border-[#2B7BC4]/50 hover:bg-[#E8F4FD]/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-[#E8F4FD] text-[#2B7BC4] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0D2137] group-hover:text-[#2B7BC4]">Publishing Calendar</p>
                  <p className="text-[11px] text-slate-500">View post slots & schedule</p>
                </div>
              </div>
              <ArrowRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#2B7BC4] transition-all" />
            </Link>
          </div>

          <div className="pt-2">
            <Link
              to="/portal/account"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-[#E8F4FD]/50 hover:border-[#2B7BC4]/50 hover:text-[#2B7BC4] transition-all"
            >
              <Sparkles className="size-3.5 text-[#2B7BC4]" />
              Manage Brand Guidelines
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-[#2B7BC4]/40">
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</span>
        <div className="p-2 rounded-xl bg-[#E8F4FD] text-[#2B7BC4] transition-transform duration-300 group-hover:scale-110">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-bold text-[#0D2137]">{value}</div>
        <p className="text-xs text-slate-500 flex items-center mt-1">
          {trend && <span className="text-emerald-600 font-semibold mr-1.5">{trend}</span>}
          {description}
        </p>
      </div>
    </div>
  );
}

function StepItem({
  number,
  title,
  description,
  status,
  to,
}: {
  number: number;
  title: string;
  description: string;
  status: "completed" | "current" | "upcoming";
  to?: string;
}) {
  const content = (
    <div
      className={`relative flex flex-col items-center text-center p-4 rounded-xl transition-all duration-200 ${
        status === "current" ? "bg-[#2B7BC4]/5 hover:bg-[#2B7BC4]/10 hover:scale-[1.02]" : ""
      } ${status === "upcoming" ? "opacity-50 grayscale" : ""} ${
        to && status !== "upcoming" ? "cursor-pointer hover:bg-[#E8F4FD]/60 hover:scale-[1.02]" : ""
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold mb-3 transition-colors ${
          status === "completed"
            ? "border-[#2B7BC4] bg-[#2B7BC4] text-white"
            : status === "current"
            ? "border-[#2B7BC4] text-[#2B7BC4] bg-white ring-4 ring-[#2B7BC4]/15"
            : "border-slate-300 text-slate-400 bg-slate-50"
        }`}
      >
        {status === "completed" ? <CheckCircle2 className="size-5" /> : number}
      </div>
      <p className="text-sm font-semibold text-[#0D2137]">{title}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
  );

  if (to && status !== "upcoming") {
    return <Link to={to}>{content}</Link>;
  }
  return content;
}
