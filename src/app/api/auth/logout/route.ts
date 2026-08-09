import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, revokeCurrentSession } from "@/lib/auth";
import { isSameOrigin } from "@/lib/origin";

export async function POST(request: NextRequest) {
  // Same defense-in-depth check the login route applies. The session
  // cookie is SameSite=strict so a third-party page cannot send it,
  // but rejecting a foreign Origin at the server is cheaper and
  // louder, and a forced logout is a real (if minor) nuisance.
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }

  // Revoke the token itself, not just the browser's copy of it.
  // Clearing the cookie alone leaves a captured token valid until it
  // expires.
  let revoked = true;
  try {
    await revokeCurrentSession();
  } catch (error) {
    console.error("Logout revocation failed:", error);
    revoked = false;
  }

  const response = NextResponse.json(
    { success: true, revoked },
    { status: revoked ? 200 : 500 }
  );
  response.cookies.set(clearSessionCookie());
  return response;
}
