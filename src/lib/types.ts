/** A single changelog entry stored in post frontmatter. */
export interface ChangelogEntry {
  date: string;
  summary: string;
}

/** Content type — controlled vocabulary for primary navigation. */
export type PostType = 'how-to' | 'opinion';

/**
 * A question/answer pair rendered as FAQPage JSON-LD on the post page.
 * Optional frontmatter — authored per post, typically on how-to posts
 * that follow a problem/solution pattern. Answers are plain text (no
 * markdown rendering) because they land in structured data, not HTML.
 */
export interface FaqEntry {
  question: string;
  answer: string;
}

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
  /**
   * When true, this post is included in the curated syndication feed
   * at /syndicate.xml (consumed by Substack and similar newsletter
   * platforms). Default: false — most posts stay blog-only.
   */
  syndicate?: boolean;
  /** Optional FAQ entries emitted as FAQPage JSON-LD on the post page. */
  faq?: FaqEntry[];
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
  syndicate?: boolean;
  faq?: FaqEntry[];
}
