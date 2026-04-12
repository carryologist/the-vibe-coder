"use client";

interface TranscriptEditorProps {
  transcript: string;
  onTranscriptChange: (value: string) => void;
  onGenerate: () => void;
  generating: boolean;
}

export function TranscriptEditor({
  transcript,
  onTranscriptChange,
  onGenerate,
  generating,
}: TranscriptEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-widest text-[#A3E635]">
          // Transcript
        </h2>
        <span className="font-mono text-[11px] text-[#555555]">
          {transcript.split(/\s+/).filter(Boolean).length} words
        </span>
      </div>

      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        rows={16}
        className="w-full resize-y rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] px-4 py-3 font-mono text-sm leading-relaxed text-[#EDEDED] placeholder-[#555555] outline-none transition-colors focus:border-[#A3E635]/50"
        placeholder="Transcript will appear here..."
      />

      <button
        onClick={onGenerate}
        disabled={generating || !transcript.trim()}
        className="self-start rounded-lg bg-[#A3E635] px-6 py-3 font-mono text-sm font-medium text-[#0A0A0A] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? "Generating..." : "Generate Post"}
      </button>
    </div>
  );
}
