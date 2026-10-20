import { useEffect, useState } from "react";
import { Film, ImageIcon, RefreshCw, Play } from "lucide-react";

const FALLBACK_POSTERS = [
  "/assets/deliverables/astra_living_reel.jpg",
  "/assets/deliverables/urban_bakes_carousel.jpg",
  "/assets/portfolio/botanical_serum.jpg",
  "/assets/portfolio/mulberry_silk.jpg",
  "/assets/portfolio/pulse_mobility.jpg",
  "/assets/portfolio/scandi_living.jpg",
  "/assets/portfolio/sourdough_carousel.jpg",
  "/assets/portfolio/zenith_fitness.jpg",
];

function getFallbackPoster(text: string) {
  let hash = 0;
  for (let i = 0; i < (text || "").length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return FALLBACK_POSTERS[Math.abs(hash) % FALLBACK_POSTERS.length];
}

interface DeliverableMediaProps {
  url: string | null | undefined;
  isVideo: boolean;
  title: string;
  /** Show playback controls (full preview) or a muted still (thumbnail). */
  controls?: boolean;
  className?: string;
  onRefresh?: () => void;
}

/** Plays an uploaded reel or shows a poster as-is, with an elegant creative fallback on preview failure. */
export function DeliverableMedia({
  url,
  isVideo,
  title,
  controls = true,
  className = "",
  onRefresh,
}: DeliverableMediaProps) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useFragment, setUseFragment] = useState(true);

  // Reset error and loading states when URL changes
  useEffect(() => {
    setFailed(false);
    setLoading(true);
    setUseFragment(true);
  }, [url]);

  if (!url || failed) {
    const fallbackSrc = getFallbackPoster(title);
    return (
      <div className={`relative flex items-center justify-center bg-black overflow-hidden group ${className}`}>
        <img
          src={fallbackSrc}
          alt={title}
          className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/90">
              {isVideo ? <Film className="size-2.5 text-[#7FA0D6]" /> : <ImageIcon className="size-2.5 text-[#7FA0D6]" />}
              {isVideo ? "Video Reel" : "Creative Asset"}
            </span>
            {url && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFailed(false);
                  setLoading(true);
                  setUseFragment(false);
                  onRefresh?.();
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 hover:bg-black/90 text-[#97A0B3] hover:text-white text-[9px] font-medium transition-colors cursor-pointer"
                title="Retry loading file"
              >
                <RefreshCw className="size-2.5" />
              </button>
            )}
          </div>
        </div>
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:bg-[#7FA0D6] group-hover:text-black transition-all">
              <Play className="size-4 ml-0.5 fill-current" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const videoSrc = controls || !useFragment ? url : `${url}#t=0.5`;

  return (
    <div className={`relative flex items-center justify-center bg-black overflow-hidden ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="size-5 rounded-full border-2 border-[#7FA0D6] border-t-transparent animate-spin" />
        </div>
      )}
      {isVideo ? (
        <video
          key={videoSrc}
          src={videoSrc}
          controls={controls}
          muted={!controls}
          playsInline
          preload="metadata"
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => {
            if (useFragment && !controls) {
              setUseFragment(false);
            } else {
              setFailed(true);
              setLoading(false);
            }
          }}
          className={`object-contain bg-black ${className}`}
        />
      ) : (
        <img
          key={url}
          src={url}
          alt={title}
          loading="lazy"
          onLoad={() => setLoading(false)}
          onError={() => {
            setFailed(true);
            setLoading(false);
          }}
          className={`object-contain bg-black ${className}`}
        />
      )}
    </div>
  );
}

