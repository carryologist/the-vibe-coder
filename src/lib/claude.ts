import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";

interface Artifact {
  name: string;
  type: "image" | "pdf" | "text";
  mimeType: string;
  base64: string;
}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

/**
 * Generate a blog post from a transcript and optional artifacts
 * using a configurable style prompt. Returns the full MDX string
 * including frontmatter.
 */
export async function generateBlogPost(
  transcript: string,
  stylePrompt: string,
  artifacts: Artifact[] = [],
  existingContent?: string
): Promise<string> {
  const client = getClient();
  const today = new Date().toISOString().split("T")[0];

  // Build the content blocks array for the message.
  const content: MessageParam["content"] = [];

  // Add artifacts first so Claude has the context before the prompt.
  for (const artifact of artifacts) {
    if (artifact.type === "image") {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: artifact.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: artifact.base64,
        },
      });
      content.push({
        type: "text",
        text: `[Image: ${artifact.name}]`,
      });
    } else if (artifact.type === "pdf") {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: artifact.base64,
        },
        title: artifact.name,
      });
    } else if (artifact.type === "text") {
      // Decode base64 to text for plain text documents.
      const text = Buffer.from(artifact.base64, "base64").toString("utf-8");
      content.push({
        type: "document",
        source: {
          type: "text",
          media_type: "text/plain",
          data: text,
        },
        title: artifact.name,
      });
    }
  }

  // Build the artifact reference section for the prompt.
  let artifactNote = "";
  if (artifacts.length > 0) {
    const names = artifacts.map((a) => `- ${a.name} (${a.type})`).join("\n");
    artifactNote = `

The following artifacts have been provided as additional context. Reference and incorporate them into the blog post where relevant. For images, include them using markdown image syntax with the path /images/[post-slug]/[filename]:

${names}`;
  }

  // When editing, include the existing post so Claude can update it
  // rather than writing from scratch.
  let editNote = "";
  if (existingContent) {
    editNote = `

You are UPDATING an existing blog post. Here is the current content:

===EXISTING POST===
${existingContent}
===END EXISTING POST===

Incorporate the new transcript into the existing post. Preserve the original title, slug-friendly structure, and any content that is still relevant. Merge the new material naturally — add new sections, extend existing ones, or revise as appropriate. Keep the original date in the frontmatter.`;
  }

  // Add the main prompt text.
  content.push({
    type: "text",
    text: `${stylePrompt}

Today's date is ${today}.${artifactNote}${editNote}

Here is the transcript to ${existingContent ? "incorporate into the existing post" : "transform into a blog post"}:

---
${transcript}
---

Return the complete MDX file including frontmatter. The frontmatter must include:
- title (string)
- date (${existingContent ? "keep the original date" : today})
- description (a one-sentence summary for SEO/previews)
- tags (array of 2-5 relevant lowercase tags)
- published (set to true)

Start the response with --- (the frontmatter opening delimiter) and include nothing before it.`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
