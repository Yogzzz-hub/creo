new_code = """import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { ArrowRight, ShieldCheck, Calendar, MessageCircle } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  raw_role: string;
  role: string;
  is_primary?: boolean;
}

interface DashboardData {
  assigned_team?: TeamMember[];
  active_plan?: { status: string; name?: string; price_minor?: int } | null;
}

const ROLE_CONFIG: Record<string, { tag: string; description: string }> = {
  team_lead: { tag: "MANAGEMENT", description: "Account direction & strategy" },
  creative_lead: { tag: "CREATIVE LEAD", description: "Art direction & quality control" },
  editor: { tag: "MOTION & VIDEO", description: "Reels, short-form motion & storytelling" },
  designer: { tag: "BRAND & VISUALS", description: "Posters, carousel designs & identity" },
  copywriter: { tag: "COPY & STRATEGY", description: "Ad scripts, hooks & brand messaging" },
  strategist: { tag: "STRATEGY & RESEARCH", description: "Campaign planning & audience research" },
};

function getRoleConfig(role: string) {
  const key = role.toLowerCase().replace(/\s+/g, "_");
  return ROLE_CONFIG[key] || { tag: role.toUpperCase(), description: "Creative execution & support" };
}

export function PortalCreativePodPage() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: () => request<DashboardData>("/api/v1/portal/dashboard"),
    enabled: !!user?.id,
  });

  const { data: subData } = useQuery({
    queryKey: ["client-subscription"],
    queryFn: () => request<any>("/api/v1/payments/subscription"),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isExpired =
    subData?.is_expired === true ||
    subData?.subscription?.status === "expired" ||
    subData?.subscription?.status === "canceled";

  const isStaffOrAdmin = user?.role && user.role !== "client";

  const isSubscribed =
    isStaffOrAdmin ||
    (!isExpired &&
      (subData?.is_active === true ||
        (!!subData?.subscription && ["active", "trialing"].includes(subData?.subscription?.status))));

  const assignedTeam = dashboard?.assigned_team || [];
  const podLead = assignedTeam.find((m) => m.is_primary || m.raw_role === "team_lead" || m.raw_role === "creative_lead");
  const otherMembers = assignedTeam.filter((m) => m.id !== podLead?.id);
  
  const clientTag = user?.full_name?.replace(/\\s+/g, "-").toLowerCase() || "creo-client";

  if (!isSubscribed && !isLoading) {
    return (
      <div className="space-y-5 animate-page-in max-w-[1600px] mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">Creative Pod</h1>
          <p className="text-sm text-[#64748B] mt-1">Your dedicated creative team and production unit.</p>
        </div>
        <SubscriptionLockedState
          title={isExpired ? "Creative Pod Access Expired" : "Creative Pod Locked"}
          description={isExpired
            ? "Your retainer has expired. Renew to regain access to your dedicated creative team."
            : "An active subscription is required to access your Creative Pod team directory."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-page-in mx-auto max-w-[1600px] pb-10">
      
      {/* Top Section: Lead & Team Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pod Lead Card (Left, Col-4) */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="card-surface p-6 sm:p-7 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Pod Lead</h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono font-medium tracking-wide">#{clientTag}</span>
            </div>

            {podLead ? (
              <div className="flex-1 flex flex-col">
                <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 mb-5 hover:border-slate-200 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <div className="size-14 rounded-2xl bg-white border border-slate-200 shadow-sm text-[#0F172A] flex items-center justify-center font-bold text-lg">
                        {podLead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lead</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">{podLead.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{podLead.role}</p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">{podLead.email}</p>
                  </div>
                </div>

                <div className="mt-auto">
                  <button className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-[11px] font-bold py-3 rounded-xl transition-all shadow-xs cursor-pointer group">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-110 transition-transform" />
                    Message in Slack
                    <ArrowRight className="size-3.5 ml-1 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <div className="flex items-center justify-between mt-5 px-1">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      <Calendar className="size-3.5" />
                      Bi-Weekly Sync
                    </span>
                    <span className="text-[11px] font-bold text-slate-700">Tomorrow 10:30 AM PST</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <span className="text-sm font-semibold text-slate-500">No Lead Assigned</span>
              </div>
            )}
          </div>
        </div>

        {/* Creative Team Directory (Right, Col-8) */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="card-surface p-6 sm:p-7 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Creative Team Directory</h2>
                  <span className="text-[11px] font-bold text-slate-400">({otherMembers.length} Dedicated Specialists)</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Assigned full-time creative pod for your brand</p>
              </div>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-mono font-medium text-slate-500">
                # creo-{clientTag}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-3 border-[#0052FF] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : otherMembers.length === 0 ? (
              <div className="text-center py-16 text-[#64748B]">
                <p className="text-sm font-semibold">No specialists assigned yet</p>
                <p className="text-xs mt-1">Your creative pod will be assembled once your onboarding is complete.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {otherMembers.map((member) => {
                  const rc = getRoleConfig(member.raw_role);
                  const initials = member.name.split(" ").map((n) => n[0]).join("").slice(0, 2);
                  return (
                    <div
                      key={member.id}
                      className="group rounded-2xl border border-slate-100 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all duration-300 cursor-default flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-100 text-[#0F172A] flex items-center justify-center font-bold text-xs group-hover:bg-blue-50 transition-colors">
                          {initials}
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <h3 className="text-sm font-bold text-[#0F172A] mb-0.5">{member.name}</h3>
                        <p className="text-[11px] font-medium text-slate-500">{member.role}</p>
                      </div>

                      <div className="mt-auto">
                        <span className="inline-block px-2.5 py-1 rounded-md border border-slate-200 text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">
                          {rc.tag}
                        </span>
                        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
                          {rc.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-400">Execution Pod Capacity</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                100% Guaranteed Availability
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Deliverable Allocation */}
      {dashboard?.active_plan && (
        <div className="card-surface p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-[#0F172A] tracking-tight">Deliverable Allocation</h2>
              <p className="text-xs text-slate-500 mt-1">Capacity allotment, review cycle cadence, and current tier specifications</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
              <ShieldCheck className="size-3.5 text-emerald-500" />
              Telemetry Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-slate-200 transition-colors">
              <span className="text-[11px] font-bold text-slate-500 mb-4">Dedicated Team</span>
              <div>
                <div className="flex items-baseline gap-1.5 mb-4 border-b border-slate-200 pb-4">
                  <span className="text-3xl font-black text-[#0F172A]">{assignedTeam.length}</span>
                  <span className="text-[13px] font-medium text-slate-500">Specialists</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">Full dedicated pod allocation</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-slate-200 transition-colors">
              <span className="text-[11px] font-bold text-slate-500 mb-4">Revision Rounds</span>
              <div>
                <div className="flex items-baseline gap-1.5 mb-4 border-b border-slate-200 pb-4">
                  <span className="text-3xl font-black text-[#0F172A]">
                    {dashboard.active_plan.name?.toLowerCase().includes("pro") ? "∞" : "Standard"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">2 rounds included per asset</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-slate-200 transition-colors">
              <span className="text-[11px] font-bold text-slate-500 mb-4">Pod Status</span>
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-2xl font-black text-[#0F172A]">Active</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">All execution pipelines operational</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 flex flex-col justify-between hover:border-slate-200 transition-colors">
              <span className="text-[11px] font-bold text-slate-500 mb-4">Active Tier</span>
              <div>
                <div className="flex items-baseline gap-1.5 mb-4 border-b border-slate-200 pb-4">
                  <span className="text-xl sm:text-2xl font-black text-[#0F172A] truncate">
                    {dashboard.active_plan.name || "Brand Accelerator"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">₹50,000 / month retainer</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between pt-8 pb-4 px-2 text-[11px] font-medium text-slate-500 border-t border-slate-200/50 mt-12">
        <span>© 2026 Creo Creative Execution Unit. All rights reserved.</span>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Security SLA</a>
        </div>
      </div>
    </div>
  );
}
"""

with open('d:/intern/creo/frontend/src/pages/portal/PortalCreativePodPage.tsx', 'w', encoding='utf-8') as f:
    f.write(new_code)

print("Rewrite successful")
