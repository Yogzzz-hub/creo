import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { useOnboardingGate } from "./useOnboardingGate";
import { request } from "./http";
import { portalLockReason, type PortalLockState } from "./portal-navigation-locks";

export function usePortalNavigationLocks() {
  const { user } = useAuth();
  const gate = useOnboardingGate();
  const { data: subscription } = useQuery<PortalLockState["subscription"]>({
    queryKey: ["client-subscription", user?.id],
    queryFn: () => request("/api/v1/payments/subscription"),
    enabled: !!user?.id && gate.isClient,
    staleTime: 30_000,
  });
  return (path: string) => portalLockReason(path, {
    isClient: gate.isClient,
    onboardingComplete: gate.isComplete,
    subscription,
  });
}
