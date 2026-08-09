import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/claude";
import { getSettings, DEFAULT_STYLE_PROMPT } from "@/lib/settings";
import matter from "gray-matter";
import { requireAdmin } from "@/lib/require-admin";

export const maxDuration = 120;

interface ArtifactPayload {
  name: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  base64: string;
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const {
      transcript,
      stylePrompt: overridePrompt,
      promptName,
      artifacts = [],
      existingContent,
    } = (await request.json()) as {
      transcript?: string;
      stylePrompt?: string;
      promptName?: string;
      artifacts?: ArtifactPayload[];
      existingContent?: string;
    };

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    // Load settings from the content repo.
    const settings = await getSettings();

    // Resolve the base style prompt.
    // Priority: explicit override > settings.json > hardcoded fallback.
    const stylePrompt =
      overridePrompt || settings.stylePrompt || DEFAULT_STYLE_PROMPT;

    // Resolve the named prompt extension (e.g. "thursday-thoughts").
    let promptExtension: string | undefined;
    if (promptName && settings.prompts?.[promptName]) {
      promptExtension = settings.prompts[promptName].prompt;
    }

    const mdx = await generateBlogPost(
      transcript,
      stylePrompt,
      artifacts,
      existingContent,
      promptExtension
    );

    // Post-process: strip code fences and enforce frontmatter invariants.
    const cleaned = stripCodeFences(mdx);
    const patched = patchFrontmatter(cleaned);

    return NextResponse.json({ mdx: patched });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Blog generation failed";
    return NextResponse.json(
      { error: `Blog generation failed: ${message}` },
      { status: 500 }
    );
  }
}

const VALID_TYPES = ["how-to", "opinion"] as const;

/**
 * Strip markdown code fences wrapping the entire output.
 * Models sometimes wrap MDX output in ```mdx ... ``` despite
 * instructions not to. This extracts the inner content.
 */
function stripCodeFences(mdx: string): string {
  const trimmed = mdx.trim();
  // Match ```mdx or ``` at the start, and ``` at the end.
  const match = trimmed.match(
    /^```(?:mdx|markdown)?\s*\n([\s\S]*?)\n```\s*$/,
  );
  if (match) return match[1].trim();
  return trimmed;
}

/**
 * Enforce frontmatter invariants after generation.
 * The model is instructed to include these fields, but may omit or
 * mis-format them. This function ensures the output is always valid.
 */
function patchFrontmatter(mdx: string): string {
  try {
    const { data, content } = matter(mdx);
    const today = new Date().toISOString().split("T")[0];

    // Ensure date is a quoted string (gray-matter may parse to Date).
    if (data.date instanceof Date) {
      data.date = data.date.toISOString().split("T")[0];
    } else if (!data.date) {
      data.date = today;
    }

    // Ensure published is false for generated drafts.
    data.published = false;

    // Ensure type is valid.
    if (!data.type || !VALID_TYPES.includes(data.type)) {
      data.type = "how-to";
    }

    // Ensure syndicate is set.
    if (data.syndicate === undefined) {
      data.syndicate = true;
    }

    // Rebuild MDX with patched frontmatter.
    // Use matter.stringify to re-serialize, then fix date quoting.
    let result = matter.stringify(content, data);

    // matter.stringify may leave dates unquoted; ensure they are quoted.
    result = result.replace(
      /^date: (\d{4}-\d{2}-\d{2})$/m,
      "date: '$1'",
    );

    return result;
  } catch {
    // If frontmatter parsing fails, return the raw MDX unchanged.
    return mdx;
  }
}
