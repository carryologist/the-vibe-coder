// Server-only utilities for images
import fs from "fs";
import path from "path";

const IMAGES_DIR = path.join(process.cwd(), "public/images");

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
 * Get all image directories under public/images/
 * Returns directories with file listings, counts, and sizes.
 * Orphaned directories (no matching post) are flagged.
 * Server-only: uses Node.js fs module.
 */
export function getAllImageDirectoriesSync(
  postSlugs: Set<string>
): ImageDirectory[] {
  if (!fs.existsSync(IMAGES_DIR)) {
    return [];
  }

  const dirNames = fs.readdirSync(IMAGES_DIR);

  const directories: ImageDirectory[] = dirNames
    .filter((name) => {
      const fullPath = path.join(IMAGES_DIR, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .map((dirName) => {
      const dirPath = path.join(IMAGES_DIR, dirName);
      const files = fs.readdirSync(dirPath).map((fileName) => {
        const filePath = path.join(dirPath, fileName);
        const stat = fs.statSync(filePath);
        const isImage = isImageFile(fileName);

        return {
          name: fileName,
          size: stat.size,
          isImage,
        };
      });

      const fileCount = files.length;
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const isOrphaned = !postSlugs.has(dirName);

      return {
        name: dirName,
        path: dirPath,
        files,
        fileCount,
        totalSize,
        isOrphaned,
      };
    })
    .sort((a, b) => {
      // Sort: orphaned first, then by name
      if (a.isOrphaned && !b.isOrphaned) return -1;
      if (!a.isOrphaned && b.isOrphaned) return 1;
      return a.name.localeCompare(b.name);
    });

  return directories;
}

/**
 * Check if a file is an image by extension.
 */
function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"];
  return imageExtensions.some((ext) => lower.endsWith(ext));
}
