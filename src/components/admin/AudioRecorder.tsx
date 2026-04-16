"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Extend Window to include webkitSpeechRecognition.
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface AudioRecorderProps {
  onTranscriptReady: (transcript: string) => void;
}

export function AudioRecorder({ onTranscriptReady }: AudioRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "processing">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef(false);
  const finalTextRef = useRef("");

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setError("");
      setFinalText("");
      setInterimText("");
      setElapsed(0);
      finalTextRef.current = "";
      isRecordingRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(30000);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            const text = result[0].transcript.trim();
            if (text) {
              finalTextRef.current += (finalTextRef.current ? " " : "") + text;
              setFinalText(finalTextRef.current);
            }
          } else {
            interim += result[0].transcript;
          }
        }
        setInterimText(interim);
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
          try {
            recognition.start();
          } catch {
            // Already started or mic unavailable — ignore.
          }
        }
      };

      recognition.onerror = (event: Event & { error: string }) => {
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.error("Speech recognition error:", event.error);
        }
      };

      recognition.start();
      setStatus("recording");

      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not access microphone");
      setStatus("idle");
      isRecordingRef.current = false;
    }
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setStatus("processing");

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    setTimeout(() => {
      const transcript = finalTextRef.current.trim();
      if (transcript) {
        onTranscriptReady(transcript);
      } else {
        setError("No speech detected. Please try again.");
      }
      setStatus("idle");
      setInterimText("");
    }, 500);
  }, [onTranscriptReady]);

  if (!supported) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface-low p-6 text-center">
        <p className="font-mono text-sm text-red-400">
          Speech recognition is not supported in this browser.
        </p>
        <p className="mt-2 font-mono text-xs text-on-surface-variant">
          Please use Chrome, Edge, or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Record button */}
      <button
        onClick={status === "recording" ? stopRecording : startRecording}
        disabled={status === "processing"}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          status === "recording"
            ? "border-red-500 bg-red-500/10 hover:bg-red-500/20"
            : status === "processing"
              ? "border-outline-variant bg-surface-low opacity-50 cursor-not-allowed"
              : "border-primary bg-primary/10 hover:bg-primary/20"
        }`}
      >
        {status === "recording" ? (
          <div className="h-6 w-6 rounded-sm bg-red-500" />
        ) : status === "processing" ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-on-surface-variant border-t-primary" />
        ) : (
          <div className="h-6 w-6 rounded-full bg-primary" />
        )}

        {status === "recording" && (
          <span className="absolute inset-0 animate-ping rounded-full border border-red-500/30" />
        )}
      </button>

      {/* Timer */}
      <div className="font-mono text-2xl tabular-nums text-on-surface">
        {formatTime(elapsed)}
      </div>

      {/* Status */}
      <p className="font-mono text-xs text-on-surface-variant">
        {status === "idle" && "Ready to record"}
        {status === "recording" && "Recording... click to stop"}
        {status === "processing" && "Finalizing transcript..."}
      </p>

      {/* Live transcript preview */}
      {(status === "recording" || finalText) && (
        <div className="w-full max-w-2xl rounded-xl border border-outline-variant bg-bg p-4">
          <p className="font-mono text-[11px] text-outline mb-2">// live transcript</p>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            {finalText}
            {interimText && (
              <span className="text-on-surface-variant/50 italic"> {interimText}</span>
            )}
            {status === "recording" && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2">
          <p className="font-mono text-xs text-red-400">{error}</p>
          <button
            onClick={() => setError("")}
            className="mt-1 font-mono text-xs text-on-surface-variant underline hover:text-on-surface"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
