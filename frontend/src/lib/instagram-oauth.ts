import { request } from "./http";

export const INSTAGRAM_ENDPOINT = "/api/v1/portal/integrations/instagram";
const FLOW_KEY = "creo-instagram-oauth";
const RETURN_KEY = "creo-instagram-return";

export interface InstagramStatus {
  status: string;
  connected: boolean;
  configured: boolean;
  instagram_login_configured?: boolean;
  provider?: "facebook" | "instagram";
  publishing_enabled: boolean;
  username?: string | null;
  account_id?: string | null;
  picture?: string | null;
  page_name?: string | null;
  last_verified_at?: string | null;
  expires_at?: string | null;
  error?: string | null;
}

export interface InstagramSelection {
  selection_id: string;
  accounts: { id: string; username: string; page_name: string }[];
}

export const fetchInstagramStatus = () => request<InstagramStatus>(INSTAGRAM_ENDPOINT);

/**
 * Start the Meta (Facebook Login) authorization for the signed-in client.
 * `returnTo` is where the callback page sends the client afterwards, so the same
 * flow works from the portal and from the onboarding questionnaire.
 */
export async function startMetaConnect(
  userId: string,
  returnTo: string,
  beforeRedirect: () => Promise<void> = () => Promise.resolve(),
  provider: "facebook" | "instagram" = "facebook",
): Promise<void> {
  // Save answers and create the single-use OAuth flow concurrently. Never leave
  // until both succeed, and never pre-create flows merely on hover or page load.
  const [data] = await Promise.all([
    request<{ url: string; state: string; verifier: string }>(
      `${INSTAGRAM_ENDPOINT}/connect${provider === "instagram" ? "?provider=instagram" : ""}`,
      { method: "POST" },
    ),
    Promise.resolve().then(beforeRedirect),
  ]);
  sessionStorage.setItem(
    FLOW_KEY,
    JSON.stringify({ state: data.state, verifier: data.verifier, userId }),
  );
  sessionStorage.setItem(RETURN_KEY, returnTo);
  window.location.assign(data.url);
}

export function takeSavedFlow(userId: string, state: string | null) {
  const saved = sessionStorage.getItem(FLOW_KEY);
  sessionStorage.removeItem(FLOW_KEY);
  try {
    const flow = JSON.parse(saved || "null") as { state: string; verifier: string; userId: string };
    if (flow?.state !== state || flow?.userId !== userId) return null;
    return flow;
  } catch {
    return null;
  }
}

export function takeReturnPath(fallback: string): string {
  const path = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  // Only ever return to a same-origin path.
  return path?.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export const completeCallback = (body: {
  state: string;
  verifier: string;
  code: string | null;
  denied: boolean;
}) =>
  request<InstagramStatus | InstagramSelection>(`${INSTAGRAM_ENDPOINT}/callback`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const selectAccount = (selectionId: string, accountId: string) =>
  request<InstagramStatus>(`${INSTAGRAM_ENDPOINT}/select`, {
    method: "POST",
    body: JSON.stringify({ selection_id: selectionId, account_id: accountId }),
  });

export const verifyInstagram = () =>
  request<InstagramStatus>(`${INSTAGRAM_ENDPOINT}/verify`, { method: "POST" });

export const disconnectInstagram = () =>
  request<{ provider_revoked: boolean }>(INSTAGRAM_ENDPOINT, { method: "DELETE" });
