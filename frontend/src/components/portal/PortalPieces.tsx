import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { ScrollFlipText } from "../motion/ScrollFlipText";

/** Small uppercase label, as above every section on the public site. */
export const PORTAL_EYEBROW = "text-xs font-bold uppercase tracking-[0.18em] text-app-mist";

/** The portal's card: soft corners, a quiet fill and a hairline edge. */
export const PORTAL_PANEL = "rounded-[1.75rem] border border-app-line/60 bg-app-surface p-5 sm:p-7";

/** Panel heading: medium weight, tight, like the site's h3s. */
export const PANEL_TITLE = "text-xl font-medium tracking-[-0.02em] text-hi sm:text-2xl";

/**
 * Page opener in the homepage's voice: eyebrow, a big flip-in headline and a
 * line of context, with the page's main actions on the right.
 */
export function PortalPageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-6 border-b border-app-line/60 pb-8 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className={PORTAL_EYEBROW}>{eyebrow}</p>}
        <ScrollFlipText
          key={title}
          as="h1"
          playOnMount
          text={title}
          className="portal-display mt-3 block text-[clamp(2.4rem,4.6vw,4.25rem)] font-medium leading-[0.95] text-hi"
        />
        {lead && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-app-mist sm:text-lg">
            {lead}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

const PILL_PRIMARY =
  "group inline-flex min-h-11 items-center gap-3 rounded-full bg-app-ink py-1.5 pl-5 pr-1.5 text-sm font-semibold text-app-base transition-opacity disabled:cursor-not-allowed disabled:opacity-60";
const PILL_OUTLINE =
  "inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-app-line px-5 text-sm font-semibold text-hi transition-colors hover:border-app-accent disabled:cursor-not-allowed disabled:opacity-60";

function Disc() {
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-[var(--portal-amber)] text-[var(--portal-on-amber)] transition-transform duration-300 group-hover:translate-x-0.5">
      <ArrowRight className="size-4" />
    </span>
  );
}

/**
 * The site's pill CTA for the portal. "primary" is the ink pill with the amber
 * arrow disc; "outline" is the quiet second choice.
 */
export function PortalPill({
  to,
  onClick,
  variant = "primary",
  icon,
  disabled,
  children,
}: {
  to?: string;
  onClick?: () => void;
  variant?: "primary" | "outline";
  icon?: ReactNode;
  disabled?: boolean;
  children: ReactNode;
}) {
  const className = variant === "primary" ? PILL_PRIMARY : PILL_OUTLINE;
  const inner = (
    <>
      {variant === "outline" && icon}
      <span>{children}</span>
      {variant === "primary" && <Disc />}
    </>
  );
  if (to)
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  );
}
