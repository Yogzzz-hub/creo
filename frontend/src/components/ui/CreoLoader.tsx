export interface CreoLoaderProps {
  /** First part of primary status text, defaults to "VERIFYING" */
  label?: string;
  /** Second highlighted part of primary status text, defaults to "SESSION" */
  highlightWord?: string;
  /** Subtitle text under progress line, defaults to "SECURE CONNECTION" */
  secondaryText?: string;
  /** If true, fills the screen on the brand backdrop */
  fullScreen?: boolean;
  /** Smallest size, for tables, panels and cards */
  compact?: boolean;
  /** Optional extra wrapper CSS classes */
  className?: string;
  /** Show the hairline progress line below text */
  showProgress?: boolean;
  /** Show the secondary subtitle */
  showSecondaryText?: boolean;
}

const LETTERS = ["c", "r", "e", "o"];

/**
 * CREO loader: the one loading animation used on every page and dashboard.
 *
 * The brand intro's wordmark, on a loop: each letter of "creo" rises out of its
 * mask, holds, then slips away upward while the amber dot pops in and out. Pure
 * CSS so it can render before any animation library has loaded, and in the brand
 * palette (obsidian / ivory, amber) on every surface so it always looks the same.
 * Everything stops for reduced motion.
 */
export function CreoLoader({
  label = "VERIFYING",
  highlightWord = "SESSION",
  secondaryText = "SECURE CONNECTION",
  fullScreen = true,
  compact = false,
  className = "",
  showProgress = true,
  showSecondaryText = true,
}: CreoLoaderProps) {
  const size = fullScreen ? "creo-ld--full" : compact ? "creo-ld--compact" : "creo-ld--inline";
  const loaderContent = (
    <output
      aria-live="polite"
      className={`creo-ld ${size} creo-loader-appear flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* 1. Wordmark rising out of its mask */}
      <div className="creo-ld-word" aria-hidden="true">
        {LETTERS.map((ch, i) => (
          <span key={ch} className="creo-ld-mask">
            <span className="creo-ld-letter" style={{ animationDelay: `${i * 0.07}s` }}>
              {ch}
            </span>
          </span>
        ))}
        <span className="creo-ld-dot" />
      </div>

      {/* 2. Status text */}
      {label && (
        <div className="creo-ld-label">
          <span className="creo-ld-shine">{label}</span>
          {highlightWord && <span className="creo-ld-highlight">{highlightWord}</span>}
        </div>
      )}

      {/* 3. Indeterminate progress */}
      {showProgress && (
        <div className="creo-ld-progress" aria-hidden="true">
          <span />
        </div>
      )}

      {/* 4. Secondary text */}
      {fullScreen && showSecondaryText && secondaryText && <div className="creo-ld-secondary">{secondaryText}</div>}

      <style>{`
        /* Brand palette, the same on the website and every dashboard */
        .creo-ld {
          --ld-ink: #f5eee3; --ld-mist: #b9ad9c; --ld-amber: #dda56c; --ld-amber-deep: #d2965a; --ld-amber-light: #e0ad7a;
          --ld-track: rgb(221 165 108 / 0.16);
        }
        :root[data-theme="light"] .creo-ld {
          --ld-ink: #2b1e15; --ld-mist: #6e5f50; --ld-amber-light: #8a5a2b; --ld-track: rgb(210 150 90 / 0.22);
        }

        /* Hold the loader back briefly so fast loads never flash it, then fade in */
        @keyframes creoLoaderAppear {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        .creo-loader-appear { animation: creoLoaderAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }

        /* ── Wordmark ── */
        .creo-ld-word {
          display: flex; align-items: baseline; color: var(--ld-ink);
          font-weight: 900; letter-spacing: -0.06em; line-height: 1;
        }
        .creo-ld--full .creo-ld-word { font-size: clamp(64px, 19vw, 132px); }
        .creo-ld--inline .creo-ld-word { font-size: 46px; }
        .creo-ld--compact .creo-ld-word { font-size: 28px; }
        .creo-ld-mask { display: inline-block; overflow: hidden; padding-bottom: 0.08em; }
        .creo-ld-letter {
          display: inline-block; transform: translateY(115%);
          animation: creoLdRise 2.6s infinite;
        }
        .creo-ld-dot {
          display: inline-block; width: 0.2em; height: 0.2em; margin-left: 0.03em; border-radius: 9999px;
          background: linear-gradient(135deg, var(--ld-amber-light), var(--ld-amber-deep));
          box-shadow: 0 0 0.3em 0.06em rgb(210 150 90 / 0.55);
          transform: scale(0); animation: creoLdDot 2.6s infinite;
        }

        /* Rise out of the mask, hold, slip away upward */
        @keyframes creoLdRise {
          0% { transform: translateY(115%); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
          26% { transform: translateY(0); }
          72% { transform: translateY(0); animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0); }
          90%, 100% { transform: translateY(-115%); }
        }
        @keyframes creoLdDot {
          0%, 18% { transform: scale(0); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
          32% { transform: scale(1); }
          74% { transform: scale(1); animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0); }
          86%, 100% { transform: scale(0); }
        }

        /* ── Text ── */
        .creo-ld-label {
          display: flex; align-items: center; gap: 0.5em; margin-top: 22px;
          font-size: 11.5px; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; line-height: 1;
        }
        .creo-ld--compact .creo-ld-label { margin-top: 12px; font-size: 10px; letter-spacing: 0.24em; }
        .creo-ld-shine {
          background: linear-gradient(100deg, var(--ld-mist) 0%, var(--ld-mist) 35%, var(--ld-ink) 50%, var(--ld-mist) 65%, var(--ld-mist) 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: creoLdShine 2.4s linear infinite;
        }
        .creo-ld-highlight { color: var(--ld-amber); }
        .creo-ld-secondary {
          margin-top: 14px; font-size: 10px; font-weight: 500; letter-spacing: 0.34em; text-transform: uppercase;
          line-height: 1; color: var(--ld-mist); opacity: 0.75;
        }

        /* ── Progress ── */
        .creo-ld-progress {
          position: relative; margin-top: 16px; width: 220px; max-width: 70vw; height: 1px;
          overflow: hidden; border-radius: 9999px; background: var(--ld-track);
        }
        .creo-ld--compact .creo-ld-progress { margin-top: 10px; width: 120px; }
        .creo-ld-progress span {
          position: absolute; top: 0; bottom: 0; width: 40%; border-radius: 9999px;
          background: linear-gradient(90deg, transparent, var(--ld-amber-deep) 30%, var(--ld-ink) 60%, transparent);
          animation: creoLdBar 1.7s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }

        @keyframes creoLdShine {
          from { background-position: 110% 0; }
          to { background-position: -110% 0; }
        }
        @keyframes creoLdBar {
          0% { left: -40%; }
          100% { left: 105%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .creo-loader-appear, .creo-ld-letter, .creo-ld-dot, .creo-ld-shine, .creo-ld-progress span { animation: none !important; }
          .creo-ld-letter, .creo-ld-dot { transform: none; }
          .creo-ld-progress span { left: 30%; }
        }
      `}</style>
    </output>
  );

  if (fullScreen) {
    return (
      <main className="creo-ld-screen min-h-screen w-full flex items-center justify-center overflow-hidden relative">
        {/* The intro's backdrop: a warm glow and a faint grid fading out from the centre */}
        <div aria-hidden="true" className="creo-ld-grid pointer-events-none absolute inset-0" />
        <div className="relative">{loaderContent}</div>
        <style>{`
          .creo-ld-screen {
            background-color: #0f0e0c;
            background-image: radial-gradient(ellipse at 50% 46%, rgb(210 150 90 / 0.14) 0%, transparent 55%);
          }
          :root[data-theme="light"] .creo-ld-screen {
            background-color: #f5eee3;
            background-image: radial-gradient(ellipse at 50% 46%, rgb(210 150 90 / 0.18) 0%, transparent 55%);
          }
          .creo-ld-grid {
            background-image: linear-gradient(rgb(224 173 122 / 0.06) 1px, transparent 1px), linear-gradient(90deg, rgb(224 173 122 / 0.06) 1px, transparent 1px);
            background-size: 56px 56px;
            -webkit-mask-image: radial-gradient(45% 45% at 50% 46%, #000, transparent);
            mask-image: radial-gradient(45% 45% at 50% 46%, #000, transparent);
          }
        `}</style>
      </main>
    );
  }

  return loaderContent;
}

/** Inline loader for content areas (keeps the surrounding layout visible); `compact` for tables, panels and cards. */
export function CreoInlineLoader({
  label = "Loading",
  className = "",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex w-full items-center justify-center ${compact ? "py-8" : "min-h-[55vh]"} ${className}`}>
      <CreoLoader label={label} highlightWord="" fullScreen={false} compact={compact} showSecondaryText={false} />
    </div>
  );
}

export default CreoLoader;
