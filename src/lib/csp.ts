/**
 * Content Security Policy.
 *
 * The policy is built per request in src/middleware.ts so it can carry
 * a fresh nonce. It used to be a static header in next.config.ts with
 * 'unsafe-inline' on script-src, which meant CSP provided no protection
 * against injected inline script: any XSS that reached the DOM could
 * execute an event handler or a <script> block.
 *
 * The only inline scripts the app renders are the theme bootstrap in
 * src/app/layout.tsx and the JSON-LD blocks in src/components/JsonLd.tsx.
 * Both read the nonce from the request header set by middleware, so
 * 'unsafe-inline' is gone.
 *
 * 'strict-dynamic' is deliberately not used: Next.js loads its own
 * chunks from 'self', which the policy already allows, and adding it
 * would silently ignore the host allowlist on browsers that support it.
 *
 * Allowed origins (and why):
 *   self                                 Site assets, MDX-rendered images
 *   data:                                Inline favicons / font fallback
 *   https://va.vercel-scripts.com        Vercel Analytics script tag
 *   https://vitals.vercel-insights.com   Vercel Web Vitals beacon
 *   https://giscus.app                   Comments iframe + assets
 *   https://www.loom.com                 Loom video embed iframe
 *   https://avatars.githubusercontent.com  GitHub avatars in Giscus
 *   https://github.githubassets.com      Giscus emoji/UI sprites
 *
 * 'unsafe-inline' remains on style-src: React and Next inject inline
 * style attributes that cannot carry a nonce. Inline style is a far
 * weaker vector than inline script.
 */

/** Request header used to pass the per-request nonce into the app. */
export const NONCE_HEADER = "x-csp-nonce";

export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    // Previously "https:", which allowed images from any host. No post
    // references an off-site image; the two GitHub hosts are there for
    // avatars and sprites rendered by Giscus.
    "img-src 'self' data: https://avatars.githubusercontent.com https://github.githubassets.com",
    "font-src 'self' data:",
    "connect-src 'self' https://vitals.vercel-insights.com https://api.github.com https://giscus.app",
    "frame-src https://giscus.app https://www.loom.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}
