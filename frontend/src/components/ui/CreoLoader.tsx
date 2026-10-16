
export interface CreoLoaderProps {
  /** First part of primary status text, defaults to "VERIFYING" */
  label?: string;
  /** Second highlighted part of primary status text, defaults to "SESSION" */
  highlightWord?: string;
  /** Subtitle text under progress line, defaults to "SECURE CONNECTION" */
  secondaryText?: string;
  /** If true, wraps in min-h-screen full-screen viewport with deep navy radial backdrop */
  fullScreen?: boolean;
  /** Optional extra wrapper CSS classes */
  className?: string;
  /** Show the hairline progress line below text */
  showProgress?: boolean;
  /** Show the secondary subtitle */
  showSecondaryText?: boolean;
}

/**
 * CREO orbit loader.
 *
 * A comet sweeps around an orbit while the brand dot breathes at the centre
 * and sends out pulse rings; a satellite circles the inner track. Full-screen
 * mode adds the bobbing "creo." wordmark. Pure CSS so it can render before any
 * animation library has loaded; everything stops for reduced motion.
 *
 * Palette: midnight #050A1A, electric blue #4F7BFF / #3B6BFF, ice #DCE8FF,
 * mist #93A0BF.
 */
export function CreoLoader({
  label = "VERIFYING",
  highlightWord = "SESSION",
  secondaryText = "SECURE CONNECTION",
  fullScreen = true,
  className = "",
  showProgress = true,
  showSecondaryText = true,
}: CreoLoaderProps) {
  const loaderContent = (
    <div
      role="status"
      aria-live="polite"
      className={`creo-loader-appear flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* 1. Orbit */}
      <div className={`creo-ld-orbit ${fullScreen ? "" : "creo-ld-orbit--sm"}`} aria-hidden="true">
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
      <div
        className={`${fullScreen ? "mt-6" : "mt-7"} flex items-center justify-center text-[11.5px] sm:text-[12px] font-semibold tracking-[0.3em] uppercase leading-none`}
      >
        <span className="creo-ld-shine">{label}</span>
        {highlightWord && <span className="ml-2 text-[#7DA2FF]">{highlightWord}</span>}
        <span className="inline-flex items-center gap-[5px] ml-3" aria-hidden="true">
          <span className="size-[3px] rounded-full bg-[#4F7BFF] creo-dot-1" />
          <span className="size-[3px] rounded-full bg-[#4F7BFF] creo-dot-2" />
          <span className="size-[3px] rounded-full bg-[#4F7BFF] creo-dot-3" />
        </span>
      </div>

      {/* 4. Indeterminate progress */}
      {showProgress && (
        <div className="creo-ld-progress" aria-hidden="true">
          <span />
          <span className="creo-ld-progress--late" />
        </div>
      )}

      {/* 5. Secondary text */}
      {showSecondaryText && secondaryText && (
        <div className="mt-[14px] text-[10px] font-medium uppercase tracking-[0.34em] text-[#93A0BF] opacity-75 leading-none">
          {secondaryText}
        </div>
      )}

      <style>{`
        /* Hold the loader back briefly so fast loads never flash it, then fade in */
        @keyframes creoLoaderAppear {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: none; }
        }
        .creo-loader-appear { animation: creoLoaderAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both; }

        /* ── Orbit ── */
        .creo-ld-orbit { position: relative; width: 132px; height: 132px; }
        .creo-ld-orbit--sm { width: 92px; height: 92px; }
        .creo-ld-orbit > span { position: absolute; border-radius: 9999px; }

        .creo-ld-halo {
          inset: -40%;
          background: radial-gradient(circle, rgba(59,107,255,0.22) 0%, rgba(59,107,255,0.06) 35%, transparent 65%);
          animation: creoLdHalo 2.4s ease-in-out infinite;
        }
        .creo-ld-ring { inset: 0; border: 1px solid rgba(79,123,255,0.2); }
        .creo-ld-track { inset: 17%; border: 1px dashed rgba(220,232,255,0.16); animation: creoLdSpin 9s linear infinite reverse; }

        /* Comet: a conic tail masked to the ring, with a bright head at the leading edge */
        .creo-ld-comet { inset: 0; animation: creoLdSpin 1.15s cubic-bezier(0.45, 0.1, 0.5, 0.9) infinite; filter: drop-shadow(0 0 6px rgba(79,123,255,0.9)); }
        .creo-ld-comet i {
          position: absolute; inset: 0; border-radius: 9999px;
          background: conic-gradient(from 0deg, transparent 0 52%, rgba(79,123,255,0.15) 62%, #4F7BFF 88%, #DCE8FF 100%);
          -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
        }
        .creo-ld-comet::after {
          content: ""; position: absolute; top: -2px; left: 50%; width: 6px; height: 6px; margin-left: -3px;
          border-radius: 9999px; background: #fff; box-shadow: 0 0 12px 4px rgba(79,123,255,0.9);
        }

        /* Satellite on the inner track */
        .creo-ld-sat { inset: 17%; animation: creoLdSpin 3.2s linear infinite; }
        .creo-ld-sat i {
          position: absolute; top: -2.5px; left: 50%; width: 5px; height: 5px; margin-left: -2.5px;
          border-radius: 9999px; background: #DCE8FF; box-shadow: 0 0 8px 2px rgba(220,232,255,0.7);
        }

        /* Pulse rings and breathing core */
        .creo-ld-ping {
          left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px;
          border: 1px solid rgba(125,162,255,0.8);
          animation: creoLdPing 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .creo-ld-ping--late { animation-delay: 1.1s; }
        .creo-ld-core {
          left: 50%; top: 50%; width: 16px; height: 16px; margin: -8px 0 0 -8px;
          background: radial-gradient(circle at 35% 30%, #A9C2FF, #4F7BFF 55%, #2F5CF0);
          box-shadow: 0 0 22px 6px rgba(79,123,255,0.6), 0 0 60px 10px rgba(59,107,255,0.25);
          animation: creoLdBreathe 2.2s ease-in-out infinite;
        }
        .creo-ld-orbit--sm .creo-ld-core { width: 12px; height: 12px; margin: -6px 0 0 -6px; }

        /* ── Wordmark ── */
        .creo-ld-word {
          margin-top: 30px; display: flex; align-items: baseline;
          font-size: 30px; font-weight: 900; letter-spacing: -0.05em; line-height: 1; color: #F4F7FF;
        }
        .creo-ld-letter { display: inline-block; animation: creoLdWave 1.8s cubic-bezier(0.45, 0, 0.55, 1) infinite; }
        .creo-ld-dot {
          width: 0.3em; height: 0.3em; margin-left: 0.04em; border-radius: 9999px;
          background: linear-gradient(135deg, #7DA2FF, #3B6BFF); box-shadow: 0 0 12px 2px rgba(79,123,255,0.7);
        }

        /* ── Text shimmer ── */
        .creo-ld-shine {
          background: linear-gradient(100deg, #93A0BF 0%, #93A0BF 35%, #F4F7FF 50%, #93A0BF 65%, #93A0BF 100%);
          background-size: 220% 100%;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: creoLdShine 2.4s linear infinite;
        }

        /* ── Progress ── */
        .creo-ld-progress {
          position: relative; margin-top: 16px; width: 220px; max-width: 75vw; height: 2px;
          overflow: hidden; border-radius: 9999px; background: rgba(79,123,255,0.14);
        }
        .creo-ld-progress span {
          position: absolute; top: 0; bottom: 0; width: 38%; border-radius: 9999px;
          background: linear-gradient(90deg, transparent, #4F7BFF 30%, #DCE8FF 55%, #7DD3FC 75%, transparent);
          animation: creoLdBar 1.7s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .creo-ld-progress .creo-ld-progress--late { width: 18%; opacity: 0.6; animation-delay: 0.55s; }

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
    </div>
  );

  if (fullScreen) {
    return (
      <main
        className="min-h-screen w-full flex items-center justify-center overflow-hidden relative"
        style={{
          backgroundColor: "#050A1A",
          backgroundImage:
            "radial-gradient(ellipse at 50% 42%, rgba(59,107,255,0.12) 0%, transparent 55%), radial-gradient(ellipse at 50% 40%, #0A1430 0%, #050A1A 70%)",
        }}
      >
        {/* Faint blueprint grid fading out from the centre */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,162,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(125,162,255,0.07) 1px, transparent 1px)",
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

/** Compact orbit loader for content areas (keeps the surrounding layout visible). */
export function CreoInlineLoader({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex min-h-[45vh] w-full items-center justify-center ${className}`}>
      <CreoLoader label={label} highlightWord="" fullScreen={false} showSecondaryText={false} />
    </div>
  );
}

export default CreoLoader;
