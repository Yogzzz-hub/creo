import { 
  Star, Leaf, Building2, MessageSquare, 
  BarChart2, Banknote, CreditCard, Users, Shield 
} from "lucide-react";
import { PricingCards } from "../../components/public/PricingCards";

export function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050810] pt-6 sm:pt-8 lg:pt-10 pb-16 sm:pb-20">
      
      {/* Hero Header */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-10 sm:mb-12">
        <div className="inline-flex items-center justify-center bg-[#121926] border border-[#222F44] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full mb-6">
          ⚡ PREDICTABLE AGENCY INFRASTRUCTURE
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-[#F8FAFC] tracking-tight max-w-2xl mx-auto mb-4">
          Simple, transparent pricing that <span className="text-[#7FA0D6]">scales with your agency.</span>
        </h1>
        <p className="text-sm text-[#97A0B3] max-w-xl mx-auto">
          No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
        </p>
      </div>

      {/* 3 Pricing Tier Bento Cards */}
      <div className="max-w-[1240px] mx-auto px-6">
        <PricingCards />
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-[1240px] mx-auto px-6 mt-14 sm:mt-16">
        
        <div className="mb-10 text-center lg:text-left">
          <div className="inline-flex items-center bg-[#121926] border border-[#222F44] text-[#7FA0D6] text-[10px] font-bold px-3 py-1 rounded-full mb-4">
            ⚡ FEATURE COMPARISON
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] tracking-tight mb-2">
            Compare Platform Architecture &amp; Operating Capabilities.
          </h2>
          <p className="text-sm text-[#97A0B3]">
            Everything your agency needs to operate without friction.
          </p>
        </div>

        <div className="bg-[#121926] border border-[#222F44] rounded-2xl overflow-hidden overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Table Header */}
            <div className="grid grid-cols-4 bg-[#0A0F18] border-b border-[#222F44] p-6 items-center">
              <div className="text-sm font-bold text-[#F8FAFC]">Operating Capability</div>
              <div className="flex items-center gap-2">
                <div className="bg-[#121926] border border-[#222F44] p-1.5 rounded-md text-white w-6 h-6 flex items-center justify-center shrink-0">
                  <Star className="size-3" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F8FAFC]">Boutique Studio</div>
                  <div className="text-[10px] text-[#97A0B3]">Starter OS</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-[#121926] border border-[#222F44] p-1.5 rounded-md text-[#7FA0D6] w-6 h-6 flex items-center justify-center shrink-0">
                  <Leaf className="size-3" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F8FAFC]">Growth OS</div>
                  <div className="text-[10px] text-[#97A0B3]">Agency Standard</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-[#121926] border border-[#222F44] p-1.5 rounded-md text-white w-6 h-6 flex items-center justify-center shrink-0">
                  <Building2 className="size-3" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#F8FAFC]">Agency Network</div>
                  <div className="text-[10px] text-[#97A0B3]">Scale &amp; Enterprise</div>
                </div>
              </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-[#222F44]/50">
              
              {/* Row 1 */}
              <div className="grid grid-cols-4 items-center py-4 px-6 hover:bg-[#0A0F18]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A0F18] border border-[#222F44] flex items-center justify-center shrink-0">
                    <MessageSquare className="size-4 text-[#7FA0D6]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Client Approval Portal</span>
                </div>
                <div className="text-xs sm:text-sm text-[#97A0B3]">1-Click Links</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Automated Revision SLA</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Custom CNAME Domain</div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-4 items-center py-4 px-6 hover:bg-[#0A0F18]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A0F18] border border-[#222F44] flex items-center justify-center shrink-0">
                    <BarChart2 className="size-4 text-[#7FA0D6]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Capacity &amp; Workload Radar</span>
                </div>
                <div className="text-xs sm:text-sm text-[#97A0B3]">Basic Meters</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Multi-Role Heatmaps (82% Alerts)</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Predictive Pod Resourcing</div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-4 items-center py-4 px-6 hover:bg-[#0A0F18]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A0F18] border border-[#222F44] flex items-center justify-center shrink-0">
                    <Banknote className="size-4 text-[#7FA0D6]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Financial &amp; Unit Economics</span>
                </div>
                <div className="text-xs sm:text-sm text-[#97A0B3]">Basic Invoicing</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Full Contribution Ledger (41.25%)</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Multi-Entity P&amp;L Engine</div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-4 items-center py-4 px-6 hover:bg-[#0A0F18]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A0F18] border border-[#222F44] flex items-center justify-center shrink-0">
                    <CreditCard className="size-4 text-[#7FA0D6]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Collections Pipeline</span>
                </div>
                <div className="text-xs sm:text-sm text-[#97A0B3]">Manual Reminders</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Automated Auto-Chase (7-Day Cadence)</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Custom ERP &amp; Payment Gateways</div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-4 items-center py-4 px-6 hover:bg-[#0A0F18]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A0F18] border border-[#222F44] flex items-center justify-center shrink-0">
                    <Users className="size-4 text-[#7FA0D6]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Active Team Seats</span>
                </div>
                <div className="text-xs sm:text-sm text-[#97A0B3]">10 Seats</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">30 Seats</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Unlimited</div>
              </div>

              {/* Row 6 */}
              <div className="grid grid-cols-4 items-center py-4 px-6 hover:bg-[#0A0F18]/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#0A0F18] border border-[#222F44] flex items-center justify-center shrink-0">
                    <Shield className="size-4 text-[#7FA0D6]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[#F8FAFC]">Security &amp; Auditing</span>
                </div>
                <div className="text-xs sm:text-sm text-[#97A0B3]">Standard SSL</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Role-Based Access (RBAC)</div>
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">SOC-2 Type II Certified</div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
