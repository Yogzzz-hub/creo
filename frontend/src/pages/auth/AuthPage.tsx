import "../../styles/public-responsive.css";
import "../../styles/public-theme.css";
import { ArrowLeft, Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  AuthField,
  AuthWordmark,
  EYEBROW,
  FIELD_INPUT,
  GoogleMark,
  OUTLINE_PILL,
  SubmitPill,
  TEXT_ACTION,
} from "../../components/auth/AuthPieces";
import { PasswordRecoveryModal } from "../../components/auth/PasswordRecoveryModal";
import { EASE_OUT_EXPO } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { DISPLAY } from "../../components/public/StagePieces";
import { Stage3DRoot, useStageLayer } from "../../components/stage3d/registry";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useAuth } from "../../lib/auth-context";
import { HttpError } from "../../lib/http";

const PENDING_REGISTRATION_KEY = "creo_pending_registration";
const WHATSAPP_URL = "https://wa.me/919941999415";

interface PendingRegistration {
  email: string;
  fullName: string;
  expiresAt: number;
  emailDeliveryConfirmed: true;
}

function readPendingRegistration(): PendingRegistration | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw) as PendingRegistration;
    if (
      !pending.email ||
      pending.emailDeliveryConfirmed !== true ||
      pending.expiresAt <= Date.now()
    ) {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

function writePendingRegistration(email: string, fullName: string): void {
  sessionStorage.setItem(
    PENDING_REGISTRATION_KEY,
    JSON.stringify({
      email,
      fullName,
      expiresAt: Date.now() + 10 * 60_000,
      emailDeliveryConfirmed: true,
    } satisfies PendingRegistration),
  );
}

function clearPendingRegistration(): void {
  sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
}

/** Errors the API reports about which sign-in methods an existing account has. */
const ACCOUNT_METHOD_CODES = new Set(["PASSWORD_NOT_SET", "ACCOUNT_EXISTS"]);

interface AuthNotice {
  message: string;
  code?: string;
  email?: string;
  methods?: string[];
}

type Screen = "signin" | "signup" | "verify";

/** What the brand panel says for each screen, in the homepage's voice. */
const COPY: Record<
  Screen,
  { eyebrow: string; title: string; lead: (email: string) => string; points: string[] }
> = {
  signin: {
    eyebrow: "Client portal",
    title: "Welcome back.",
    lead: () => "Sign in to review this week's batch, approve drafts and keep your pod moving.",
    points: [
      "Every batch lands in one portal",
      "Approve in one click, or decline with a note",
      "SLA-timed delivery; late batch credited",
    ],
  },
  signup: {
    eyebrow: "New account",
    title: "Start shipping every week.",
    lead: () =>
      "Create your account, add your Brand DNA, and your first batch lands within 7 days.",
    points: [
      "A dedicated lead, editor and designer",
      "Brand DNA onboarding on day one",
      "Month-to-month, cancel anytime",
    ],
  },
  verify: {
    eyebrow: "One last step",
    title: "Check your inbox.",
    lead: (email) =>
      `We sent a 6-digit code to ${email || "your email"}. Enter it to finish creating your account.`,
    points: [],
  },
};

export function AuthPage({ defaultView = "signin" }: { defaultView?: string }) {
  return (
    <div className="public-site auth-page min-h-[100svh]">
      <Stage3DRoot>
        <AuthScreen defaultView={defaultView} />
      </Stage3DRoot>
    </div>
  );
}

function AuthScreen({ defaultView }: { defaultView: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion() ?? false;
  const {
    loginWithPassword,
    registerIntent,
    resendRegistration,
    verifyRegistration,
    getGoogleAuthUrl,
  } = useAuth();

  const brandRef = useRef<HTMLElement>(null);
  const markViewRef = useRef<HTMLDivElement>(null);
  useStageLayer({ kind: "chromeMark", drive: "progress", views: [markViewRef], section: brandRef });

  const ids = useId();
  const fieldId = (name: string) => `${ids}-${name}`;

  const [loading, setLoading] = useState(false);
  const [slowServerWake, setSlowServerWake] = useState(false);
  const [error, setErrorState] = useState<AuthNotice | null>(null);
  const setError = (message: string | null) => setErrorState(message ? { message } : null);
  function showError(err: unknown, fallback: string, forEmail?: string) {
    if (err instanceof HttpError) {
      const methods = err.details?.sign_in_methods;
      setErrorState({
        message: err.message || fallback,
        code: err.code,
        email: forEmail,
        methods: Array.isArray(methods)
          ? methods.filter((m): m is string => typeof m === "string")
          : undefined,
      });
    } else {
      setErrorState({ message: err instanceof Error && err.message ? err.message : fallback });
    }
  }
  const [showPassword, setShowPassword] = useState(false);

  const initialMode =
    location.pathname === "/signup" || defaultView === "signup" ? "signup" : "signin";
  const initialPending = initialMode === "signup" ? readPendingRegistration() : null;
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [rememberMe, setRememberMe] = useState(initialMode === "signin");

  // Controlled form state
  const queryEmail = new URLSearchParams(location.search).get("email") || "";
  const [email, setEmail] = useState(queryEmail || initialPending?.email || "");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  useEffect(() => {
    const qEmail = new URLSearchParams(location.search).get("email");
    if (qEmail) setEmail(qEmail);
  }, [location.search]);
  const [fullName, setFullName] = useState(initialPending?.fullName || "");
  const [registrationPending, setRegistrationPending] = useState(Boolean(initialPending));
  const [otpCode, setOtpCode] = useState("");

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  useEffect(() => {
    if (location.pathname === "/signup") {
      setMode("signup");
      setRememberMe(false);
    } else if (location.pathname === "/login" || location.pathname === "/signin") {
      setMode("signin");
      setRememberMe(true);
    }
  }, [location.pathname]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanName = fullName.trim();

    if (!cleanEmail || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup" && !cleanName) {
      setError("Please enter your full name.");
      return;
    }
    if (mode === "signup" && !termsAccepted) {
      setError("Please accept the Terms & Privacy Policy to create an account.");
      return;
    }

    let wakeTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      setLoading(true);
      setSlowServerWake(false);
      setError(null);
      wakeTimer = setTimeout(() => setSlowServerWake(true), 3500);
      if (mode === "signin") {
        const loggedInUser = await loginWithPassword(cleanEmail, password);
        const { getRoleHome } = await import("../../components/auth/ProtectedRoute");
        const roleHome = getRoleHome(loggedInUser.role);

        // Strict role routing: admins go to /admin, clients go to /portal
        const r = (loggedInUser.role || "").toLowerCase();
        if (r === "admin" || r === "super_admin" || r.includes("admin")) {
          navigate("/admin", { replace: true });
        } else if (r === "client" || r === "client_owner" || r.includes("client")) {
          navigate("/portal", { replace: true });
        } else {
          navigate(roleHome, { replace: true });
        }
      } else {
        const result = await registerIntent(cleanEmail, password, cleanName);
        if (result.status !== "sent" || result.email_delivered !== true) {
          throw new Error("We could not deliver the verification email. Please try again shortly.");
        }
        writePendingRegistration(cleanEmail, cleanName);
        setRegistrationPending(true);
      }
    } catch (err: any) {
      console.error(err);
      if (mode === "signup") {
        setRegistrationPending(false);
        clearPendingRegistration();
      }
      showError(err, "Authentication failed. Please verify credentials.", cleanEmail);
    } finally {
      if (wakeTimer) clearTimeout(wakeTimer);
      setLoading(false);
      setSlowServerWake(false);
    }
  }

  async function handleVerifyRegistration(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyRegistration(
        email.trim(),
        otpCode,
        password.trim() || undefined,
        fullName.trim(),
      );
      clearPendingRegistration();
      navigate("/portal", { replace: true });
    } catch (err: any) {
      setError(err.message || "The verification code is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  async function startGoogleSignIn() {
    try {
      setLoading(true);
      const url = await getGoogleAuthUrl();
      if (url) {
        window.location.href = url;
      } else {
        navigate("/auth/callback/google");
      }
    } catch {
      setLoading(false);
    }
  }

  async function handleResendRegistrationCode() {
    try {
      setLoading(true);
      setError(null);
      if (password.trim()) {
        const result = await registerIntent(email.trim(), password.trim(), fullName.trim());
        if (result.status !== "sent" || result.email_delivered !== true) {
          throw new Error("We could not deliver the verification email. Please try again shortly.");
        }
      } else {
        const result = await resendRegistration(email.trim());
        if (result.status !== "sent" || result.email_delivered !== true) {
          throw new Error("We could not deliver the verification email. Please try again shortly.");
        }
      }
      writePendingRegistration(email.trim(), fullName.trim());
      setOtpCode("");
    } catch (err: any) {
      setError(err.message || "Unable to resend the verification code.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: "signin" | "signup") {
    if (next === mode) return;
    setMode(next);
    setRememberMe(next === "signin");
    setError(null);
    navigate(next === "signin" ? "/login" : "/signup", { replace: true });
  }

  const screen: Screen = registrationPending ? "verify" : mode;
  const copy = COPY[screen];
  const lead = copy.lead(email.trim());
  const submitLabel =
    mode === "signin"
      ? loading
        ? slowServerWake
          ? "Waking up the server..."
          : "Signing in..."
        : "Sign in"
      : loading
        ? slowServerWake
          ? "Waking up the server..."
          : "Creating your account..."
        : "Create account";

  const headline = (className: string) => (
    <ScrollFlipText
      key={copy.title}
      as="h1"
      playOnMount
      delay={0.1}
      text={copy.title}
      className={`creo-display block text-[clamp(2.75rem,5.4vw,5.5rem)] leading-[0.95] ${DISPLAY} ${className}`}
    />
  );

  // Theme and way out: in the brand band on phones, above the form on desktop
  const controls = (
    <div className="flex items-center gap-2.5">
      <ThemeToggle variant="site" />
      <Link
        to="/"
        className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-hi/15 px-4 text-sm font-semibold text-site-ink transition-colors hover:border-[var(--tone-accent)]"
      >
        <ArrowLeft className="size-4" />
        Back to site
      </Link>
    </div>
  );

  return (
    <div className="grid min-h-[100svh] lg:grid-cols-2">
      {/* Brand panel — the chrome "c." turning on amber, with the headline for each step */}
      <section
        ref={brandRef}
        className="st-tone st-brand relative flex h-[26svh] min-h-[200px] flex-col overflow-hidden px-6 pt-5 sm:px-10 lg:sticky lg:top-0 lg:h-[100svh] lg:px-12 lg:pb-12 lg:pt-8"
      >
        <div
          ref={markViewRef}
          className="pointer-events-none absolute inset-0 top-10 lg:bottom-[47%] lg:top-[5%]"
        />
        <header className="relative z-10 flex items-center justify-between gap-3">
          <AuthWordmark />
          <div className="lg:hidden">{controls}</div>
        </header>
        <div className="relative z-10 mt-auto hidden lg:block">
          <p className={EYEBROW}>{copy.eyebrow}</p>
          {headline("mt-5 max-w-[12ch]")}
          <motion.p
            key={lead}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: EASE_OUT_EXPO }}
            className="mt-6 max-w-md text-lg leading-relaxed text-site-mist"
          >
            {lead}
          </motion.p>
          {copy.points.length > 0 && (
            <ul className="mt-8 grid gap-2.5 border-t border-hi/15 pt-6 [@media(max-height:760px)]:hidden">
              {copy.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-base font-medium text-site-ink"
                >
                  <Check className="mt-1 size-4 shrink-0" strokeWidth={3} />
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Form panel */}
      <section className="st-tone st-base relative flex flex-col px-6 pb-8 pt-6 sm:px-10 lg:px-16 lg:pt-8">
        <div className="hidden justify-end lg:flex">{controls}</div>

        <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center pb-10 pt-4 lg:py-16">
          {/* Phones get the headline here, under the brand band */}
          <div className="mb-9 lg:hidden">
            <p className={EYEBROW}>{copy.eyebrow}</p>
            {headline("mt-4 text-[clamp(2.6rem,11vw,3.5rem)]")}
            <p className="mt-4 text-base leading-relaxed text-site-mist">{lead}</p>
          </div>

          {/* Sign in / create account; hidden while verifying so the code step stays focused */}
          {!registrationPending && (
            <div className="mb-10 flex w-full rounded-full border-2 border-hi/15 p-1">
              {(["signin", "signup"] as const).map((option) => {
                const active = mode === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    onClick={() => switchMode(option)}
                    className={`relative flex-1 cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                      active ? "text-[var(--tone-bg)]" : "text-site-mist hover:text-site-ink"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="auth-mode-pill"
                        transition={
                          reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }
                        }
                        className="absolute inset-0 rounded-full bg-site-ink"
                      />
                    )}
                    <span className="relative">
                      {option === "signin" ? "Sign in" : "Create account"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Account-method notice: the email exists, but not with the method just tried */}
          {error?.code && ACCOUNT_METHOD_CODES.has(error.code)
            ? (() => {
                const methods = error.methods ?? [];
                const hasGoogle = methods.includes("google");
                const hasPassword = methods.includes("password");
                const who = error.email || email.trim() || "This email";
                const title =
                  error.code === "ACCOUNT_EXISTS"
                    ? "You already have a Creo account"
                    : hasGoogle
                      ? "This account uses Google sign-in"
                      : "No password set yet";
                const body =
                  error.code === "ACCOUNT_EXISTS"
                    ? hasPassword
                      ? `${who} is already registered. Sign in instead${hasGoogle ? ", or continue with Google" : ""}.`
                      : `${who} is already registered${hasGoogle ? " with Google" : ""}. ${hasGoogle ? "Continue with Google, or set" : "Set"} a password to sign in with your email.`
                    : hasGoogle
                      ? `${who} was created with Google, so it doesn't have a Creo password yet. Continue with Google, or set a password to use either method.`
                      : `${who} doesn't have a password yet. Verify your email to set one.`;
                return (
                  <div
                    role="alert"
                    className="mb-8 rounded-[1.75rem] border-2 border-[var(--tone-accent)] p-5"
                  >
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#d2965a] text-[var(--on-brand)]">
                        {hasGoogle && !hasPassword ? (
                          <GoogleMark size={16} />
                        ) : (
                          <KeyRound className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-site-ink">{title}</p>
                        <p className="mt-1 break-words text-sm leading-relaxed text-site-mist">
                          {body}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      {hasGoogle && (
                        <button
                          type="button"
                          onClick={startGoogleSignIn}
                          disabled={loading}
                          className={OUTLINE_PILL}
                        >
                          <GoogleMark size={16} /> Continue with Google
                        </button>
                      )}
                      {error.code === "ACCOUNT_EXISTS" && hasPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("signin");
                            setRememberMe(true);
                            setError(null);
                            navigate(
                              `/login?email=${encodeURIComponent(error.email || email.trim())}`,
                              { replace: true },
                            );
                          }}
                          className={OUTLINE_PILL}
                        >
                          Sign in instead
                        </button>
                      )}
                      {!hasPassword && (
                        <button
                          type="button"
                          onClick={() => setForgotOpen(true)}
                          className={OUTLINE_PILL}
                        >
                          Set a password
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            : error && (
                <div
                  role="alert"
                  className="mb-8 rounded-2xl border border-site-rose/40 bg-site-rose/10 px-5 py-4 text-sm font-medium leading-relaxed text-site-ink"
                >
                  {error.message}
                  {error.code === "INVALID_CREDENTIALS" && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className={TEXT_ACTION}
                      >
                        Reset your password
                      </button>
                    </>
                  )}
                </div>
              )}

          {registrationPending ? (
            <form onSubmit={handleVerifyRegistration} className="space-y-8">
              <AuthField id={fieldId("otp")} label="Verification code">
                <input
                  id={fieldId("otp")}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className={`${FIELD_INPUT} text-center font-mono text-4xl! tracking-[0.45em]`}
                  autoFocus
                  required
                />
              </AuthField>

              <SubmitPill loading={loading} disabled={otpCode.length !== 6}>
                {loading ? "Verifying..." : "Verify and continue"}
              </SubmitPill>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setRegistrationPending(false);
                    setOtpCode("");
                    setError(null);
                    clearPendingRegistration();
                  }}
                  className="cursor-pointer font-semibold text-site-mist transition-colors hover:text-site-ink disabled:opacity-50"
                >
                  Change details
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResendRegistrationCode}
                  className={TEXT_ACTION}
                >
                  Resend code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              {mode === "signup" && (
                <>
                  <AuthField id={fieldId("name")} label="Full name">
                    <input
                      id={fieldId("name")}
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      className={FIELD_INPUT}
                      required
                    />
                  </AuthField>
                  <AuthField
                    id={fieldId("brand")}
                    label="Brand name"
                    hint={<span className="text-xs text-site-mist">Optional</span>}
                  >
                    <input
                      id={fieldId("brand")}
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your brand"
                      autoComplete="organization"
                      className={FIELD_INPUT}
                    />
                  </AuthField>
                </>
              )}

              <AuthField id={fieldId("email")} label="Work email">
                <input
                  id={fieldId("email")}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error?.email) setErrorState(null);
                  }}
                  placeholder="name@brand.com"
                  autoComplete="email"
                  className={FIELD_INPUT}
                  required
                />
              </AuthField>

              <AuthField
                id={fieldId("password")}
                label={mode === "signin" ? "Password" : "Create password"}
                hint={
                  mode === "signin" ? (
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className={`text-sm ${TEXT_ACTION}`}
                    >
                      Forgot password?
                    </button>
                  ) : (
                    <span className="text-xs text-site-mist">8+ characters</span>
                  )
                }
              >
                <input
                  id={fieldId("password")}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signin" ? "••••••••" : "Choose a password"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className={FIELD_INPUT}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-site-mist transition-colors hover:text-site-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </AuthField>

              <label className="flex w-fit cursor-pointer select-none items-center gap-3 text-sm font-medium text-site-mist transition-colors hover:text-site-ink">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={mode === "signup" ? termsAccepted : rememberMe}
                  onChange={(e) =>
                    mode === "signup"
                      ? setTermsAccepted(e.target.checked)
                      : setRememberMe(e.target.checked)
                  }
                />
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md border-2 border-hi/25 text-[var(--on-brand)] transition-colors peer-checked:border-[#d2965a] peer-checked:bg-[#d2965a] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--site-blue)] [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                  <Check className="size-3.5" strokeWidth={3.5} />
                </span>
                {mode === "signup" ? (
                  <span>
                    I accept the{" "}
                    <Link
                      to="/terms"
                      className="text-site-ink underline decoration-hi/30 underline-offset-4 hover:decoration-current"
                    >
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      className="text-site-ink underline decoration-hi/30 underline-offset-4 hover:decoration-current"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                ) : (
                  "Keep me signed in"
                )}
              </label>

              <div className="pt-1">
                <SubmitPill loading={loading}>{submitLabel}</SubmitPill>
                {loading && slowServerWake && (
                  <output className="mt-3 block text-center text-sm text-site-mist">
                    The server was asleep after a quiet spell. Waking it up can take about 30
                    seconds.
                  </output>
                )}
              </div>
            </form>
          )}

          {!registrationPending && (
            <>
              <div className={`my-7 flex items-center gap-4 ${EYEBROW}`}>
                <span className="h-px flex-1 bg-hi/10" />
                or
                <span className="h-px flex-1 bg-hi/10" />
              </div>
              <button
                type="button"
                onClick={startGoogleSignIn}
                disabled={loading}
                className={OUTLINE_PILL}
              >
                <GoogleMark />
                Continue with Google
              </button>
            </>
          )}
        </div>

        <p className="mx-auto w-full max-w-[440px] text-center text-sm text-site-mist">
          Need a hand?{" "}
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={TEXT_ACTION}>
            Message us on WhatsApp
          </a>
        </p>
      </section>

      {forgotOpen && (
        <PasswordRecoveryModal initialEmail={email} onClose={() => setForgotOpen(false)} />
      )}
    </div>
  );
}
