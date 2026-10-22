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
 * CREO orbit loader: the one loading animation on every page, dashboard and the
 * apps' launch.
 *
 * A comet, masked to the ring, sweeps around the orbit while the brand dot
 * breathes at the centre and sends out pulse rings, the two together reading as
 * "c."; a satellite circles the inner track. Full-screen mode adds the bobbing
 * "creo." wordmark. Pure CSS so it can render before any animation library has
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
  const loaderContent = (
    <output
      aria-live="polite"
      className={`creo-ld creo-loader-appear flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* 1. Orbit */}
      <div
        className={`creo-ld-orbit ${fullScreen ? "" : compact ? "creo-ld-orbit--xs" : "creo-ld-orbit--sm"}`}
        aria-hidden="true"
      >
        <span className="creo-ld-halo" />
        <span className="creo-ld-ring" />
        <span className="creo-ld-track" />
        <span className="creo-ld-sat">
          <i />
        </span>
        <span className="creo-ld-comet">
          <i />
        </span>
        <span className="creo-ld-ping" />
        <span className="creo-ld-ping creo-ld-ping--late" />
        <span className="creo-ld-core" />
      </div>

      {/* 2. Wordmark (full screen only) */}
      {fullScreen && (
        <div className="creo-ld-word" aria-hidden="true">
          {["c", "r", "e", "o"].map((ch, i) => (
            <span key={ch} className="creo-ld-letter" style={{ animationDelay: `${i * 0.09}s` }}>
              {ch}
            </span>
          ))}
          <span className="creo-ld-letter creo-ld-dot" style={{ animationDelay: "0.36s" }} />
        </div>
      )}

      {/* 3. Status text */}
      {label && (
        <div
          className={`${fullScreen ? "mt-6 text-[11.5px] sm:text-[12px] tracking-[0.3em]" : compact ? "mt-4 text-[10px] tracking-[0.24em]" : "mt-7 text-[11.5px] sm:text-[12px] tracking-[0.3em]"} flex items-center justify-center font-semibold uppercase leading-none`}
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

      {/* 4. Indeterminate progress */}
      {showProgress && (
        <div
          className={`creo-ld-progress ${compact ? "creo-ld-progress--xs" : ""}`}
          aria-hidden="true"
        >
          <span />
          <span className="creo-ld-progress--late" />
        </div>
      )}

      {/* 5. Secondary text */}
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
          --site-ice: #f5eee3; --site-sky: #4a5d82; --site-peri: #a9b8d4;
        }
        :root[data-theme="light"] .creo-ld, :root[data-theme="light"] .creo-ld-screen {
          --site-bg: #f5eee3; --site-deep: #efe6d8; --site-ink: #2b1e15; --site-mist: #6e5f50;
          --site-blue-light: #8a5a2b; --site-ice: #172338; --site-peri: #172338;
        }

        /* Hold the loader back briefly so fast loads never flash it, then fade in */
        @keyframes creoLoaderAppear {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        .creo-loader-appear { animation: creoLoaderAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }

        /* ── Orbit ── */
        .creo-ld-orbit { position: relative; width: 132px; height: 132px; }
        .creo-ld-orbit--sm { width: 92px; height: 92px; }
        .creo-ld-orbit--xs { width: 56px; height: 56px; }
        .creo-ld-orbit > span { position: absolute; border-radius: 9999px; }

        .creo-ld-halo {
          inset: -40%;
          background: radial-gradient(circle, color-mix(in oklab, var(--site-blue-deep) 22%, transparent) 0%, color-mix(in oklab, var(--site-blue-deep) 6%, transparent) 35%, transparent 65%);
          animation: creoLdHalo 2.4s ease-in-out infinite;
        }
        .creo-ld-ring { inset: 0; border: 1px solid color-mix(in oklab, var(--site-blue) 20%, transparent); }
        .creo-ld-track { inset: 17%; border: 1px dashed color-mix(in oklab, var(--site-ice) 16%, transparent); animation: creoLdSpin 9s linear infinite reverse; }

        /* Comet: a conic tail masked to the ring, with a bright head at the leading edge */
        .creo-ld-comet { inset: 0; animation: creoLdSpin 1.15s cubic-bezier(0.45, 0.1, 0.5, 0.9) infinite; filter: drop-shadow(0 0 6px color-mix(in oklab, var(--site-blue) 90%, transparent)); }
        .creo-ld-comet i {
          position: absolute; inset: 0; border-radius: 9999px;
          background: conic-gradient(from 0deg, transparent 0 52%, color-mix(in oklab, var(--site-blue) 15%, transparent) 62%, var(--site-blue) 88%, var(--site-ice) 100%);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
        }
        .creo-ld-comet::after {
          content: ""; position: absolute; top: -2px; left: 50%; width: 6px; height: 6px; margin-left: -3px;
          border-radius: 9999px; background: #fff; box-shadow: 0 0 12px 4px color-mix(in oklab, var(--site-blue) 90%, transparent);
        }

        /* Satellite on the inner track */
        .creo-ld-sat { inset: 17%; animation: creoLdSpin 3.2s linear infinite; }
        .creo-ld-sat i {
          position: absolute; top: -2.5px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px;
          border-radius: 9999px; background: var(--site-ice); box-shadow: 0 0 8px 2px color-mix(in oklab, var(--site-ice) 70%, transparent);
        }

        /* Pulse rings and breathing core */
        .creo-ld-ping {
          left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px;
          border: 1px solid color-mix(in oklab, var(--site-blue-light) 80%, transparent);
          animation: creoLdPing 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .creo-ld-ping--late { animation-delay: 1.1s; }
        .creo-ld-core {
          left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px;
          background: radial-gradient(circle at 35% 30%, var(--site-peri), var(--site-blue) 55%, var(--site-blue-deep));
          box-shadow: 0 0 22px 6px color-mix(in oklab, var(--site-blue) 60%, transparent), 0 0 60px 10px color-mix(in oklab, var(--site-blue-deep) 25%, transparent);
          animation: creoLdBreathe 2.2s ease-in-out infinite;
        }
        .creo-ld-orbit--sm .creo-ld-core { width: 12px; height: 12px; margin: -6px 0 0 -6px; }
        .creo-ld-orbit--xs .creo-ld-core { width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; }

        /* ── Wordmark ── */
        .creo-ld-word {
          margin-top: 30px; display: flex; align-items: baseline;
          font-size: 30px; font-weight: 900; letter-spacing: -0.05em; line-height: 1; color: var(--site-ink);
        }
        .creo-ld-letter { display: inline-block; animation: creoLdWave 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .creo-ld-dot {
          width: 0.3em; height: 0.3em; margin-left: 0.04em; border-radius: 9999px;
          background: linear-gradient(135deg, var(--site-blue-light), var(--site-blue-deep)); box-shadow: 0 0 12px 2px color-mix(in oklab, var(--site-blue) 70%, transparent);
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

        @keyframes creoLdSpin { to { transform: rotate(360deg); } }
        @keyframes creoLdPing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(5.2); opacity: 0; }
        }
        @keyframes creoLdBreathe {
          0%, 100% { transform: scale(0.86); }
          50% { transform: scale(1.12); }
        }
        @keyframes creoLdHalo {
          0%, 100% { opacity: 0.6; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes creoLdWave {
          0%, 55%, 100% { transform: translateY(0); }
          25% { transform: translateY(-7px); }
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
          .creo-loader-appear,
          .creo-ld-orbit *,
          .creo-ld-orbit > span,
          .creo-ld-letter,
          .creo-ld-shine,
          .creo-ld-progress span,
          .creo-dot-1, .creo-dot-2, .creo-dot-3 {
            animation: none !important;
          }
          .creo-ld-ping { display: none; }
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

/** Orbit loader for content areas (keeps the surrounding layout visible); `compact` for tables, panels and modals. */
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
