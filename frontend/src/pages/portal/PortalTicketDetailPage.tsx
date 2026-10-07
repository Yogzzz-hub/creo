import { LiveTicketDetail } from "../../components/ui/LiveTicketDetail";
export function PortalTicketDetailPage() { return <LiveTicketDetail portal={true} />; }
export const ClientTicketDetailPage = PortalTicketDetailPage;
