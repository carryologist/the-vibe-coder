import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/claude";
import { readFile } from "@/lib/github";
import matter from "gray-matter";

export const maxDuration = 120;

interface ArtifactPayload {
  name: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  base64: string;
}

interface Settings {
  stylePrompt?: string;
  prompts?: Record<string, { label: string; prompt: string }>;
}

export async function POST(request: NextRequest) {
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
    let settings: Settings = {};
    const settingsRaw = await readFile("content/settings.json");
    if (settingsRaw) {
      settings = JSON.parse(settingsRaw);
    }

    // Resolve the base style prompt.
    // Priority: explicit override > settings.json > hardcoded fallback.
    const stylePrompt =
      overridePrompt ||
      settings.stylePrompt ||
      "Transform this transcript into a well-structured blog post with MDX frontmatter.";

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

    // Post-process: enforce frontmatter invariants the model may miss.
    const patched = patchFrontmatter(mdx);

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
