import type { Token } from "@/deck/city/highlight"
import { cn } from "@/lib/utils"

/*
 * A code panel in the theme's own ink. `highlight` tokenises on the server and
 * names each token's colour as a `--code-*` property; this maps those onto the
 * deck's tokens, so keywords take the amber, calls the phosphor and strings the
 * signal, in both colour modes.
 */
const INK =
  "[--code-foreground:var(--foreground)] [--code-token-comment:var(--muted-foreground)] [--code-token-constant:var(--foreground)] [--code-token-function:var(--primary)] [--code-token-keyword:var(--slide-amber)] [--code-token-link:var(--primary)] [--code-token-parameter:var(--foreground)] [--code-token-punctuation:var(--muted-foreground)] [--code-token-string-expression:var(--slide-signal)] [--code-token-string:var(--slide-signal)]"

export function Code({
  lines,
  className,
  caption,
}: {
  lines: Token[][]
  className?: string
  caption?: string
}) {
  return (
    <figure
      className={cn(
        "flex min-h-0 flex-col border border-[var(--slide-surface-border)] bg-[var(--slide-surface)]",
        INK,
        className
      )}
      data-slide-surface=""
    >
      {caption ? (
        <figcaption className="border-[var(--slide-surface-border)] border-b px-6 py-3 text-[length:var(--slide-label-size)] text-muted-foreground tracking-[var(--slide-label-tracking)]">
          {caption}
        </figcaption>
      ) : null}
      <pre className="min-h-0 overflow-hidden px-6 py-5 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-code-size)] leading-[1.5]">
        <code className="grid">
          {lines.map((line, i) => (
            // Lines are positional and never reorder.
            <span className="min-h-[1.5em] whitespace-pre" key={i}>
              {line.map((token, j) => (
                <span
                  className={token.italic ? "italic" : undefined}
                  // Tokens are positional within their line.
                  key={j}
                  style={{ color: token.color }}
                >
                  {token.content}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}
