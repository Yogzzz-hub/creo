import React from "react";
import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "../../lib/auth-context";

export const ROLE_HOMES: Record<string, string> = {
  client: "/portal",
  client_owner: "/portal",
  team_member: "/workstation",
  team_lead: "/admin/pod-dashboard",
  editor: "/workstation",
  designer: "/workstation",
  sales: "/bde",
  bde: "/bde",
  bde_head: "/bde/crm/overview",
  admin: "/admin",
  super_admin: "/admin",
  platform_super_admin: "/platform",
  platform_finance: "/platform",
  platform_support: "/platform/agencies",
  investor_relations: "/admin/reports",
  freelancer: "/freelancer/tasks",
};

export function getRoleHome(role?: string | null): string {
  if (!role) return "/portal";
  const r = role.toLowerCase();
  if (r === "platform_super_admin" || r === "platform_finance" || r === "platform_support") return ROLE_HOMES[r] || "/platform";
  if (r === "admin" || r === "super_admin" || r.includes("admin")) return "/admin";
  if (r === "client" || r === "client_owner" || r.includes("client")) return "/portal";
  return ROLE_HOMES[r] || ROLE_HOMES[role] || "/portal";
}

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

import { CreoLoadingScreen } from "../ui/CreoLoadingScreen";

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <CreoLoadingScreen label="Verifying session..." />;
  }

  // Not logged in -> redirect to login with return path
  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectedFrom=${returnUrl}`} replace />;
  }

  if (user.must_reset_password) return null;

  // Role check: Admin and super_admin have universal access
  if (allowedRoles && allowedRoles.length > 0) {
    const isSuperOrAdmin = user.role === "admin" || user.role === "super_admin";
    const hasPermission = isSuperOrAdmin || allowedRoles.includes(user.role);

    if (!hasPermission) {
      const targetHome = getRoleHome(user.role);
      if (targetHome && targetHome !== location.pathname) {
        return <Navigate to={targetHome} replace />;
      }

      // Fallback Access Restricted UI if user is already at their targetHome
      return (
        <div className="flex min-h-screen items-center justify-center bg-app-base text-app-ink p-6">
          <div className="w-full max-w-md rounded-3xl border border-app-line bg-app-surface p-8 shadow-2xl text-center space-y-6">
            <div className="size-14 mx-auto rounded-2xl bg-app-base border border-app-line flex items-center justify-center text-2xl text-app-warm">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-hi">Access Restricted</h2>
              <p className="text-xs text-app-mist leading-relaxed">
                This operations portal requires <span className="font-semibold text-hi">Admin or Staff</span> permissions.
                You are currently signed in as <span className="font-mono text-app-accent font-semibold">{user.email}</span> ({user.role}).
              </p>
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = getRoleHome(user.role);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-app-accent-soft text-app-base text-xs font-bold hover:bg-hi transition-colors shadow-xs cursor-pointer"
              >
                Go to Your Portal ({getRoleHome(user.role)})
              </button>
              <button
                type="button"
                onClick={() => {
                  const returnUrl = encodeURIComponent(location.pathname + location.search);
                  window.location.href = `/login?redirectedFrom=${returnUrl}`;
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-app-line text-app-mist hover:text-hi text-xs font-bold hover:bg-app-surface transition-colors cursor-pointer"
              >
                Sign In with Admin Account
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
