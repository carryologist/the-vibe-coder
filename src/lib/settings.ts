// Shared shape + loader for content/settings.json (the AI generation style
// config: base style prompt, named prompt presets, and default tag
// suggestions). Centralized here so the API route, the admin Settings
// page, and the post-generation route all agree on the same schema
// instead of each redeclaring their own loose `Settings` interface.

import { readFile } from "./github";

export interface PromptPreset {
  label: string;
  prompt: string;
}

export interface Settings {
  stylePrompt: string;
  prompts: Record<string, PromptPreset>;
  defaultTags: string[];
}

export const DEFAULT_STYLE_PROMPT =
  "Transform this transcript into a well-structured blog post with MDX frontmatter.";

const SETTINGS_PATH = "content/settings.json";

/**
 * Load settings.json from the content repo, filling in defaults for any
 * missing fields so callers never have to null-check. Returns the
 * all-defaults shape when the file doesn't exist yet (fresh repo) rather
 * than throwing.
 */
export async function getSettings(): Promise<Settings> {
  const raw = await readFile(SETTINGS_PATH);
  if (!raw) {
    return { stylePrompt: DEFAULT_STYLE_PROMPT, prompts: {}, defaultTags: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { stylePrompt: DEFAULT_STYLE_PROMPT, prompts: {}, defaultTags: [] };
  }

  const obj = (parsed && typeof parsed === "object" ? parsed : {}) as Record<
    string,
    unknown
  >;

  return {
    stylePrompt:
      typeof obj.stylePrompt === "string"
        ? obj.stylePrompt
        : DEFAULT_STYLE_PROMPT,
    prompts: isPromptMap(obj.prompts) ? obj.prompts : {},
    defaultTags: isStringArray(obj.defaultTags) ? obj.defaultTags : [],
  };
}

export function isPromptMap(
  value: unknown
): value is Record<string, PromptPreset> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (v) =>
      v &&
      typeof v === "object" &&
      typeof (v as PromptPreset).label === "string" &&
      typeof (v as PromptPreset).prompt === "string"
  );
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}
