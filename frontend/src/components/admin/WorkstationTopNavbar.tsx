import { AdminTopHeader } from "./AdminTopHeader";

interface WorkstationTopNavbarProps {
  activeTab?: string;
  onSearch?: (query: string) => void;
  showBackButton?: boolean;
}

export function WorkstationTopNavbar({
  activeTab,
  showBackButton = false,
}: WorkstationTopNavbarProps) {
  return <AdminTopHeader activeTab={activeTab} showBackButton={showBackButton} />;
}
