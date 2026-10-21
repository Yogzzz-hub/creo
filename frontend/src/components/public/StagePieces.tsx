import { motion } from "motion/react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Link } from "react-router";
import { request } from "../../lib/http";
import { EASE_OUT_EXPO } from "../motion";
import { ScrollFlipText } from "../motion/ScrollFlipText";
import { useStageLayer } from "../stage3d/registry";

/** Superlist-style display type: big, medium weight, tight. */
export const DISPLAY = "font-medium tracking-[-0.05em] text-site-ink";

/**
 * Pill in the section's ink colour with the section colour as its text (cream
 * on charcoal sections, charcoal on cream, and so on), plus an orange arrow disc.
 */
export function PillLink({ to, href, children }: { to?: string; href?: string; children: ReactNode }) {
  const className =
    "group inline-flex items-center gap-4 rounded-full bg-site-ink py-2 pl-6 pr-2 text-sm font-semibold text-[var(--tone-bg,var(--site-bg))]";
  const inner = (
    <>
      {children}
      <span className="flex size-9 items-center justify-center rounded-full bg-[#d2965a] text-[var(--on-brand)] transition-transform duration-300 group-hover:translate-x-1">
        <ArrowRight className="size-4" />
      </span>
    </>
  );
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  return (
    <Link to={to ?? "/"} className={className}>
      {inner}
    </Link>
  );
}

/**
 * Closing section on every 3D page: the free-sample form in one pill with a
 * big 3D button, and the portal on a laptop rising out of the footer (a phone
 * on narrow screens).
 */
export function SampleCta({
  title = "Try us before you pay us.",
  lead = "Drop your Instagram handle and email. We'll send a custom sample batch of reels and carousels for your brand, completely free. No credit card required.",
}: {
  title?: string;
  lead?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const pressedRef = useRef(false);
  useStageLayer({ kind: "button", views: [buttonRef], section: sectionRef, pressed: pressedRef });
  useStageLayer({ kind: "device", views: [deviceRef], section: sectionRef });

  const [email, setEmail] = useState("");
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }
    if (!handle.trim()) {
      setError("Please enter your Instagram handle.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await request("/api/v1/public/sample", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), instagram_handle: handle.trim() }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit sample request.");
    } finally {
      setSubmitting(false);
    }
  };

  const press = (down: boolean) => () => {
    pressedRef.current = down;
  };

  return (
    <section ref={sectionRef} className="st-tone st-brand relative overflow-hidden px-6 pt-28 sm:px-8 lg:px-12 lg:pt-36">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <ScrollFlipText as="h2" text={title} className={`block text-[clamp(3rem,7.5vw,7rem)] leading-[0.95] ${DISPLAY}`} />
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-site-mist">{lead}</p>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="mx-auto mt-10 inline-flex items-center gap-3 rounded-full bg-site-ink px-6 py-3 text-base font-semibold text-[#f5eee3]"
          >
            <Check className="size-5 stroke-[3] text-[#d2965a]" />
            Super, we'll be in touch within 48 hours.
          </motion.div>
        ) : (
          <form onSubmit={submit} noValidate className="mx-auto mt-10 max-w-2xl">
            <div className="flex flex-col gap-2 rounded-[2rem] border-2 border-site-ink/80 p-3 transition-shadow focus-within:shadow-[0_0_0_4px_rgb(28_28_28/0.2)] sm:flex-row sm:items-center sm:rounded-full sm:p-2 sm:pl-5">
              <label className="flex-1">
                <span className="sr-only">Instagram handle</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@yourbrand"
                  autoComplete="off"
                  required
                  className="w-full bg-transparent px-3 py-3 text-lg font-medium text-site-ink placeholder:text-site-mist focus:outline-none"
                />
              </label>
              <span aria-hidden="true" className="mx-3 h-px bg-site-ink/30 sm:mx-0 sm:h-8 sm:w-px" />
              <label className="flex-1">
                <span className="sr-only">Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@brand.com"
                  autoComplete="email"
                  required
                  className="w-full bg-transparent px-3 py-3 text-lg font-medium text-site-ink placeholder:text-site-mist focus:outline-none"
                />
              </label>
              <button
                ref={buttonRef}
                type="submit"
                disabled={submitting}
                aria-label="Send my free sample"
                onPointerDown={press(true)}
                onPointerUp={press(false)}
                onPointerLeave={press(false)}
                onPointerCancel={press(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") pressedRef.current = true;
                }}
                onKeyUp={press(false)}
                onBlur={press(false)}
                className="st-big-button relative mx-auto flex size-20 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#1a120c] disabled:cursor-wait sm:mx-0"
              >
                {submitting ? <Loader2 className="size-6 animate-spin" /> : <ArrowRight className="st-big-button-icon size-6 transition-opacity" />}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-4 text-sm font-semibold text-site-ink">
                {error}
              </p>
            )}
            <p className="mt-5 text-sm font-medium text-site-ink">Definitely don't press this big button.</p>
          </form>
        )}
      </div>
      <div ref={deviceRef} className="pointer-events-none relative mx-auto mt-12 h-[42svh] w-full max-w-[1200px] sm:h-[54svh]" />
    </section>
  );
}
