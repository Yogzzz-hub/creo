import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, AlertCircle, CheckCircle } from "lucide-react";

interface VoiceFeedbackRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
  onClearRecording: () => void;
  maxDurationSeconds?: number;
}

export function VoiceFeedbackRecorder({
  onRecordingComplete,
  onClearRecording,
  maxDurationSeconds = 300, // 5 minutes max
}: VoiceFeedbackRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onClearRecording();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "",
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all audio tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());

        const mime = mediaRecorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: mime });
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);
        onRecordingComplete(recordedBlob, recordingDuration);
      };

      mediaRecorder.start(250); // Slice into 250ms chunks
      setIsRecording(true);

      const startTime = Date.now();
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= maxDurationSeconds) {
          stopRecording();
        }
      }, 1000);
    } catch (err: any) {
      console.error("Microphone error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission was denied. Please allow microphone access in your browser settings to record voice feedback.");
      } else {
        setError("Unable to access microphone. Please verify an audio input device is connected.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleReset = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackTime(0);
    setRecordingDuration(0);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onClearRecording();
  };

  const togglePlayback = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="bg-[#0B111C] border border-[#2A3446] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7FA0D6]/15 border border-[#2A3446] flex items-center justify-center text-[#7FA0D6]">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Voice Note Revision</h4>
            <p className="text-[11px] text-[#97A0B3]">Explain changes verbally to avoid typing lengthy instructions</p>
          </div>
        </div>
        {audioUrl && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Voice Note Ready ({formatTime(recordingDuration)})
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Recording State */}
      {!audioUrl && (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7FA0D6]/20 border border-[#7FA0D6]/40 text-[#BCCCE6] hover:bg-[#7FA0D6]/30 hover:text-white transition-all text-xs font-semibold cursor-pointer group"
            >
              <Mic className="w-4 h-4 text-[#7FA0D6] group-hover:scale-110 transition-transform" />
              <span>Record Voice Note</span>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full bg-[#161F2D] border border-red-500/40 rounded-xl px-4 py-2.5 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-red-400">
                  Recording... {formatTime(recordingDuration)} / {formatTime(maxDurationSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Review</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Audio Playback & Replay Review */}
      {audioUrl && (
        <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-3 flex flex-col gap-2.5">
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full bg-[#7FA0D6] text-[#0B111C] flex items-center justify-center hover:bg-white transition-colors cursor-pointer shrink-0 shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-mono text-[#97A0B3]">
                <span>{formatTime(playbackTime)}</span>
                <span>{formatTime(recordingDuration)}</span>
              </div>
              <div
                className="w-full bg-[#0B111C] h-1.5 rounded-full overflow-hidden cursor-pointer relative"
                onClick={(e) => {
                  if (!audioElementRef.current || !recordingDuration) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                  audioElementRef.current.currentTime = ratio * recordingDuration;
                  setPlaybackTime(audioElementRef.current.currentTime);
                }}
              >
                <div
                  className="bg-[#7FA0D6] h-full rounded-full transition-all"
                  style={{
                    width: `${recordingDuration > 0 ? (playbackTime / recordingDuration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              title="Delete and re-record"
              className="p-1.5 rounded-lg border border-[#2A3446] text-[#97A0B3] hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
