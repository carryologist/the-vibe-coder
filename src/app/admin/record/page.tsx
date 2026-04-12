"use client";

import { useState } from "react";
import { AudioRecorder } from "@/components/admin/AudioRecorder";
import { TranscriptEditor } from "@/components/admin/TranscriptEditor";
import { PostPreview } from "@/components/admin/PostPreview";
import { ArtifactUploader } from "@/components/admin/ArtifactUploader";
import type { Artifact } from "@/components/admin/ArtifactUploader";

type Step = "record" | "transcript" | "preview" | "published";

export default function RecordPage() {
  const [step, setStep] = useState<Step>("record");
  const [transcript, setTranscript] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [mdx, setMdx] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    sha: string;
    path: string;
  } | null>(null);
  const [error, setError] = useState("");

  function handleTranscriptReady(text: string) {
    setTranscript(text);
    setStep("transcript");
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      // Prepare artifacts payload (strip preview and id for the API).
      const artifactPayload = artifacts.map(({ name, type, mimeType, base64 }) => ({
        name,
        type,
        mimeType,
        base64,
      }));

      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, artifacts: artifactPayload }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      setMdx(data.mdx);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePublish(slug: string) {
    setPublishing(true);
    setError("");

    try {
      // Collect image artifacts to commit alongside the post.
      const images = artifacts
        .filter((a) => a.type === "image")
        .map(({ name, base64 }) => ({ name, base64 }));

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content: mdx, images }),
      });

      if (!res.ok) throw new Error("Publishing failed");

      const data = await res.json();
      setPublishResult(data);
      setStep("published");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publishing failed");
    } finally {
      setPublishing(false);
    }
  }

  function handleReset() {
    setStep("record");
    setTranscript("");
    setArtifacts([]);
    setMdx("");
    setPublishResult(null);
    setError("");
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-3 font-mono text-[11px]">
        {(["record", "transcript", "preview", "published"] as const).map(
          (s, i) => (
            <span key={s} className="flex items-center gap-3">
              {i > 0 && <span className="text-[#333333]">→</span>}
              <span
                className={step === s ? "text-[#A3E635]" : "text-[#555555]"}
              >
                {s}
              </span>
            </span>
          )
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2">
          <p className="font-mono text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Step content */}
      {step === "record" && (
        <div className="flex flex-col items-center pt-12">
          <h1 className="mb-8 font-mono text-xs uppercase tracking-widest text-[#A3E635]">
            // Record Your Thoughts
          </h1>
          <AudioRecorder onTranscriptReady={handleTranscriptReady} />
        </div>
      )}

      {step === "transcript" && (
        <div className="flex flex-col gap-8">
          <TranscriptEditor
            transcript={transcript}
            onTranscriptChange={setTranscript}
            onGenerate={handleGenerate}
            generating={generating}
          />
          <ArtifactUploader
            artifacts={artifacts}
            onArtifactsChange={setArtifacts}
          />
        </div>
      )}

      {step === "preview" && (
        <PostPreview
          mdx={mdx}
          onMdxChange={setMdx}
          onPublish={handlePublish}
          publishing={publishing}
        />
      )}

      {step === "published" && publishResult && (
        <div className="flex flex-col items-center gap-4 pt-12">
          <div className="text-4xl">✓</div>
          <h2 className="font-mono text-sm text-[#A3E635]">Published!</h2>
          <p className="font-mono text-xs text-[#888888]">
            Committed to {publishResult.path}
          </p>
          <p className="font-mono text-[11px] text-[#555555]">
            SHA: {publishResult.sha.slice(0, 8)}
          </p>
          <p className="font-mono text-xs text-[#888888]">
            Vercel will auto-deploy in a few seconds.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 rounded-lg border border-[#1F1F1F] px-6 py-2.5 font-mono text-sm text-[#EDEDED] transition-colors hover:border-[#A3E635]/30"
          >
            Record Another
          </button>
        </div>
      )}
    </div>
  );
}
