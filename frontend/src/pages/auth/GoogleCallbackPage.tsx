import "../../styles/public-responsive.css";
import "../../styles/public-theme.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2 } from "lucide-react";
import { AuthWordmark, EYEBROW, TEXT_ACTION } from "../../components/auth/AuthPieces";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { DISPLAY, PillLink } from "../../components/public/StagePieces";
import { Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";
import { request } from "../../lib/http";
import { GOOGLE_OAUTH_STATE_KEY, useAuth } from "../../lib/auth-context";
import { setAuthToken } from "../../lib/auth-token";
import type { AuthUser } from "../../lib/auth-context";
import { getRoleHome } from "../../components/auth/ProtectedRoute";
import { getPostLoginRedirect } from "../../lib/useRouteMemory";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh, user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);

  // Handshake step indicator
  const [step, setStep] = useState<number>(1);

  // Prevent duplicate execution from StrictMode or re-renders
  const hasExchangedRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(2), 600);
    const t2 = setTimeout(() => setStep(3), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    // refresh() changes identity on every provider render; run the handshake once.
    if (hasExchangedRef.current) return;
    hasExchangedRef.current = true;

    const token = searchParams.get("token");
    if (token) {
      setAuthToken(token);
      refresh()
        .then(() => {
          setStatus("success");
          setTimeout(() => {
            const destination = getPostLoginRedirect("client", null, "/portal");
            navigate(destination);
          }, 900);
        })
        .catch(() => {
          setStatus("success");
          setTimeout(() => {
            navigate("/portal");
          }, 900);
        });
      return;
    }

    const code = searchParams.get("code");
    if (!code) {
      setStatus("error");
      setErrorMessage(
        searchParams.get("error") === "access_denied"
          ? "Google sign-in was cancelled."
          : "No authorization code received from Google.",
      );
      return;
    }

    // The state must match the one this tab sent to Google, or the code may belong
    // to someone else's account (login CSRF).
    let expectedState: string | null = null;
    try {
      expectedState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
    } catch {
      // sessionStorage unavailable
    }
    if (!expectedState || searchParams.get("state") !== expectedState) {
      setStatus("error");
      setErrorMessage("This Google sign-in link has expired or was started elsewhere. Please try again.");
      return;
    }

    const exchangeCode = async () => {
      try {
        const redirectUri = window.location.origin + window.location.pathname;
        const res = await request<{ access_token: string; user: AuthUser }>(
          "/api/v1/auth/google/callback",
          {
            method: "POST",
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          },
        );

        if (res.access_token) {
          setAuthToken(res.access_token);
          setAuthenticatedUser(res.user);
          localStorage.setItem("creo_auth_user", JSON.stringify(res.user));
          await refresh();
          setStatus("success");
          setTimeout(() => {
            const defaultHome = getRoleHome(res.user.role);
            const destination = getPostLoginRedirect(res.user.role, null, defaultHome);
            navigate(destination);
          }, 900);
        }
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to exchange authorization code with Google.",
        );
      }
    };

    exchangeCode();
  }, [searchParams, navigate, refresh]);

  const firstName = (authenticatedUser ?? user)?.full_name?.split(" ")[0];

  return (
    <div className="public-site auth-page min-h-[100svh]">
      <Stage3DRoot>
        <CallbackScreen status={status} step={step} errorMessage={errorMessage} firstName={firstName} />
      </Stage3DRoot>
    </div>
  );
}

const STEP_MESSAGES = ["Checking your Google account...", "Loading your profile...", "Opening your portal..."];

/** The chrome "c." turning on the hero dark while the Google handshake finishes. */
function CallbackScreen({
  status,
  step,
  errorMessage,
  firstName,
}: {
  status: "loading" | "success" | "error";
  step: number;
  errorMessage: string | null;
  firstName?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const markViewRef = useRef<HTMLDivElement>(null);
  useStageLayer({ kind: "chromeMark", drive: "progress", views: [markViewRef], section: sectionRef });

  const title =
    status === "error" ? "That didn't work." : status === "success" ? (firstName ? `Welcome, ${firstName}.` : "Welcome back.") : "Signing you in.";

  return (
    <section ref={sectionRef} className="st-tone st-hero relative flex min-h-[100svh] flex-col px-6 pb-8 pt-6 sm:px-10 lg:px-12">
      <div ref={markViewRef} className="pointer-events-none absolute inset-x-0 top-[6%] h-[44%]" />
      <header className="relative z-10">
        <AuthWordmark dot="bg-[#d2965a]" />
      </header>

      <div className="relative z-10 mx-auto mt-auto flex w-full max-w-2xl flex-col items-center pt-[40svh] text-center">
        <p className={EYEBROW}>Google sign-in</p>
        <ScrollFlipText
          key={title}
          as="h1"
          playOnMount
          text={title}
          className={`creo-display mt-5 block text-[clamp(2.75rem,7vw,6rem)] leading-[0.95] ${DISPLAY}`}
        />
        {status === "error" ? (
          <>
            <p role="alert" className="mt-6 max-w-md text-lg leading-relaxed text-site-mist">
              {errorMessage}
            </p>
            <div className="mt-8">
              <PillLink to="/login">Back to sign in</PillLink>
            </div>
          </>
        ) : (
          <output className="mt-6 flex items-center gap-3 text-lg text-site-mist">
            <Loader2 className="size-5 animate-spin text-[var(--tone-accent)]" />
            {status === "loading" ? STEP_MESSAGES[Math.min(step, 3) - 1] : "Taking you to your portal..."}
          </output>
        )}
      </div>

      <p className="relative z-10 mt-auto pt-12 text-center text-sm text-site-mist">
        Need a hand?{" "}
        <a href="https://wa.me/919941999415" target="_blank" rel="noopener noreferrer" className={TEXT_ACTION}>
          Message us on WhatsApp
        </a>
      </p>
    </section>
  );
}
