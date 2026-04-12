import { NextResponse } from "next/server";

// Transcription is handled client-side via the Web Speech API.
// This route is reserved for potential future use with external
// transcription services (e.g., Whisper, AssemblyAI).
export async function POST() {
  return NextResponse.json(
    {
      error: "Client-side transcription via Web Speech API is the primary method. This endpoint is reserved for future use.",
    },
    { status: 501 }
  );
}
