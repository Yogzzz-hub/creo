import { useState, useRef } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface VoicePlayerProps {
  audioUrl: string;
  durationSeconds?: number | null;
  authorName?: string;
}

export function VoicePlayer({ audioUrl, durationSeconds, authorName }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRateChange = () => {
    if (!audioRef.current) return;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const totalDuration = durationSeconds || (audioRef.current?.duration ? Math.floor(audioRef.current.duration) : 0);

  return (
    <div className="bg-[#121927] border border-app-line rounded-xl p-3 flex flex-col gap-2 shadow-inner">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center justify-between text-[11px] text-app-mist">
        <span className="flex items-center gap-1.5 font-semibold text-hi">
          <Volume2 className="w-3.5 h-3.5 text-app-accent" />
          {authorName ? `${authorName}'s Voice Note` : "Voice Feedback Recording"}
        </span>
        <button
          type="button"
          onClick={handleRateChange}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1B2537] text-app-accent-soft border border-app-line hover:text-hi transition-colors cursor-pointer"
        >
          {playbackRate}x
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-app-accent text-app-base flex items-center justify-center hover:bg-hi transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-[10px] font-mono text-app-mist">
            <span>{formatTime(currentTime)}</span>
            <span>{totalDuration > 0 ? formatTime(totalDuration) : "--:--"}</span>
          </div>
          <div
            className="w-full bg-app-base h-1.5 rounded-full overflow-hidden cursor-pointer relative"
            onClick={(e) => {
              if (!audioRef.current) return;
              const dur = audioRef.current.duration || totalDuration;
              if (!dur) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              audioRef.current.currentTime = ratio * dur;
              setCurrentTime(audioRef.current.currentTime);
            }}
          >
            <div
              className="bg-app-accent h-full rounded-full transition-all"
              style={{
                width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
