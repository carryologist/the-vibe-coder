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

export async function POST(request: NextRequest) {
  try {
    const {
      transcript,
      stylePrompt: overridePrompt,
      artifacts = [],
      existingContent,
    } = (await request.json()) as {
      transcript?: string;
      stylePrompt?: string;
      artifacts?: ArtifactPayload[];
      existingContent?: string;
    };

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      );
    }

    // Use override prompt if provided, otherwise read from settings.
    let stylePrompt = overridePrompt;
    if (!stylePrompt) {
      const settingsRaw = await readFile("content/settings.json");
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        stylePrompt = settings.stylePrompt;
      }
    }

    if (!stylePrompt) {
      stylePrompt =
        "Transform this transcript into a well-structured blog post with MDX frontmatter.";
    }

    const mdx = await generateBlogPost(transcript, stylePrompt, artifacts, existingContent);

    return NextResponse.json({ mdx });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Blog generation failed" },
      { status: 500 }
    );
  }
}
