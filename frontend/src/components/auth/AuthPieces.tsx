import { ArrowRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

/** Google's four-colour "G" for the Continue with Google buttons. */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** "creo." in the section's ink; the dot takes the ink too unless given a colour (amber on dark). */
export function AuthWordmark({ dot = "bg-current" }: { dot?: string }) {
  return (
    <Link
      to="/"
      aria-label="Creo home"
      className="group flex items-baseline text-[1.6rem] font-black tracking-[-0.04em] text-site-ink"
    >
      creo
      <span
        className={`ml-[1px] inline-block size-[0.36em] rounded-full transition-transform duration-500 group-hover:-translate-y-1.5 ${dot}`}
      />
    </Link>
  );
}

/** Small uppercase label used above fields and as section eyebrows, as on the 3D pages. */
export const EYEBROW = "text-xs font-bold uppercase tracking-[0.18em] text-site-mist";

/** Bare input that sits on an AuthField's ruled line. */
export const FIELD_INPUT =
  "w-full min-w-0 bg-transparent py-3 text-xl font-medium tracking-[-0.02em] text-site-ink placeholder:text-site-mist/45 focus:outline-none";

/** Label above a ruled line that turns the section accent while its input has focus. */
export function AuthField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className={EYEBROW}>
          {label}
        </label>
        {hint}
      </div>
      <div className="mt-1 flex items-center gap-3 border-b-2 border-hi/15 transition-colors duration-300 focus-within:border-[var(--tone-accent)]">
        {children}
      </div>
    </div>
  );
}

/** The site's pill CTA as a form button: ink pill, section-colour label, amber arrow disc. */
export function SubmitPill({
  children,
  loading = false,
  disabled = false,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-full bg-site-ink py-2 pl-7 pr-2 text-left text-base font-semibold text-[var(--tone-bg,var(--site-bg))] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>{children}</span>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#d2965a] text-[var(--on-brand)] transition-transform duration-300 group-enabled:group-hover:translate-x-1">
        {loading ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />}
      </span>
    </button>
  );
}

/** Outlined pill for second choices (Google, start over, cancel). */
export const OUTLINE_PILL =
  "flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-full border-2 border-hi/15 px-5 py-2.5 text-base font-semibold text-site-ink transition-colors duration-300 hover:border-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50";

/** Underlined text action in the section accent. */
export const TEXT_ACTION =
  "cursor-pointer font-semibold text-[var(--tone-accent)] underline decoration-current/30 underline-offset-4 transition-colors hover:decoration-current disabled:cursor-not-allowed disabled:opacity-50";
