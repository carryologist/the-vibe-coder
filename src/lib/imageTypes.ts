// Types and client-safe utilities for images
export interface ImageFile {
  name: string;
  size: number;
  isImage: boolean;
}

export interface ImageDirectory {
  name: string;
  path: string;
  files: ImageFile[];
  fileCount: number;
  totalSize: number;
  isOrphaned: boolean;
}

/**
 * Format file size in human-readable format.
 * Client-safe utility.
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
