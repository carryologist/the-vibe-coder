import type { NextConfig } from "next";

// Content Security Policy — shipped in Report-Only mode first so we can
// observe violations in the browser console without breaking the site.
// After ~a week of clean reports, flip the header name from
// "Content-Security-Policy-Report-Only" to "Content-Security-Policy"
// to start enforcing.
//
// Allowed origins (and why):
//   self                        Site assets, MDX-rendered images
//   data:                       Inline favicons / font fallback
//   https: (img-src only)       Loosened because future MDX posts may
//                               reference external screenshots; tighten
//                               in Phase 4 once we have a known allowlist
//   https://va.vercel-scripts.com    Vercel Analytics script tag
//   https://vitals.vercel-insights.com  Vercel Web Vitals beacon
//   https://giscus.app          Comments iframe + assets
//   https://*.giscus.app        Giscus subdomain widgets
//   https://www.loom.com        Loom video embed iframe
//   https://avatars.githubusercontent.com  GitHub avatars rendered by Giscus
//   https://github.githubassets.com  Giscus emoji/UI sprites
//
// 'unsafe-inline' on script-src is required by the JSON-LD <script>
// blocks rendered via dangerouslySetInnerHTML. Phase 4 replaces this
// with a per-request nonce so we can drop 'unsafe-inline' entirely.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://vitals.vercel-insights.com https://api.github.com https://giscus.app",
  "frame-src https://giscus.app https://www.loom.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

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
            key: "Content-Security-Policy-Report-Only",
            value: CSP_DIRECTIVES,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
