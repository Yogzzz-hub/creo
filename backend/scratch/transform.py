import re

with open(r'd:\intern\creo\jsx_dashboard.txt', 'r', encoding='utf-8') as f:
    jsx = f.read()

# Remove the header completely from jsx
jsx = re.sub(r'<header.*?</header>', '', jsx, flags=re.DOTALL)

react_code = '''import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { PlanBargainCallModal } from "../../components/portal/PlanBargainCallModal";

export interface TeamHandler {
  id: string;
  name: string;
  email: string;
  raw_role: string;
  role: string;
  is_primary?: boolean;
}

interface DashboardData {
  pending_deliverable_count: number;
  open_ticket_count: number;
  ai_summary_line: string | null;
  onboarding_stage: number;
  brand_summary: string | null;
  account_status?: string;
  terms_accepted?: boolean;
  active_plan?: { status: string; name?: string; price_minor?: number } | null;
  created_at?: string | null;
  assigned_team?: TeamHandler[];
}

interface CalendarEntry {
  id: string;
  title?: string;
  date: string;
  scheduled_at?: string;
  status: string;
  file_url?: string;
  type?: string;
  file_type?: string;
}

export function PortalDashboardPage() {
  const { user } = useAuth();
  const [bargainModalOpen, setBargainModalOpen] = useState(false);

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["portal-dashboard", user?.id],
    queryFn: async () => {
      return await request<DashboardData>("/api/v1/portal/dashboard");
    },
    refetchInterval: 15000,
  });

  const { data: rawEntries = [] } = useQuery<CalendarEntry[]>({
    queryKey: ["calendar-entries", user?.id],
    queryFn: async () => {
      try {
        const res = await request<CalendarEntry[]>("/api/v1/calendar/entries");
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    enabled: !!dashboard?.active_plan,
  });

  const pendingCount = dashboard?.pending_deliverable_count ?? 0;
  const ticketCount = dashboard?.open_ticket_count ?? 0;
  const subscriptionActive = !!dashboard?.active_plan && ["active", "trialing"].includes(dashboard?.active_plan?.status);
  const stage = dashboard?.onboarding_stage ?? user?.onboarding_stage ?? 1;

  const lead = dashboard?.assigned_team?.find(t => t.is_primary) || dashboard?.assigned_team?.[0];
  const specialists = dashboard?.assigned_team?.filter(t => !t.is_primary) || [];

  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8">
      <PlanBargainCallModal isOpen={bargainModalOpen} onClose={() => setBargainModalOpen(false)} />
      ''' + jsx + '''
    </div>
  );
}
'''

def fix_style(m):
    parts = []
    for p in m.group(1).split(';'):
        if ':' in p:
            k, v = p.split(':', 1)
            k = k.strip()
            v = v.strip()
            if '-' in k:
                comps = k.split('-')
                k = comps[0] + ''.join(c.capitalize() for c in comps[1:])
            parts.append(f"{k}: '{v}'")
    return "style={{" + ", ".join(parts) + "}}"

react_code = re.sub(r'style="([^"]+)"', fix_style, react_code)

react_code = react_code.replace('class=', 'className=')

with open(r'd:\intern\creo\frontend\src\pages\portal\PortalDashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(react_code)
