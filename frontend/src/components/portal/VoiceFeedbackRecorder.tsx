import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, AlertCircle, CheckCircle, Upload, Trash2, RotateCcw, FileAudio } from "lucide-react";

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
  const [audioFileName, setAudioFileName] = useState<string | null>(null);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const startedAtRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const recorder = mediaRecorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        if (recorder.state !== "inactive") recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    if (requesting || isRecording) return;
    setRequesting(true);
    setError(null);
    audioChunksRef.current = [];
    setRecordingDuration(0);
    setAudioFileName(null);
    setIsUploaded(false);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onClearRecording();

    let stream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setError("Voice recording is unavailable in this browser. You can upload an audio file below or enter written feedback.");
        return;
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
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
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        if (!mountedRef.current) return;
        const duration = Math.min(maxDurationSeconds, Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        setRecordingDuration(duration);

        const mime = mediaRecorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: mime });
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);
        setIsUploaded(false);
        setAudioFileName(null);
        onRecordingComplete(recordedBlob, duration);
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      const startTime = Date.now();
      startedAtRef.current = startTime;
      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingDuration(elapsed);
        if (elapsed >= maxDurationSeconds) {
          stopRecording();
        }
      }, 1000);
    } catch (err: unknown) {
      stream?.getTracks().forEach((track) => track.stop());
      if (!mountedRef.current) return;
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
        setError("Microphone permission was denied. You can upload a pre-recorded audio file or allow microphone access in browser settings.");
      } else {
        setError("Unable to access microphone. You can upload an audio file or verify an audio input device is connected.");
      }
    } finally {
      if (mountedRef.current) setRequesting(false);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Limit to 25MB
    if (file.size > 25 * 1024 * 1024) {
      setError("Audio file is too large (maximum size is 25MB).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i.test(file.name)) {
      setError("Please select a valid audio file (e.g. MP3, WAV, M4A, WEBM, OGG).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    const objectUrl = URL.createObjectURL(file);
    const audioObj = new Audio();
    audioObj.src = objectUrl;

    audioObj.onloadedmetadata = () => {
      const dur = Math.max(1, Math.round(audioObj.duration) || 1);
      setRecordingDuration(dur);
      setAudioUrl(objectUrl);
      setAudioFileName(file.name);
      setIsUploaded(true);
      onRecordingComplete(file, dur);
    };

    audioObj.onerror = () => {
      // In case metadata parsing fails, fallback safely
      const fallbackDur = 10;
      setRecordingDuration(fallbackDur);
      setAudioUrl(objectUrl);
      setAudioFileName(file.name);
      setIsUploaded(true);
      onRecordingComplete(file, fallbackDur);
    };
  };

  const handleDelete = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setPlaybackTime(0);
    setRecordingDuration(0);
    setAudioFileName(null);
    setIsUploaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
    <div className="bg-app-base border border-app-line rounded-2xl p-4 space-y-3">
      {/* Hidden File Input for Audio Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.aac"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-app-accent/15 border border-app-line flex items-center justify-center text-app-accent">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-hi uppercase tracking-wider">Voice Note Revision</h4>
            <p className="text-[11px] text-app-mist">Explain changes verbally by recording live or uploading an audio file</p>
          </div>
        </div>
        {audioUrl && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            {isUploaded ? "Audio File Ready" : "Voice Recording Ready"} ({formatTime(recordingDuration)})
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl p-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Recording & Upload Options State */}
      {!audioUrl && (
        <div className="flex items-center flex-wrap gap-2.5">
          {!isRecording ? (
            <>
              <button
                type="button"
                onClick={startRecording}
                disabled={requesting}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-app-accent/20 border border-app-accent/40 text-app-accent-soft hover:bg-app-accent/30 hover:text-hi transition-all text-xs font-semibold cursor-pointer group disabled:opacity-50"
              >
                <Mic className="w-4 h-4 text-app-accent group-hover:scale-110 transition-transform" />
                <span>{requesting ? "Waiting for microphone…" : "Record Voice Note"}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={requesting}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-app-surface border border-app-line hover:border-app-accent/50 text-app-accent-soft hover:bg-app-line-soft hover:text-hi transition-all text-xs font-semibold cursor-pointer group disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-app-accent group-hover:scale-110 transition-transform" />
                <span>Upload Audio File</span>
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between w-full bg-app-surface border border-red-500/40 rounded-xl px-4 py-2.5 animate-pulse">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping text-app-on-warm!" />
                <span className="text-xs font-mono font-bold text-red-400">
                  Recording... {formatTime(recordingDuration)} / {formatTime(maxDurationSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-500 text-app-on-warm! text-xs font-bold hover:bg-red-600 transition-colors cursor-pointer"
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
        <div className="bg-app-surface border border-app-line rounded-xl p-3 flex flex-col gap-2.5">
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          {audioFileName && (
            <div className="flex items-center gap-1.5 text-[11px] text-app-accent-soft bg-app-base/60 px-2.5 py-1 rounded-lg border border-app-line">
              <FileAudio className="w-3.5 h-3.5 text-app-accent shrink-0" />
              <span className="truncate">{audioFileName}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full bg-app-accent text-app-base flex items-center justify-center hover:bg-hi transition-colors cursor-pointer shrink-0 shadow-md"
              title={isPlaying ? "Pause" : "Play Voice Note"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex justify-between text-[11px] font-mono text-app-mist">
                <span>{formatTime(playbackTime)}</span>
                <span>{formatTime(recordingDuration)}</span>
              </div>
              <div
                className="w-full bg-app-base h-1.5 rounded-full overflow-hidden cursor-pointer relative"
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
                  className="bg-app-accent h-full rounded-full transition-all text-app-on-accent!"
                  style={{
                    width: `${recordingDuration > 0 ? (playbackTime / recordingDuration) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Explicit Delete Button */}
            <button
              type="button"
              onClick={handleDelete}
              title="Delete Voice Note"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </button>

            {/* Re-record / Re-upload button */}
            <button
              type="button"
              onClick={handleDelete}
              title="Replace / Re-record voice note"
              className="p-1.5 rounded-lg border border-app-line text-app-mist hover:text-hi hover:bg-app-base transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
