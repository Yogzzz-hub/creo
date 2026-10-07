import { useQuery } from "@tanstack/react-query";
import { fetchSLABreaches } from "../../lib/ops-api";
import { LiveAdminFrame, DataState } from "./LiveAdminPages";
import { SlaPerformanceWidget } from "../../components/admin/SlaPerformanceWidget";
export function AdminSLAPerformancePage() { const query = useQuery({ queryKey: ["admin_sla_breaches"], queryFn: () => fetchSLABreaches() }); return <LiveAdminFrame title="SLA alerts"><DataState query={query} />{query.data && <SlaPerformanceWidget slas={query.data} />}</LiveAdminFrame>; }
