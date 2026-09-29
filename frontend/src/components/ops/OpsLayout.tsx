import { Outlet } from "react-router";
import { useRouteMemory } from "../../lib/useRouteMemory";

export function OpsLayout() {
  // Passively save current route to sessionStorage on every navigation
  useRouteMemory();

  return (
    <div className="min-h-screen w-full bg-[#F9FAFB] text-[#0D2137] flex flex-col">
      <Outlet />
    </div>
  );
}
