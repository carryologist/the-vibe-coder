/** A single changelog entry stored in post frontmatter. */
export interface ChangelogEntry {
  date: string;
  summary: string;
}

/** Content type — controlled vocabulary for primary navigation. */
export type PostType = 'how-to' | 'opinion';

/** Frontmatter fields parsed from MDX files. */
export interface PostMeta {
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
  type?: PostType;
  publishAt?: string;
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
  type: PostType;
  readingTime: string;
  content: string;
  changelog?: ChangelogEntry[];
  loomUrl?: string;
  devtoUrl?: string;
  commentCount?: number;
  viewCount?: number;
}
