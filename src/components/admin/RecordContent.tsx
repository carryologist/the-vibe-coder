"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AudioRecorder } from "@/components/admin/AudioRecorder";
import { TranscriptEditor } from "@/components/admin/TranscriptEditor";
import { PostPreview } from "@/components/admin/PostPreview";
import { ArtifactUploader } from "@/components/admin/ArtifactUploader";
import type { Artifact } from "@/components/admin/ArtifactUploader";

type Step = "record" | "transcript" | "preview" | "published";

export function RecordContent() {
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit") || undefined;

  const [step, setStep] = useState<Step>("record");
  const [transcript, setTranscript] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [mdx, setMdx] = useState("");
  const [existingContent, setExistingContent] = useState<string | undefined>();
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    sha: string;
    path: string;
  } | null>(null);
  const [error, setError] = useState("");

  // When editing, fetch the existing post content so it can be passed
  // as context to the generation step.
  useEffect(() => {
    if (!editSlug) return;
    async function loadExisting() {
      try {
        const res = await fetch(`/api/posts?slug=${editSlug}`);
        if (!res.ok) throw new Error("Failed to load post");
        const data = await res.json();
        setExistingContent(data.content);
      } catch (err) {
        console.error("Failed to load existing post for editing:", err);
      }
    }
    loadExisting();
  }, [editSlug]);

  function handleTranscriptReady(text: string) {
    setTranscript(text);
    setStep("transcript");
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      const artifactPayload = artifacts.map(({ name, type, mimeType, base64 }) => ({
        name,
        type,
        mimeType,
        base64,
      }));

      const res = await fetch("/api/generate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          artifacts: artifactPayload,
          existingContent,
        }),
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
      const images = artifacts
        .filter((a) => a.type === "image")
        .map(({ name, base64 }) => ({ name, base64 }));

      // Use PUT when editing an existing post, POST for new posts.
      const method = editSlug ? "PUT" : "POST";
      const body = editSlug
        ? { slug, content: mdx }
        : { slug, content: mdx, images };

      const res = await fetch("/api/posts", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(editSlug ? "Update failed" : "Publishing failed");

      const data = await res.json();
      setPublishResult(data);
      setStep("published");
    } catch (err) {
      setError(err instanceof Error ? err.message : editSlug ? "Update failed" : "Publishing failed");
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
      {/* Edit mode banner */}
      {editSlug && (
        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2">
          <p className="font-mono text-xs text-primary">
            // Editing: {editSlug}
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-3 font-mono text-[11px]">
        {(["record", "transcript", "preview", "published"] as const).map(
          (s, i) => (
            <span key={s} className="flex items-center gap-3">
              {i > 0 && <span className="text-outline-variant">→</span>}
              <span
                className={step === s ? "text-primary" : "text-outline"}
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
          <h1 className="mb-8 font-mono text-xs uppercase tracking-widest text-primary">
            // {editSlug ? "Record Your Edits" : "Record Your Thoughts"}
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
          editSlug={editSlug}
        />
      )}

      {step === "published" && publishResult && (
        <div className="flex flex-col items-center gap-4 pt-12">
          <div className="text-4xl">✓</div>
          <h2 className="font-mono text-sm text-primary">
            {editSlug ? "Updated!" : "Published!"}
          </h2>
          <p className="font-mono text-xs text-on-surface-variant">
            Committed to {publishResult.path}
          </p>
          <p className="font-mono text-[11px] text-outline">
            SHA: {publishResult.sha.slice(0, 8)}
          </p>
          <p className="font-mono text-xs text-on-surface-variant">
            Vercel will auto-deploy in a few seconds.
          </p>
          <button
            onClick={handleReset}
            className="mt-4 rounded-lg border border-outline-variant px-6 py-2.5 font-mono text-sm text-on-surface transition-colors hover:border-primary/30"
          >
            Record Another
          </button>
        </div>
      )}
    </div>
  );
}
