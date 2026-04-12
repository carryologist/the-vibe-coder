import Anthropic from "@anthropic-ai/sdk";

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

/**
 * Generate a blog post from a transcript using a configurable style prompt.
 * Returns the full MDX string including frontmatter.
 */
export async function generateBlogPost(
  transcript: string,
  stylePrompt: string
): Promise<string> {
  const client = getClient();
  const today = new Date().toISOString().split("T")[0];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16000,
    messages: [
      {
        role: "user",
        content: `${stylePrompt}

Today's date is ${today}.

Here is the transcript to transform into a blog post:

---
${transcript}
---

Return the complete MDX file including frontmatter. The frontmatter must include:
- title (string)
- date (${today})
- description (a one-sentence summary for SEO/previews)
- tags (array of 2-5 relevant lowercase tags)
- published (set to true)

Start the response with --- (the frontmatter opening delimiter) and include nothing before it.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock?.text ?? "";
}
