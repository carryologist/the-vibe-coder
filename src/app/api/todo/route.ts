import { NextRequest, NextResponse } from "next/server";
import { readFile, commitFile } from "@/lib/github";
import { reorderUpNext, TodoConflictError } from "@/lib/todo";
import { requireAdmin } from "@/lib/require-admin";

const TODO_PATH = "content/TODO.md";

/**
 * Persist a new bullet order for content/TODO.md's "## Up Next" section.
 * Body: { order: string[] } — each Up Next item's exact current text, in
 * the desired new order. Deliberately the only thing this route can
 * change; item text/checked state are never touched here.
 */
export async function PUT(request: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const order = body?.order;
    if (!Array.isArray(order) || !order.every((t) => typeof t === "string")) {
      return NextResponse.json(
        { error: "order must be an array of strings" },
        { status: 400 }
      );
    }

    const raw = await readFile(TODO_PATH);
    if (!raw) {
      return NextResponse.json(
        { error: "content/TODO.md not found" },
        { status: 404 }
      );
    }

    let updated: string;
    try {
      updated = reorderUpNext(raw, order);
    } catch (err) {
      if (err instanceof TodoConflictError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      throw err;
    }

    await commitFile(TODO_PATH, updated, "chore: reorder Up Next backlog");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TODO reorder error:", error);
    return NextResponse.json(
      { error: "Failed to save order" },
      { status: 500 }
    );
  }
}
