import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";

const SETTINGS_PATH = "content/settings.json";

export async function GET() {
  try {
    const raw = await readFile(SETTINGS_PATH);
    if (!raw) {
      return NextResponse.json({
        stylePrompt:
          "Transform this transcript into a well-structured blog post with MDX frontmatter.",
      });
    }
    return NextResponse.json(JSON.parse(raw));
  } catch (error) {
    console.error("Settings read error:", error);
    return NextResponse.json(
      { error: "Failed to read settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const content = JSON.stringify(body, null, 2) + "\n";

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
