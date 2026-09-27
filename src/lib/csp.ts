/**
 * Content Security Policy.
 *
 * Static public pages are the primary cost-control mechanism for this
 * site. A per-request CSP nonce forces App Router pages into dynamic
 * rendering, which burns Vercel Fluid CPU on every page view. Keep this
 * policy static so it can be attached in next.config.ts without touching
 * request headers in React Server Components.
 *
 * Next.js emits inline bootstrap/flight scripts, and the site also has a
 * small theme bootstrap plus JSON-LD blocks. The static policy therefore
 * allows inline scripts. That is weaker than nonce-only CSP, but it keeps
 * the public blog cacheable instead of trading every reader hit for a
 * server function invocation.
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

export function buildCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
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
