import { Instagram, Facebook } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { parseInstagramCallback } from "../../lib/instagram-callback";
import {
  type InstagramSelection,
  completeCallback,
  selectAccount,
  takeReturnPath,
  takeSavedFlow,
} from "../../lib/instagram-oauth";

const DEFAULT_RETURN = "/portal/account?tab=integrations";

/**
 * Meta redirects back here (INSTAGRAM_REDIRECT_URI). It lives outside the portal
 * onboarding gate so a client can finish connecting from the onboarding questionnaire.
 */
export function InstagramCallbackPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const started = useRef(false);
  const [callback] = useState(() => parseInstagramCallback(window.location.search));
  const ProviderLogo = callback.state?.startsWith("ig:") ? Instagram : Facebook;
  const providerLabel = callback.state?.startsWith("ig:") ? "Instagram" : "Facebook";
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [selection, setSelection] = useState<InstagramSelection | null>(null);
  const returnPath = useRef(DEFAULT_RETURN);

  const finish = () => {
    void cache.invalidateQueries({ queryKey: ["instagram-connection"] });
    void cache.invalidateQueries({ queryKey: ["portal-profile"] });
    void cache.invalidateQueries({ queryKey: ["portal-dashboard"] });
    setDone(true);
    navigate(returnPath.current, { replace: true });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per callback; finish() only uses refs and stable setters
  useEffect(() => {
    if (!user || started.current || !callback.hasResponse) return;
    started.current = true;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    returnPath.current = takeReturnPath(
      user.onboarding_stage < 8 ? "/onboarding?step=4&section=h" : DEFAULT_RETURN,
    );
    const flow = takeSavedFlow(user.id, callback.state);
    // Provider failures may omit state entirely. Show them without exchanging a code
    // or claiming success; a successful callback still requires the saved verifier.
    if (callback.error) {
      setError(callback.error);
      setBusy(false);
      return;
    }
    if (!flow) {
      setError(
        "Authorization state is missing or expired. Start the connection again in this browser.",
      );
      setBusy(false);
      return;
    }
    completeCallback({
      state: flow.state,
      verifier: flow.verifier,
      code: callback.code,
      denied: false,
    })
      .then((data) => {
        if ("accounts" in data) setSelection(data);
        else if (data.connected) finish();
        else setError(data.error || "Meta did not connect an Instagram account. Try again.");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Connection failed. Try again."))
      .finally(() => setBusy(false));
  }, [user]);

  async function choose(accountId: string) {
    if (!selection) return;
    setBusy(true);
    setError("");
    try {
      const result = await selectAccount(selection.selection_id, accountId);
      if (!result.connected) throw new Error(result.error || "The account did not connect. Try again.");
      setSelection(null);
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect that account.");
    } finally {
      setBusy(false);
    }
  }

  if (!callback.hasResponse) return <Navigate to={DEFAULT_RETURN} replace />;

  return (
    <main className="min-h-screen bg-[#0B111C] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#2A3446] bg-[#161F2D] p-6 space-y-4 text-center">
        <ProviderLogo aria-hidden="true" className={`size-12 mx-auto ${busy ? "animate-pulse motion-reduce:animate-none" : ""} ${providerLabel === "Instagram" ? "text-pink-400" : "text-blue-400"}`} />
        <h1 className="text-lg font-bold">Connecting {providerLabel}</h1>
        {busy && <output className="block text-sm text-[#97A0B3]">Finishing authorization…</output>}
        {done && (
          <output className="block text-sm text-emerald-300">
            Instagram connected. Taking you back…
          </output>
        )}
        {error && (
          <div role="alert" className="space-y-3">
            <p className="text-sm text-rose-300 break-words">{error}</p>
            <button
              type="button"
              onClick={() => navigate(returnPath.current, { replace: true })}
              className="px-5 py-2 rounded-xl bg-[#BCCCE6] text-[#0B111C] text-xs font-bold hover:bg-white cursor-pointer"
            >
              Go back
            </button>
          </div>
        )}
        {selection && (
          <div className="space-y-2 text-left">
            <p className="text-sm font-semibold">Choose the account for this workspace</p>
            {selection.accounts.map((a) => (
              <button
                type="button"
                key={a.id}
                disabled={busy}
                onClick={() => void choose(a.id)}
                className="block w-full text-left min-h-11 rounded-xl border border-[#2A3446] px-4 py-2 text-sm font-semibold hover:bg-[#2A3446] disabled:opacity-50 cursor-pointer"
              >
                @{a.username} · {a.page_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
