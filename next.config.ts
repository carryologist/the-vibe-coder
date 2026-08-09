import type { NextConfig } from "next";

// Security headers that do not vary per request. The Content Security
// Policy is NOT here: it carries a per-request nonce and is built in
// src/middleware.ts (see src/lib/csp.ts).

// Link response headers (RFC 8288) advertising agent-discoverable
// resources from the site root. We send these on every response — the
// Cloudflare agent-readiness probe checks the homepage, and the values
// are equally true everywhere else.
//
// Relation types:
//   describedby   Pointer to the site description in agent-readable form
//   alternate     Alternate representations (RSS feed, llms.txt)
//   sitemap       The XML sitemap
//
// Next.js prepends its own preload Link headers for fonts/CSS. Multiple
// Link headers on one response are valid per RFC 8288 §3.
const LINK_HEADER = [
  '</llms.txt>; rel="describedby"; type="text/plain"',
  '</llms-full.txt>; rel="alternate"; type="text/plain"; title="Full content for LLMs"',
  '</feed.xml>; rel="alternate"; type="application/rss+xml"; title="RSS feed"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
].join(", ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // HSTS: enforce HTTPS for one year, include subdomains,
          // opt into the preload list. Vercel already serves the site
          // over HTTPS only, so this just locks browsers in.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Link",
            value: LINK_HEADER,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
