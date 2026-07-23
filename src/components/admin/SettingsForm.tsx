"use client";

import { useState } from "react";

interface PromptPreset {
  label: string;
  prompt: string;
}

interface Settings {
  stylePrompt: string;
  prompts: Record<string, PromptPreset>;
  defaultTags: string[];
}

interface Props {
  initial: Settings;
}

export function SettingsForm({ initial }: Props) {
  const [stylePrompt, setStylePrompt] = useState(initial.stylePrompt);
  const [defaultTags, setDefaultTags] = useState<string[]>(
    initial.defaultTags
  );
  const [tagDraft, setTagDraft] = useState("");
  const [prompts, setPrompts] = useState<Record<string, PromptPreset>>(
    initial.prompts
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addTag() {
    const value = tagDraft.trim();
    if (!value || defaultTags.includes(value)) {
      setTagDraft("");
      return;
    }
    setDefaultTags((prev) => [...prev, value]);
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setDefaultTags((prev) => prev.filter((t) => t !== tag));
  }

  function addPreset() {
    // Find an unused key so the empty-state add button always works even
    // when "new-preset" is already taken.
    let key = "new-preset";
    let n = 2;
    while (key in prompts) {
      key = `new-preset-${n}`;
      n += 1;
    }
    setPrompts((prev) => ({ ...prev, [key]: { label: "New Preset", prompt: "" } }));
  }

  function updatePresetKey(oldKey: string, newKey: string) {
    if (!newKey || newKey === oldKey) return;
    setPrompts((prev) => {
      if (newKey in prev) return prev; // Don't clobber an existing preset.
      const next: Record<string, PromptPreset> = {};
      for (const [k, v] of Object.entries(prev)) {
        next[k === oldKey ? newKey : k] = v;
      }
      return next;
    });
  }

  function updatePreset(key: string, patch: Partial<PromptPreset>) {
    setPrompts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function removePreset(key: string) {
    setPrompts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stylePrompt, defaultTags, prompts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed: ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 font-mono text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Style prompt */}
      <section>
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-primary">
          Style Prompt
        </h2>
        <p className="mb-3 font-mono text-[11px] text-on-surface-variant">
          The base instructions Claude uses to turn a transcript into a
          post. Applied to every generation unless a preset below adds to
          it.
        </p>
        <textarea
          value={stylePrompt}
          onChange={(e) => setStylePrompt(e.target.value)}
          rows={10}
          className="w-full resize-y rounded-xl border border-outline-variant bg-bg px-4 py-3 font-mono text-sm leading-relaxed text-on-surface placeholder-outline outline-none transition-colors focus:border-primary/50"
        />
      </section>

      {/* Default tags */}
      <section>
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-primary">
          Default Tags
        </h2>
        <p className="mb-3 font-mono text-[11px] text-on-surface-variant">
          Suggested tags surfaced when drafting a new post. Doesn&apos;t
          restrict what a post can be tagged.
        </p>
        <div className="mb-3 flex flex-wrap gap-2">
          {defaultTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-low px-3 py-1 font-mono text-xs text-on-surface"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="text-on-surface-variant transition-colors hover:text-red-400"
              >
                ×
              </button>
            </span>
          ))}
          {defaultTags.length === 0 && (
            <span className="font-mono text-xs text-outline">
              No default tags yet.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag…"
            className="flex-1 rounded-lg border border-outline-variant bg-bg px-3 py-1.5 font-mono text-xs text-on-surface placeholder-outline outline-none transition-colors focus:border-primary/50"
          />
          <button
            onClick={addTag}
            className="rounded-lg border border-outline-variant/30 px-3 py-1.5 font-mono text-xs text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
          >
            Add
          </button>
        </div>
      </section>

      {/* Prompt presets */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-widest text-primary">
            Prompt Presets
          </h2>
          <button
            onClick={addPreset}
            className="rounded-lg border border-outline-variant/30 px-2 py-1 font-mono text-[11px] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
          >
            + Preset
          </button>
        </div>
        <p className="mb-3 font-mono text-[11px] text-on-surface-variant">
          Named prompt extensions selectable on the Record page (e.g.
          &quot;Thursday Thoughts&quot;). Layered on top of the style prompt
          above, not a replacement for it.
        </p>
        <div className="space-y-4">
          {Object.entries(prompts).map(([key, preset]) => (
            <div
              key={key}
              className="rounded-xl border border-outline-variant/10 bg-surface-low p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <label className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
                  Key
                </label>
                <input
                  defaultValue={key}
                  onBlur={(e) => updatePresetKey(key, e.target.value.trim())}
                  className="w-40 rounded-lg border border-outline-variant bg-bg px-2 py-1 font-mono text-xs text-on-surface outline-none focus:border-primary/50"
                />
                <label className="font-mono text-[10px] uppercase tracking-wide text-on-surface-variant">
                  Label
                </label>
                <input
                  value={preset.label}
                  onChange={(e) =>
                    updatePreset(key, { label: e.target.value })
                  }
                  className="flex-1 rounded-lg border border-outline-variant bg-bg px-2 py-1 font-mono text-xs text-on-surface outline-none focus:border-primary/50"
                />
                <button
                  onClick={() => removePreset(key)}
                  className="rounded-lg border border-red-500/30 px-2 py-1 font-mono text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={preset.prompt}
                onChange={(e) =>
                  updatePreset(key, { prompt: e.target.value })
                }
                rows={4}
                placeholder="Additional instructions layered on top of the base style prompt…"
                className="w-full resize-y rounded-lg border border-outline-variant bg-bg px-3 py-2 font-mono text-xs leading-relaxed text-on-surface placeholder-outline outline-none transition-colors focus:border-primary/50"
              />
            </div>
          ))}
          {Object.keys(prompts).length === 0 && (
            <p className="font-mono text-xs text-outline">
              No presets yet.
            </p>
          )}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg border border-primary/60 bg-primary/10 px-4 py-2 font-mono text-xs font-medium text-primary transition-all hover:bg-primary/20 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && (
          <span className="font-mono text-xs text-green-400">Saved.</span>
        )}
      </div>
    </div>
  );
}
