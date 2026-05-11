import type { CSSProperties, ReactNode } from "react";

interface AnimateInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * CSS-only fade-in + translate. Previously used framer-motion which
 * shipped ~35KB gzip to every page for what was, in practice, two
 * lines of @keyframes. The animation matches the original timing:
 *   opacity 0 -> 1, translateY 20px -> 0
 *   500ms, ease [0.21, 0.47, 0.32, 0.98]
 *
 * `delay` is a prop and varies per call site, so it is plumbed through
 * a CSS custom property instead of inlining N keyframes. Browsers
 * with prefers-reduced-motion skip the transform via the rule in
 * globals.css.
 */
export function AnimateIn({ children, delay = 0, className }: AnimateInProps) {
  const style = { "--animate-in-delay": `${delay}s` } as CSSProperties;
  return (
    <div className={`animate-in ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
