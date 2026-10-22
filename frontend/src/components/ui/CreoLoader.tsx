import { useId } from "react";

export interface CreoLoaderProps {
  /** First part of primary status text, defaults to "VERIFYING" */
  label?: string;
  /** Second highlighted part of primary status text, defaults to "SESSION" */
  highlightWord?: string;
  /** Subtitle text under progress line, defaults to "SECURE CONNECTION" */
  secondaryText?: string;
  /** If true, wraps in min-h-screen full-screen viewport with the brand radial backdrop */
  fullScreen?: boolean;
  /** Smallest size, for tables, panels and modals */
  compact?: boolean;
  /** Optional extra wrapper CSS classes */
  className?: string;
  /** Show the hairline progress line below text */
  showProgress?: boolean;
  /** Show the secondary subtitle */
  showSecondaryText?: boolean;
}

/**
 * CREO loader: the one loading animation on every page, dashboard and the apps'
 * launch.
 *
 * The amber "c." mark from the landing page's opening (the same proportions as its
 * 3D model, stage3d/models.ts createChromeMark). The arc is unmasked along its
 * length until the "c" is drawn, the dot pops in and an amber flood swells out
 * from the mark, as the landing mark floods the screen, then the arc is masked
 * away again. Pure CSS and SVG so it can render before any animation library has
 * loaded; everything stops for reduced motion.
 *
 * It always uses the brand palette (amber on obsidian or ivory), whatever the
 * surface's own tokens, so it looks the same everywhere.
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
  // One gradient per loader, laid across the whole mark (a per-shape gradient drops out on the
  // scaled dot); a shared id would break when the first copy sits in a hidden element.
  const amber = `creo-ld-amber-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const loaderContent = (
    <output
      aria-live="polite"
      className={`creo-ld ${size} creo-loader-appear flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* 1. The "c." mark */}
      <div className="creo-ld-mark" aria-hidden="true">
        <span className="creo-ld-flood" />
        <svg viewBox="-1.95 -1.8 4.3 3.6" className="creo-ld-svg" aria-hidden="true">
          <defs>
            <linearGradient
              id={amber}
              gradientUnits="userSpaceOnUse"
              x1="-1.9"
              y1="-1.8"
              x2="2.3"
              y2="1.8"
            >
              <stop offset="0" stopColor="#f0c48f" />
              <stop offset="0.55" stopColor="#dda56c" />
              <stop offset="1" stopColor="#b9783f" />
            </linearGradient>
          </defs>
          <g transform="translate(-0.15 0)">
            {/* The "c": a thick arc from 50° to 310°, opening to the right */}
            <path
              className="creo-ld-arc"
              d="M 0.852 -1.015 A 1.325 1.325 0 1 0 0.852 1.015"
              pathLength={1}
              fill="none"
              stroke={`url(#${amber})`}
              strokeWidth={0.75}
              strokeLinecap="round"
            />
            <circle className="creo-ld-dot" cx={1.95} cy={1.2} r={0.41} fill={`url(#${amber})`} />
          </g>
        </svg>
      </div>

      {/* 2. Status text */}
      {label && (
        <div
          className={`${fullScreen ? "mt-8 text-[11.5px] sm:text-[12px] tracking-[0.3em]" : compact ? "mt-4 text-[10px] tracking-[0.24em]" : "mt-7 text-[11.5px] sm:text-[12px] tracking-[0.3em]"} flex items-center justify-center font-semibold uppercase leading-none`}
        >
          <span className="creo-ld-shine">{label}</span>
          {highlightWord && <span className="ml-2 text-site-blue-light">{highlightWord}</span>}
          <span className="inline-flex items-center gap-[5px] ml-3" aria-hidden="true">
            <span className="size-[3px] rounded-full bg-site-blue creo-dot-1" />
            <span className="size-[3px] rounded-full bg-site-blue creo-dot-2" />
            <span className="size-[3px] rounded-full bg-site-blue creo-dot-3" />
          </span>
        </div>
      )}

      {/* 3. Indeterminate progress */}
      {showProgress && (
        <div
          className={`creo-ld-progress ${compact ? "creo-ld-progress--xs" : ""}`}
          aria-hidden="true"
        >
          <span />
          <span className="creo-ld-progress--late" />
        </div>
      )}

      {/* 4. Secondary text */}
      {showSecondaryText && secondaryText && !compact && (
        <div className="mt-[14px] text-[10px] font-medium uppercase tracking-[0.34em] text-site-mist opacity-75 leading-none">
          {secondaryText}
        </div>
      )}

      <style>{`
        /* Brand palette, the same on every surface */
        .creo-ld, .creo-ld-screen {
          --site-bg: #0f0e0c; --site-deep: #171513; --site-ink: #f5eee3; --site-mist: #b9ad9c;
          --site-blue: #dda56c; --site-blue-deep: #d2965a; --site-blue-light: #e0ad7a;
          --site-ice: #f5eee3; --site-sky: #4a5d82;
        }
        :root[data-theme="light"] .creo-ld, :root[data-theme="light"] .creo-ld-screen {
          --site-bg: #f5eee3; --site-deep: #efe6d8; --site-ink: #2b1e15; --site-mist: #6e5f50;
          --site-blue-light: #8a5a2b; --site-ice: #172338;
        }

        /* Hold the loader back briefly so fast loads never flash it, then fade in */
        @keyframes creoLoaderAppear {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        .creo-loader-appear { animation: creoLoaderAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }

        /* ── The "c." mark ── */
        .creo-ld-mark { position: relative; display: grid; place-items: center; }
        .creo-ld--full .creo-ld-mark { width: 132px; }
        .creo-ld--inline .creo-ld-mark { width: 92px; }
        .creo-ld--compact .creo-ld-mark { width: 52px; }
        .creo-ld-svg { position: relative; width: 100%; height: auto; overflow: visible; }

        /* The arc is unmasked along its length, holds, then masked away along it */
        .creo-ld-arc {
          /* Gaps longer than the arc and offsets just past its ends: no stray round cap */
          stroke-dasharray: 1 2; stroke-dashoffset: 1.02;
          animation: creoLdArc 2.6s infinite;
        }
        @keyframes creoLdArc {
          0% { stroke-dashoffset: 1.02; animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
          36% { stroke-dashoffset: 0; }
          70% { stroke-dashoffset: 0; animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
          100% { stroke-dashoffset: -1.02; }
        }
        .creo-ld-dot {
          transform-box: fill-box; transform-origin: center; transform: scale(0);
          animation: creoLdDot 2.6s infinite;
        }
        @keyframes creoLdDot {
          0%, 30% { transform: scale(0); animation-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1); }
          42% { transform: scale(1); }
          72% { transform: scale(1); animation-timing-function: cubic-bezier(0.7, 0, 0.84, 0); }
          84%, 100% { transform: scale(0); }
        }

        /* The flood: amber swelling out from the mark as it completes */
        .creo-ld-flood {
          position: absolute; left: 50%; top: 50%; width: 100%; aspect-ratio: 1; border-radius: 9999px;
          translate: -50% -50%; transform: scale(0.3); opacity: 0;
          background: radial-gradient(circle, rgb(221 165 108 / 0.55) 0%, rgb(210 150 90 / 0.22) 45%, transparent 70%);
          animation: creoLdFlood 2.6s infinite;
        }
        @keyframes creoLdFlood {
          0%, 32% { transform: scale(0.3); opacity: 0; animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
          40% { opacity: 1; }
          72% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        /* ── Text shimmer ── */
        .creo-ld-shine {
          background: linear-gradient(100deg, var(--site-mist) 0%, var(--site-mist) 35%, var(--site-ink) 50%, var(--site-mist) 65%, var(--site-mist) 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: creoLdShine 2.4s linear infinite;
        }

        /* ── Progress ── */
        .creo-ld-progress {
          position: relative; margin-top: 16px; width: 220px; max-width: 75vw; height: 2px;
          overflow: hidden; border-radius: 9999px; background: color-mix(in oklab, var(--site-blue) 14%, transparent);
        }
        .creo-ld-progress span {
          position: absolute; top: 0; bottom: 0; width: 38%; border-radius: 9999px;
          background: linear-gradient(90deg, transparent, var(--site-blue) 30%, var(--site-ice) 55%, var(--site-sky) 75%, transparent);
          animation: creoLdBar 1.7s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .creo-ld-progress .creo-ld-progress--late { width: 18%; opacity: 0.6; animation-delay: 0.55s; }
        .creo-ld-progress--xs { margin-top: 10px; width: 120px; }

        /* Status dots */
        @keyframes creoDotOpacity { 0%, 100% { opacity: 0.25; } 50% { opacity: 1; } }
        .creo-dot-1 { animation: creoDotOpacity 1.4s ease-in-out infinite; }
        .creo-dot-2 { animation: creoDotOpacity 1.4s ease-in-out 0.22s infinite; }
        .creo-dot-3 { animation: creoDotOpacity 1.4s ease-in-out 0.44s infinite; }

        @keyframes creoLdShine {
          from { background-position: 110% 0; }
          to { background-position: -110% 0; }
        }
        @keyframes creoLdBar {
          0% { left: -40%; }
          100% { left: 105%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .creo-loader-appear, .creo-ld-arc, .creo-ld-dot, .creo-ld-flood, .creo-ld-shine,
          .creo-ld-progress span, .creo-dot-1, .creo-dot-2, .creo-dot-3 {
            animation: none !important;
          }
          .creo-ld-arc { stroke-dashoffset: 0; }
          .creo-ld-dot { transform: none; }
          .creo-ld-progress span { left: 31%; }
        }
      `}</style>
    </output>
  );

  if (fullScreen) {
    return (
      <main
        className="creo-ld-screen min-h-screen w-full flex items-center justify-center overflow-hidden relative"
        style={{
          backgroundColor: "var(--site-bg)",
          backgroundImage:
            "radial-gradient(ellipse at 50% 42%, color-mix(in oklab, var(--site-blue-deep) 12%, transparent) 0%, transparent 55%), radial-gradient(ellipse at 50% 40%, var(--site-deep) 0%, var(--site-bg) 70%)",
        }}
      >
        {/* Faint blueprint grid fading out from the centre */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in oklab, var(--site-blue-light) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--site-blue-light) 7%, transparent) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            WebkitMaskImage: "radial-gradient(45% 45% at 50% 45%, #000, transparent)",
            maskImage: "radial-gradient(45% 45% at 50% 45%, #000, transparent)",
          }}
        />
        <div className="relative">{loaderContent}</div>
      </main>
    );
  }

  return loaderContent;
}

/** Loader for content areas (keeps the surrounding layout visible); `compact` for tables, panels and modals. */
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
    <div
      className={`flex w-full items-center justify-center ${compact ? "py-8" : "min-h-[55vh]"} ${className}`}
    >
      <CreoLoader
        label={label}
        highlightWord=""
        fullScreen={false}
        compact={compact}
        showSecondaryText={false}
      />
    </div>
  );
}

export default CreoLoader;
