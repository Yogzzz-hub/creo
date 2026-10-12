export interface PortalLockState {
  isClient: boolean;
  onboardingComplete: boolean;
  subscription?: {
    is_active?: boolean;
    is_expired?: boolean;
    subscription?: { status?: string } | null;
  };
}

/** Match each page's access rule; account, support and billing remain available. */
export function portalLockReason(path: string, state: PortalLockState): string | null {
  if (!state.isClient) return null;
  const pathname = (path.split("?")[0] ?? "").replace(/\/$/, "");
  const section = pathname.split("/")[2] ?? "";
  const onboardingSections = ["deliverables", "library", "creative-pod", "creative_pod", "slack", "brand", "brand-dna"];
  if (onboardingSections.includes(section) && !state.onboardingComplete) {
    return "Complete workspace setup to unlock this page";
  }
  const sub = state.subscription;
  if (sub && (section === "calendar" || section === "deliverables")) {
    const expired = sub.is_expired === true || ["expired", "canceled"].includes(sub.subscription?.status ?? "");
    const active = !expired && (sub.is_active === true || ["active", "trialing"].includes(sub.subscription?.status ?? ""));
    if (!active) return "An active subscription is required to unlock this page";
  }
  return null;
}
