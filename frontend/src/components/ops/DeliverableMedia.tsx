import { useEffect, useState } from "react";
import { Film, ImageIcon, RefreshCw } from "lucide-react";

interface DeliverableMediaProps {
  url: string | null | undefined;
  isVideo: boolean;
  title: string;
  /** Show playback controls (full preview) or a muted still (thumbnail). */
  controls?: boolean;
  className?: string;
  onRefresh?: () => void;
}

/** Plays an uploaded reel or shows a poster as-is (never cropped), with a visible failure state and active retry. */
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
    return (
      <div className={`flex flex-col items-center justify-center gap-2 text-[#97A0B3] text-[11px] font-bold p-3 text-center ${className}`}>
        {isVideo ? <Film className="size-6 text-[#7FA0D6]" /> : <ImageIcon className="size-6 text-[#7FA0D6]" />}
        <span className="text-white/80">{url ? "Preview unavailable or expired" : "No file uploaded yet"}</span>
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#161F2D] hover:bg-[#2A3446] border border-[#2A3446] text-[#7FA0D6] hover:text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="size-3" /> Retry preview
          </button>
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

