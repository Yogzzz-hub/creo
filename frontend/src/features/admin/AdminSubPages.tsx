import { Navigate } from "react-router";
export { LiveAdminClientsPage as AdminClientsPage, LiveAdminTasksPage as AdminTasksPage, LiveAdminDeliverablesPage as AdminDeliverablesPage, LiveAdminTeamPage as AdminTeamManagementPage, LiveAdminTeamPage as AdminTeamsPage, LiveAdminRevenuePage as AdminRevenuePage } from "./LiveAdminPages";
export { LiveAdminPlansPage as AdminPlansPage, LiveAdminPlansPage as AdminSalesPage } from "./LiveAdminPlansPage";
export { PodScheduleLeavePage as AdminLeaveApprovalsPage, PodScheduleLeavePage as AdminLeavePage } from "../../pages/admin/PodScheduleLeavePage";
export function AdminAnnouncementsPage() { return <Navigate to="/admin" replace />; }
export function AdminReportsPage() { return <Navigate to="/admin" replace />; }
export function AdminAddonsPage() { return <Navigate to="/admin" replace />; }
export function AdminEscalationsPage() { return <Navigate to="/admin" replace />; }
export function AdminSettingsPage() { return <Navigate to="/admin" replace />; }
