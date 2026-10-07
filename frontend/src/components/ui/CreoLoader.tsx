
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
 * CREO Nebula — Premium Wave Loading Screen
 *
 * Minimal, calm, professional session-verification wave loader.
 * Built with inline SVG, pure CSS keyframes, and the strict CREO Nebula palette:
 * - Void / Deep Background:  #050810
 * - Night Navy Tint:          #0B111C
 * - Inactive Steel Line:      #2A3446
 * - Mist (Secondary text):    #97A0B3
 * - Periwinkle (Main wave):   #BCCCE6
 * - Glow Blue (Pulse & glow): #7FA0D6
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
  // Main Wave 1 path definition (used for base wave, travelling light, and glow segment)
  const wave1Path = "M 20 42 C 65 16, 105 24, 140 48 C 175 72, 215 20, 260 38";
  // Secondary Wave 2 path definition (crosses wave 1 naturally)
  const wave2Path = "M 20 36 C 65 62, 105 52, 140 32 C 175 12, 215 62, 260 42";
  // Background Wave 3 path definition (subtle carrier wave)
  const wave3Path = "M 20 40 C 70 30, 110 50, 150 42 C 190 34, 230 46, 260 40";

  const loaderContent = (
    <div
      role="status"
      aria-live="polite"
      className={`creo-loader-appear flex flex-col items-center justify-center select-none -translate-y-2 ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. MAIN WAVE LOADER (SVG 280 x 80)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        {/* Soft Glow Blue radial backdrop light behind loader (3-5% opacity) */}
        <div
          className="absolute -inset-4 rounded-full pointer-events-none blur-2xl"
          style={{
            background: "radial-gradient(circle, rgba(127,160,214,0.05) 0%, rgba(11,17,28,0.0) 70%)",
          }}
        />

        <svg
          viewBox="0 0 280 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[220px] sm:w-[250px] md:w-[280px] h-[65px] sm:h-[74px] md:h-[82px] overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Soft glow filter for travelling pulse */}
            <filter id="creoPulseGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradient for Wave 3 subtle highlights */}
            <linearGradient id="creoWave3Grad" x1="20" y1="40" x2="260" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2A3446" stopOpacity="0.4" />
              <stop offset="45%" stopColor="#2A3446" stopOpacity="0.5" />
              <stop offset="55%" stopColor="#7FA0D6" stopOpacity="0.35" />
              <stop offset="65%" stopColor="#2A3446" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#2A3446" stopOpacity="0.4" />
            </linearGradient>

            {/* Linear gradient for the illuminated 50px segment */}
            <linearGradient id="creoActiveLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7FA0D6" stopOpacity="0.1" />
              <stop offset="35%" stopColor="#7FA0D6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#BCCCE6" stopOpacity="1" />
              <stop offset="65%" stopColor="#7FA0D6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7FA0D6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* ── Wave 3: Subtle Background Wave (#2A3446 with #7FA0D6 highlights) ── */}
          <path
            d={wave3Path}
            stroke="url(#creoWave3Grad)"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />

          {/* ── Wave 2: Secondary Wave (#7FA0D6, opacity ~0.55, width 1px) ── */}
          <path
            d={wave2Path}
            stroke="#7FA0D6"
            strokeOpacity="0.55"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />

          {/* ── Wave 1: Base Main Wave (dim state: #BCCCE6, opacity ~0.35, width 1.2px) ── */}
          <path
            d={wave1Path}
            stroke="#BCCCE6"
            strokeOpacity="0.35"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* ── Wave 1: Dynamic Travelling Illuminated Segment (~50px line illumination around pulse) ── */}
          <path
            d={wave1Path}
            stroke="url(#creoActiveLineGrad)"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            pathLength="100"
            strokeDasharray="22 100"
            className="creo-illuminated-stroke"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="22"
              to="-100"
              dur="2.8s"
              repeatCount="indefinite"
              keyTimes="0; 0.5; 1"
              keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              calcMode="spline"
            />
          </path>

          {/* ── Small Signal Node: Left Beginning (2.4px, #7FA0D6) ── */}
          <circle cx="20" cy="42" r="1.3" fill="#7FA0D6" opacity="0.85" />

          {/* ── Small Signal Node: Right End (2.4px, #7FA0D6 with brief end-flash) ── */}
          <circle cx="260" cy="38" r="1.4" fill="#7FA0D6" className="creo-end-node">
            <animate
              attributeName="opacity"
              values="0.4; 0.4; 0.4; 0.95; 0.4"
              keyTimes="0; 0.7; 0.85; 0.95; 1"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </circle>

          {/* ── Moving Light Pulse (4px core + periwinkle/white center + soft 12-16px glow) ── */}

        </svg>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PRIMARY STATUS TEXT: VERIFYING SESSION •••
      ───────────────────────────────────────────────────────────── */}
      <div className="mt-9 flex items-center justify-center text-[12px] sm:text-[12.5px] font-medium tracking-[0.30em] uppercase leading-none">
        <span className="text-[#BCCCE6]">{label}</span>
        {highlightWord && (
          <span className="ml-2 text-[#7FA0D6] font-medium tracking-[0.30em]">
            {highlightWord}
          </span>
        )}

        {/* Three very small sequential opacity dots (0.25 -> 1 -> 0.25) */}
        <span className="inline-flex items-center gap-[5px] ml-3" aria-hidden="true">
          <span className="size-[3px] rounded-full bg-[#7FA0D6] creo-dot-1" />
          <span className="size-[3px] rounded-full bg-[#7FA0D6] creo-dot-2" />
          <span className="size-[3px] rounded-full bg-[#7FA0D6] creo-dot-3" />
        </span>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. PROGRESS LINE: 220px hairline with moving glow gradient
      ───────────────────────────────────────────────────────────── */}
      {showProgress && (
        <div
          className="mt-[14px] w-[210px] sm:w-[220px] max-w-[75vw] h-[1px] bg-[#2A3446] relative overflow-hidden rounded-full"
          aria-hidden="true"
        >
          <div
            className="absolute top-0 bottom-0 w-[50px] creo-progress-illuminator"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, #7FA0D6 30%, #BCCCE6 50%, #7FA0D6 70%, transparent 100%)",
            }}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SECONDARY TEXT: SECURE CONNECTION (~14px below line)
      ───────────────────────────────────────────────────────────── */}
      {showSecondaryText && secondaryText && (
        <div className="mt-[14px] text-[10px] font-medium uppercase tracking-[0.34em] text-[#97A0B3] opacity-70 select-none leading-none">
          {secondaryText}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCOPED STYLES: CSS Keyframes & Reduced Motion
      ───────────────────────────────────────────────────────────── */}
      <style>{`
        /* Hold the loader back briefly so fast loads never flash it, then fade in */
        @keyframes creoLoaderAppear {
          from {
            opacity: 0;
            transform: translateY(4px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        .creo-loader-appear {
          animation: creoLoaderAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
        }

        /* Sequential dot opacity pulse (no bounce) */
        @keyframes creoDotOpacity {
          0%, 100% {
            opacity: 0.25;
          }
          50% {
            opacity: 1;
          }
        }

        .creo-dot-1 {
          animation: creoDotOpacity 1.6s ease-in-out infinite;
          animation-delay: 0s;
        }

        .creo-dot-2 {
          animation: creoDotOpacity 1.6s ease-in-out infinite;
          animation-delay: 0.28s;
        }

        .creo-dot-3 {
          animation: creoDotOpacity 1.6s ease-in-out infinite;
          animation-delay: 0.56s;
        }

        /* Progress line moving illuminated gradient */
        @keyframes creoProgressSweep {
          0% {
            transform: translateX(-55px);
          }
          100% {
            transform: translateX(225px);
          }
        }

        .creo-progress-illuminator {
          animation: creoProgressSweep 2.8s cubic-bezier(0.42, 0, 0.58, 1) infinite;
          will-change: transform;
        }

        /* Respect prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .creo-loader-appear {
            animation: none !important;
          }

          .creo-dot-1,
          .creo-dot-2,
          .creo-dot-3 {
            animation: none !important;
            opacity: 0.75 !important;
          }

          .creo-progress-illuminator {
            animation: none !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            opacity: 0.6 !important;
          }

          .creo-travelling-pulse {
            transform: translate(140px, 48px) !important;
          }

          .creo-illuminated-stroke {
            stroke-dashoffset: -39 !important;
          }

          animate,
          animateMotion {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <main
        className="min-h-screen w-full flex items-center justify-center overflow-hidden relative"
        style={{
          backgroundColor: "#050810",
          backgroundImage:
            "radial-gradient(ellipse at 50% 40%, #0B111C 0%, #050810 70%), radial-gradient(circle at 50% 45%, rgba(127,160,214,0.04) 0%, transparent 60%)",
        }}
      >
        {loaderContent}
      </main>
    );
  }

  return loaderContent;
}

/** Compact wave loader for content areas (keeps the surrounding layout visible). */
export function CreoInlineLoader({ label = "Loading", className = "" }: { label?: string; className?: string }) {
  return (
    <div className={`flex min-h-[45vh] w-full items-center justify-center ${className}`}>
      <CreoLoader label={label} highlightWord="" fullScreen={false} showSecondaryText={false} />
    </div>
  );
}

export default CreoLoader;
