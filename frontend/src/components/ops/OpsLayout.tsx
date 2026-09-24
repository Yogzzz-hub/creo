import { Outlet } from "react-router";
import { AdminBottomNav } from "./AdminBottomNav";
import { useRouteMemory } from "../../lib/useRouteMemory";

export function OpsLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] text-[#0D2137] flex flex-col">
      <div className="flex-1 pb-20 lg:pb-0">
        <Outlet />
      </div>
      <AdminBottomNav />
    </div>
  );
}

