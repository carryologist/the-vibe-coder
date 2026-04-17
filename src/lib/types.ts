/** A single changelog entry stored in post frontmatter. */
export interface ChangelogEntry {
  date: string;
  summary: string;
}

/** Frontmatter fields parsed from MDX files. */
export interface PostMeta {
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  changelog?: ChangelogEntry[];
  loomUrl?: string;
  devtoUrl?: string;
}

/** Fully resolved post used by pages and components. */
export interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  readingTime: string;
  content: string;
  changelog?: ChangelogEntry[];
  loomUrl?: string;
  devtoUrl?: string;
}
