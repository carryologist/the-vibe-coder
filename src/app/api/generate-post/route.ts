import { NextRequest, NextResponse } from "next/server";
import { generateBlogPost } from "@/lib/claude";
import { readFile } from "@/lib/github";

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

    return NextResponse.json({ mdx });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Blog generation failed" },
      { status: 500 }
    );
  }
}
