import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { getRoleHome } from "./ProtectedRoute";
import { getPostLoginRedirect } from "../../lib/useRouteMemory";

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#0D2137]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-3 border-[#2B7BC4] border-t-transparent" />
          <span className="text-xs font-semibold text-[#64748B]">Authenticating...</span>
        </div>
      </div>
    );
  }

  // Already authenticated -> redirect to saved route or role home
  if (user) {
    const defaultHome = getRoleHome(user.role);
    const destination = getPostLoginRedirect(user.role, null, defaultHome);
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}

