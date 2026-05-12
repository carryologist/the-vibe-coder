// Pure types + helpers safely shared between server and client code.
// Anything that touches the filesystem lives in src/lib/images.ts instead.

export interface ImageFile {
  name: string;
  publicPath: string;
  repoPath: string;
  size: number;
  isImage: boolean;
}

export interface ImageDirectory {
  slug: string;
  postTitle: string | null;
  postPublished: boolean | null;
  orphaned: boolean;
  fileCount: number;
  totalSize: number;
  files: ImageFile[];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
