/** Frontmatter fields parsed from MDX files. */
export interface PostMeta {
  title: string;
  date: string;
  description: string;
  tags: string[];
  published: boolean;
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
}
