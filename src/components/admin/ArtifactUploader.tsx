"use client";

import { useState, useRef, useCallback } from "react";

export interface Artifact {
  id: string;
  name: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  base64: string;
  preview?: string;
}

interface ArtifactUploaderProps {
  artifacts: Artifact[];
  onArtifactsChange: (artifacts: Artifact[]) => void;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PDF_TYPES = ["application/pdf"];
const TEXT_EXTENSIONS = [
  ".txt", ".md", ".json", ".ts", ".tsx", ".js", ".jsx",
  ".py", ".go", ".rs", ".yaml", ".yml", ".toml", ".csv",
  ".sh", ".bash", ".zsh", ".html", ".css", ".sql", ".env",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function classifyFile(file: File): "image" | "pdf" | "text" | null {
  if (IMAGE_TYPES.includes(file.type)) return "image";
  if (PDF_TYPES.includes(file.type)) return "pdf";
  if (file.type.startsWith("text/")) return "text";
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  if (TEXT_EXTENSIONS.includes(ext)) return "text";
  return null;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix to get raw base64.
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function ArtifactUploader({ artifacts, onArtifactsChange }: ArtifactUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError("");
    const newArtifacts: Artifact[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds 10MB limit`);
        continue;
      }

      const type = classifyFile(file);
      if (!type) {
        setError(`${file.name}: unsupported file type`);
        continue;
      }

      const base64 = await readFileAsBase64(file);
      let preview: string | undefined;

      if (type === "image") {
        // Use the full data URL as preview.
        preview = `data:${file.type};base64,${base64}`;
      }

      let textPreview: string | undefined;
      if (type === "text") {
        const text = await readFileAsText(file);
        textPreview = text.slice(0, 80);
      }

      newArtifacts.push({
        id: crypto.randomUUID(),
        name: file.name,
        type,
        mimeType: type === "text" ? "text/plain" : file.type,
        base64,
        preview: preview || textPreview,
      });
    }

    if (newArtifacts.length > 0) {
      onArtifactsChange([...artifacts, ...newArtifacts]);
    }
  }, [artifacts, onArtifactsChange]);

  function handleRemove(id: string) {
    onArtifactsChange(artifacts.filter((a) => a.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs uppercase tracking-widest text-[#A3E635]">
          // Artifacts
        </h3>
        <span className="font-mono text-[11px] text-[#555555]">
          {artifacts.length} file{artifacts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 transition-colors ${
          dragOver
            ? "border-[#A3E635]/50 bg-[#A3E635]/5"
            : "border-[#1F1F1F] hover:border-[#888888]/30"
        }`}
      >
        <p className="font-mono text-xs text-[#888888]">
          Drop files here or click to browse
        </p>
        <p className="font-mono text-[11px] text-[#555555]">
          Images, PDFs, text files — up to 10MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.json,.ts,.tsx,.js,.jsx,.py,.go,.rs,.yaml,.yml,.toml,.csv,.sh,.html,.css,.sql"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="font-mono text-xs text-red-400">{error}</p>
      )}

      {/* Artifact list */}
      {artifacts.length > 0 && (
        <div className="flex flex-col gap-2">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="flex items-center gap-3 rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2"
            >
              {/* Thumbnail/icon */}
              {artifact.type === "image" && artifact.preview ? (
                <img
                  src={artifact.preview}
                  alt={artifact.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1F1F1F] font-mono text-[11px] text-[#888888]">
                  {artifact.type === "pdf" ? "PDF" : "TXT"}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-xs text-[#EDEDED]">
                  {artifact.name}
                </p>
                {artifact.type === "text" && artifact.preview && (
                  <p className="truncate font-mono text-[11px] text-[#555555]">
                    {artifact.preview}
                  </p>
                )}
              </div>

              {/* Remove */}
              <button
                onClick={() => handleRemove(artifact.id)}
                className="font-mono text-xs text-[#555555] transition-colors hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
