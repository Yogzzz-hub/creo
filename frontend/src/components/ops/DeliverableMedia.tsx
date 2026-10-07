import { useEffect, useState } from "react";
import { Film, ImageIcon } from "lucide-react";

interface DeliverableMediaProps {
  url: string | null | undefined;
  isVideo: boolean;
  title: string;
  /** Show playback controls (full preview) or a muted still (thumbnail). */
  controls?: boolean;
  className?: string;
}

/** Plays an uploaded reel or shows a poster as-is (never cropped), with a visible failure state. */
export function DeliverableMedia({ url, isVideo, title, controls = true, className = "" }: DeliverableMediaProps) {
  const [failed, setFailed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new URL gets a fresh load attempt
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1.5 text-[#97A0B3] text-[11px] font-bold ${className}`}>
        {isVideo ? <Film className="size-5" /> : <ImageIcon className="size-5" />}
        <span>{url ? "Preview link expired — refresh" : "No file uploaded yet"}</span>
      </div>
    );
  }
  if (isVideo) {
    return (
      <video
        key={url}
        src={controls ? url : `${url}#t=0.5`}
        controls={controls}
        muted={!controls}
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className={`object-contain bg-black ${className}`}
      />
    );
  }
  return (
    <img
      key={url}
      src={url}
      alt={title}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-contain bg-black ${className}`}
    />
  );
}
