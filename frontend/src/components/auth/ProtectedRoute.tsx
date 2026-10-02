import React from "react";
import { Navigate, useLocation, Outlet } from "react-router";
import { useAuth } from "../../lib/auth-context";

export const ROLE_HOMES: Record<string, string> = {
  client: "/portal",
  team_member: "/workstation",
  team_lead: "/admin/pod-dashboard",
  editor: "/workstation",
  designer: "/workstation",
  sales: "/admin/sales",
  admin: "/admin",
  super_admin: "/admin",
  investor_relations: "/admin/reports",
};

export function getRoleHome(role?: string | null): string {
  if (!role) return "/portal";
  return ROLE_HOMES[role] || "/portal";
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
        <div className="flex min-h-screen items-center justify-center bg-nebula-navy text-slate-50 p-6">
          <div className="w-full max-w-md rounded-3xl border border-nebula-steel bg-nebula-surface p-8 shadow-2xl text-center space-y-6">
            <div className="size-14 mx-auto rounded-2xl bg-nebula-navy border border-nebula-steel flex items-center justify-center text-2xl text-nebula-sand">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Access Restricted</h2>
              <p className="text-xs text-nebula-mist leading-relaxed">
                This operations portal requires <span className="font-semibold text-white">Admin or Staff</span> permissions.
                You are currently signed in as <span className="font-mono text-nebula-glow font-semibold">{user.email}</span> ({user.role}).
              </p>
            </div>
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = getRoleHome(user.role);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-nebula-periwinkle text-nebula-navy text-xs font-bold hover:bg-white transition-colors shadow-xs cursor-pointer"
              >
                Go to Your Portal ({getRoleHome(user.role)})
              </button>
              <button
                type="button"
                onClick={() => {
                  const returnUrl = encodeURIComponent(location.pathname + location.search);
                  window.location.href = `/login?redirectedFrom=${returnUrl}`;
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-nebula-steel text-nebula-mist hover:text-white text-xs font-bold hover:bg-nebula-surface transition-colors cursor-pointer"
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
