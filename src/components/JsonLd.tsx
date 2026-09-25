import { headers } from "next/headers";
import { NONCE_HEADER } from "@/lib/csp";

interface WebSiteJsonLdProps {
  type: "website";
}

interface BlogPostingJsonLdProps {
  type: "blogposting";
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  slug: string;
  tags?: string[];
  readingTime?: string;
}

interface BreadcrumbJsonLdProps {
  type: "breadcrumb";
  items: { name: string; url: string }[];
}

interface FaqJsonLdProps {
  type: "faq";
  entries: { question: string; answer: string }[];
}

type JsonLdProps =
  | WebSiteJsonLdProps
  | BlogPostingJsonLdProps
  | BreadcrumbJsonLdProps
  | FaqJsonLdProps;

export async function JsonLd(props: JsonLdProps) {
  let data: Record<string, unknown>;

  switch (props.type) {
    case "website":
      data = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "vibescoder",
        url: "https://vibescoder.dev",
        description:
          "Building in public with AI agents. A technical blog by Rob Whiteley, CEO of Coder.",
        author: {
          "@type": "Person",
          name: "Rob Whiteley",
          url: "https://vibescoder.dev/about",
          jobTitle: "CEO",
          sameAs: [
            "https://www.linkedin.com/in/rwhiteley",
            "https://github.com/carryologist",
            "https://x.com/rwhiteley0",
          ],
          worksFor: {
            "@type": "Organization",
            name: "Coder",
            url: "https://coder.com",
          },
        },
      };
      break;

    case "blogposting":
      data = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: props.title,
        description: props.description,
        datePublished: props.datePublished,
        ...(props.dateModified && { dateModified: props.dateModified }),
        author: {
          "@type": "Person",
          name: "Rob Whiteley",
          url: "https://vibescoder.dev/about",
          jobTitle: "CEO",
          sameAs: [
            "https://www.linkedin.com/in/rwhiteley",
            "https://github.com/carryologist",
            "https://x.com/rwhiteley0",
          ],
          worksFor: {
            "@type": "Organization",
            name: "Coder",
            url: "https://coder.com",
          },
        },
        publisher: {
          "@type": "Organization",
          name: "vibescoder",
          url: "https://vibescoder.dev",
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://vibescoder.dev/posts/${props.slug}`,
        },
        url: `https://vibescoder.dev/posts/${props.slug}`,
        ...(props.tags &&
          props.tags.length > 0 && { keywords: props.tags.join(", ") }),
        ...(props.readingTime && {
          timeRequired: `PT${parseInt(props.readingTime)}M`,
        }),
        inLanguage: "en",
        isAccessibleForFree: true,
      };
      break;

    case "breadcrumb":
      data = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: props.items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      };
      break;

    case "faq":
      data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: props.entries.map((entry) => ({
          "@type": "Question",
          name: entry.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: entry.answer,
          },
        })),
      };
      break;
  }

  // The nonce is required now that script-src no longer allows
  // 'unsafe-inline'. Browsers apply script-src to <script> elements of
  // any type, including application/ld+json, so without it the
  // structured data is dropped.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;

  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // Escape the '<' character to '\u003c' so a frontmatter field
      // containing '</script>' cannot terminate this script tag and
      // inject HTML. JSON.stringify does not escape '<' by default.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
