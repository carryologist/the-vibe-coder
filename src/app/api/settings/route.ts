import { NextRequest, NextResponse } from "next/server";
import { commitFile } from "@/lib/github";
import {
  getSettings,
  isPromptMap,
  isStringArray,
  type Settings,
} from "@/lib/settings";
import { requireAdmin } from "@/lib/require-admin";

const SETTINGS_PATH = "content/settings.json";

// Bounds on the persisted file. stylePrompt and every preset prompt are
// used verbatim as the system prompt for post generation, so an
// unbounded value is both a cost problem and a durable behaviour
// change.
const MAX_PROMPT_LENGTH = 20_000;
const MAX_PRESETS = 50;
const MAX_DEFAULT_TAGS = 50;
const MAX_TAG_LENGTH = 100;

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings read error:", error);
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 }
      );
    }
    const record = body as Record<string, unknown>;

    // Start from the persisted settings and overwrite only the fields
    // that validate. The previous implementation serialised the whole
    // request body, so unvalidated `prompts` and arbitrary extra keys of
    // any size were written straight into content/settings.json, and a
    // malformed prompts map was then silently dropped by getSettings()
    // rather than reported.
    const current = await getSettings();
    const next: Settings = {
      stylePrompt: current.stylePrompt,
      prompts: current.prompts,
      defaultTags: current.defaultTags,
    };

    if ("stylePrompt" in record) {
      if (typeof record.stylePrompt !== "string") {
        return NextResponse.json(
          { error: "stylePrompt must be a string" },
          { status: 400 }
        );
      }
      if (record.stylePrompt.length > MAX_PROMPT_LENGTH) {
        return NextResponse.json(
          { error: `stylePrompt must be at most ${MAX_PROMPT_LENGTH} characters` },
          { status: 400 }
        );
      }
      next.stylePrompt = record.stylePrompt;
    }

    if ("defaultTags" in record) {
      const tags = record.defaultTags;
      if (!isStringArray(tags)) {
        return NextResponse.json(
          { error: "defaultTags must be an array of strings" },
          { status: 400 }
        );
      }
      if (tags.length > MAX_DEFAULT_TAGS) {
        return NextResponse.json(
          { error: `defaultTags must have at most ${MAX_DEFAULT_TAGS} entries` },
          { status: 400 }
        );
      }
      if (tags.some((t) => t.length > MAX_TAG_LENGTH)) {
        return NextResponse.json(
          { error: `each tag must be at most ${MAX_TAG_LENGTH} characters` },
          { status: 400 }
        );
      }
      next.defaultTags = tags;
    }

    if ("prompts" in record) {
      if (!isPromptMap(record.prompts)) {
        return NextResponse.json(
          {
            error:
              "prompts must be an object of { label: string, prompt: string }",
          },
          { status: 400 }
        );
      }
      const entries = Object.entries(record.prompts);
      if (entries.length > MAX_PRESETS) {
        return NextResponse.json(
          { error: `at most ${MAX_PRESETS} prompt presets are allowed` },
          { status: 400 }
        );
      }
      if (entries.some(([, preset]) => preset.prompt.length > MAX_PROMPT_LENGTH)) {
        return NextResponse.json(
          {
            error: `each preset prompt must be at most ${MAX_PROMPT_LENGTH} characters`,
          },
          { status: 400 }
        );
      }
      next.prompts = record.prompts;
    }

    const content = JSON.stringify(next, null, 2) + "\n";

    await commitFile(SETTINGS_PATH, content, "chore: update settings");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
