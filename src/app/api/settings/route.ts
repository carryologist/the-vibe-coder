import { NextRequest, NextResponse } from "next/server";
import { commitFile } from "@/lib/github";
import { getSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/require-admin";

const SETTINGS_PATH = "content/settings.json";

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
    if ("stylePrompt" in record && typeof record.stylePrompt !== "string") {
      return NextResponse.json(
        { error: "stylePrompt must be a string" },
        { status: 400 }
      );
    }
    if ("defaultTags" in record) {
      const tags = record.defaultTags;
      const valid =
        Array.isArray(tags) && tags.every((t) => typeof t === "string");
      if (!valid) {
        return NextResponse.json(
          { error: "defaultTags must be an array of strings" },
          { status: 400 }
        );
      }
    }

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
