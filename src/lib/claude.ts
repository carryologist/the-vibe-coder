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
 *
 * @param transcript    Raw voice transcript
 * @param stylePrompt   Base style/voice guidance (from settings.json)
 * @param artifacts     Optional attached files (images, PDFs, text)
 * @param existingContent  Existing MDX when editing a post
 * @param promptExtension  Additional prompt rules for a specific post type
 *                         (e.g. Thursday Thoughts conventions)
 */
export async function generateBlogPost(
  transcript: string,
  stylePrompt: string,
  artifacts: Artifact[] = [],
  existingContent?: string,
  promptExtension?: string
): Promise<string> {
  const client = getClient();
  const today = new Date().toISOString().split("T")[0];

  // --- System prompt: always-on voice & style guidance ---
  let systemPrompt = stylePrompt;
  if (promptExtension) {
    systemPrompt += `\n\n${promptExtension}`;
  }

  // --- Build the user content blocks ---
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

  // Add the main prompt text — focused on the task and transcript.
  content.push({
    type: "text",
    text: `Today's date is ${today}.${artifactNote}${editNote}

Here is the transcript to ${existingContent ? "incorporate into the existing post" : "transform into a blog post"}:

---
${transcript}
---

Return the complete MDX file including frontmatter. The frontmatter must include:
- title (string, no emdash or endash characters)
- date: '${existingContent ? "keep the original date" : today}' (MUST be quoted in single quotes)
- description (a one-sentence summary for SEO/previews, no emdash or endash characters)
- tags (YAML list of 2-5 relevant lowercase hyphenated tags from this set: agents, building-in-public, homelab, meta, ai, llm, mcp, next-js, security, vibe-coding, debugging, coder, devops, linux, future-of-coding, open-source, opinion)
- published: false (drafts are reviewed before publishing)
- type: 'how-to' or 'opinion' (use 'opinion' for thought leadership, editorials, and commentary; 'how-to' for tutorials, walkthroughs, and technical posts)
- syndicate: true

Critical formatting rules:
- Do NOT wrap the output in markdown code fences (no \`\`\`mdx or \`\`\`). Return raw MDX only.
- Do NOT use emdash (U+2014), endash (U+2013), or " -- " anywhere in the output. Use commas, semicolons, colons, or periods instead. Restructure sentences if needed.
- Start the response with --- (the frontmatter opening delimiter) and include nothing before it.
- End the response with the final line of content. No closing remarks or commentary after the post.`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: systemPrompt,
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
