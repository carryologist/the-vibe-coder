/**
 * Validation for admin image uploads.
 *
 * Uploads used to be accepted with no MIME check, no extension
 * allowlist, and no size cap, then committed under public/ and served
 * same-origin. An .html or .svg file placed there executes in the
 * site's origin, and an arbitrarily large blob is committed to the
 * content repo permanently.
 */

import { isImageFilename } from "./image-types";

/** 10 MB. Comfortably above a full-resolution phone screenshot. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Extensions accepted for upload. Narrower than `isImageFilename`,
 * which is a display-time predicate: SVG is excluded because it can
 * carry script and is served from our own origin.
 */
const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif"];

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
];

export interface ImageUploadCheck {
  ok: boolean;
  /** Human-readable reason, present when ok is false. */
  error?: string;
}

export function validateImageUpload(params: {
  filename: string;
  byteLength: number;
  /** Browser-reported MIME type, when the caller has one. */
  mimeType?: string | null;
}): ImageUploadCheck {
  const { filename, byteLength, mimeType } = params;

  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!filename.includes(".") || !ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      ok: false,
      error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }

  // Defence in depth: the extension allowlist above is the real control,
  // since a client-supplied MIME type is not trustworthy.
  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return { ok: false, error: `Unsupported content type "${mimeType}".` };
  }

  if (byteLength <= 0) {
    return { ok: false, error: "File is empty." };
  }
  if (byteLength > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `File is too large (max ${MAX_IMAGE_BYTES / (1024 * 1024)} MB).`,
    };
  }

  if (!isImageFilename(filename)) {
    return { ok: false, error: "Unsupported file type." };
  }

  return { ok: true };
}

/** Byte length of a base64 payload without decoding it. */
export function base64ByteLength(base64: string): number {
  const body = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const padding = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  return Math.floor((body.length * 3) / 4) - padding;
}
