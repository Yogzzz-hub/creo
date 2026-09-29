import { useState } from "react";
import { 
  Check, Star, Leaf, Building2, MessageSquare, 
  BarChart2, Banknote, CreditCard, Users, Shield 
} from "lucide-react";

export function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  return (
    <div className="min-h-screen bg-[#050810] pt-24 pb-20">
      
      {/* Hero Header & Billing Switcher */}
      <div className="max-w-4xl mx-auto px-6 text-center mb-16">
        <div className="inline-flex items-center justify-center bg-[#121926] border border-[#222F44] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full mb-6">
          ⚡ PREDICTABLE AGENCY INFRASTRUCTURE
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-[#F8FAFC] tracking-tight max-w-2xl mx-auto mb-4">
          Simple, transparent pricing that <span className="text-[#7FA0D6]">scales with your agency.</span>
        </h1>
        <p className="text-sm text-[#97A0B3] max-w-xl mx-auto mb-8">
          No hidden seat taxes or per-project gouging. Choose the operating tier that matches your studio cadence and reclaim your true profit margins.
        </p>
        
        <div className="bg-[#0A0F18] border border-[#222F44] p-1 rounded-full inline-flex mx-auto">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`font-medium text-xs px-4 py-1.5 transition-colors rounded-full ${
              billingCycle === 'monthly'
                ? 'bg-[#121926] border border-[#222F44] text-[#F8FAFC] shadow-sm'
                : 'text-[#97A0B3] hover:text-[#F8FAFC]'
            }`}
          >
            Monthly Billing
          </button>
          <button 
            onClick={() => setBillingCycle('annual')}
            className={`font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${
              billingCycle === 'annual'
                ? 'bg-[#121926] border border-[#222F44] text-[#F8FAFC] shadow-sm'
                : 'text-[#97A0B3] hover:text-[#F8FAFC]'
            }`}
          >
            Annual Billing (Save 20%) ⚡
          </button>
        </div>
      </div>

      {/* 3 Pricing Tier Bento Cards */}
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Card 1: Boutique Studio */}
          <div className="bg-[#121926] border border-[#222F44] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#0A0F18] border border-[#222F44] p-2 rounded-lg text-white w-9 h-9 flex items-center justify-center shrink-0">
                  <Star className="size-4" />
                </div>
                <div>
                  <h3 className="text-[#F8FAFC] font-bold text-base">Boutique Studio</h3>
                  <p className="text-[#97A0B3] text-[10px]">Starter OS</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-[#F8FAFC]">
                    {billingCycle === 'annual' ? '₹14,900' : '₹18,625'}
                  </span>
                  <span className="text-[#97A0B3] text-xs font-medium mb-1">/month</span>
                </div>
                <div className="text-[#97A0B3] text-[10px] mt-1">
                  (Billed {billingCycle === 'annual' ? 'annually' : 'monthly'})
                </div>
              </div>
              
              <p className="text-xs text-[#97A0B3] my-4 leading-relaxed">
                For emerging creative shops replacing messy WhatsApp chasing and Drive links.
              </p>
              
              <div className="bg-[#0A0F18] border border-[#222F44] text-[11px] text-[#F8FAFC] font-medium py-1.5 px-3 rounded-lg text-center mb-6">
                Up to 10 Team Seats &bull; 15 Active Client Pods
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  "Six-milestone workflow rail (Lead to Report)",
                  "1-Click Client Approval Portal with revision timers",
                  "Real-time Team Capacity Pod (Utilization radar)",
                  "Centralized asset dossiers & Figma/Adobe sync",
                  "Standard email & Slack support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 py-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="text-xs text-[#F8FAFC] leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button className="w-full bg-[#0A0F18] border border-[#222F44] hover:bg-[#1A2333] text-[#F8FAFC] text-xs font-semibold py-3 rounded-full text-center mt-auto transition">
              Deploy Boutique OS &rarr;
            </button>
          </div>

          {/* Card 2: Growth OS (Featured) */}
          <div className="bg-[#121926] border-2 border-[#7FA0D6] rounded-2xl p-6 flex flex-col justify-between relative shadow-[0_0_30px_rgba(127,160,214,0.12)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7FA0D6] text-[#050810] font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-sm">
              ★ MOST POPULAR
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#0A0F18] border border-[#222F44] p-2 rounded-lg text-[#10B981] w-9 h-9 flex items-center justify-center shrink-0">
                  <Leaf className="size-4" />
                </div>
                <div>
                  <h3 className="text-[#F8FAFC] font-bold text-base">Growth OS</h3>
                  <p className="text-[#97A0B3] text-[10px]">Agency Standard</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-[#F8FAFC]">
                    {billingCycle === 'annual' ? '₹34,900' : '₹43,625'}
                  </span>
                  <span className="text-[#97A0B3] text-xs font-medium mb-1">/month</span>
                </div>
                <div className="text-[#97A0B3] text-[10px] mt-1">
                  (Billed {billingCycle === 'annual' ? 'annually' : 'monthly'})
                </div>
              </div>
              
              <p className="text-xs text-[#97A0B3] my-4 leading-relaxed">
                For scaling content and design studios requiring real-time unit economics and zero burnout.
              </p>
              
              <div className="bg-[#0A0F18] border border-[#222F44] text-[11px] text-[#F8FAFC] font-medium py-1.5 px-3 rounded-lg text-center mb-6">
                Up to 30 Team Seats &bull; Unlimited Client Pods
              </div>
              
              <div className="text-[11px] font-bold text-[#F8FAFC] mb-4">
                Everything in Boutique Studio, plus:
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  "Astra Living Retainer Unit Economics Ledger (41.25% Margin Tracker)",
                  "Automated Revision SLA Tickets & Auto-Assign to Leads",
                  "Collections Pipeline engine (₹2.1L automated recovery cadence)",
                  "Multi-pod Bottleneck Radar & Editorial Calendar tables",
                  "White-label client portal branding"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 py-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="text-xs text-[#F8FAFC] leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button className="w-full bg-[#BCCCE6] hover:bg-white text-[#050810] text-xs font-bold py-3 rounded-full text-center mt-auto transition">
              Launch Growth OS &rarr;
            </button>
          </div>

          {/* Card 3: Agency Network */}
          <div className="bg-[#121926] border border-[#222F44] rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#0A0F18] border border-[#222F44] p-2 rounded-lg text-white w-9 h-9 flex items-center justify-center shrink-0">
                  <Building2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-[#F8FAFC] font-bold text-base">Agency Network</h3>
                  <p className="text-[#97A0B3] text-[10px]">Scale &amp; Enterprise</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-[#F8FAFC]">
                    {billingCycle === 'annual' ? '₹79,900' : '₹99,875'}
                  </span>
                  <span className="text-[#97A0B3] text-xs font-medium mb-1">/month</span>
                </div>
                <div className="text-[#97A0B3] text-[10px] mt-1">
                  (Billed {billingCycle === 'annual' ? 'annually' : 'monthly'})
                </div>
              </div>
              
              <p className="text-xs text-[#97A0B3] my-4 leading-relaxed">
                For multi-department creative networks demanding custom integrations and governance.
              </p>
              
              <div className="bg-[#0A0F18] border border-[#222F44] text-[11px] text-[#F8FAFC] font-medium py-1.5 px-3 rounded-lg text-center mb-6">
                Unlimited Seats &bull; Unlimited Dedicated Pods
              </div>
              
              <div className="text-[11px] font-bold text-[#F8FAFC] mb-4">
                Everything in Growth OS, plus:
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  "Custom agency domain white-labeling (portal.youragency.com)",
                  "Multi-entity consolidated profit & loss reporting",
                  "SOC-2 Type II enterprise compliance & data encryption",
                  "Dedicated Agency Solutions Architect & 24/7 priority SLA",
                  "Custom API webhooks & billing automation"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 py-1.5">
                    <div className="w-4 h-4 rounded-full bg-[#7FA0D6] text-[#050810] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span className="text-xs text-[#F8FAFC] leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button className="w-full bg-[#0A0F18] border border-[#222F44] hover:bg-[#1A2333] text-[#F8FAFC] text-xs font-semibold py-3 rounded-full text-center mt-auto transition">
              Contact Solutions Team &rarr;
            </button>
          </div>

        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-[1240px] mx-auto px-6 mt-24">
        
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
                <div className="bg-[#121926] border border-[#222F44] p-1.5 rounded-md text-[#10B981] w-6 h-6 flex items-center justify-center shrink-0">
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
                <div className="text-xs sm:text-sm text-[#F8FAFC] font-medium">Automated Auto-Chase (₹2.1L Cadence)</div>
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
