import { cn } from "@/lib/utils"

/*
 * A code panel drawn in the theme's own ink rather than a syntax theme's, so it
 * reads as part of the terminal. Keywords sit back in the muted ink, literals take
 * the phosphor, and lines outside `lit` dim so the eye lands on the ones that
 * matter for the step on screen.
 */
const TOKEN =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.]*\b)|(\b(?:const|let|for|of|if|else|return|function|export|import|from|new|type|float|vec3|uniform|varying|while|continue)\b)/g

function highlight(line: string) {
  const parts: React.ReactNode[] = []
  let at = 0
  for (const match of line.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > at) parts.push(line.slice(at, index))
    const [text, comment, string, number] = match
    parts.push(
      <span
        className={
          comment
            ? "text-muted-foreground italic"
            : string || number
              ? "text-primary"
              : "text-muted-foreground"
        }
        key={index}
      >
        {text}
      </span>
    )
    at = index + text.length
  }
  if (at < line.length) parts.push(line.slice(at))
  return parts
}

/**
 * Breaks a line longer than `width` at its last space or operator before the limit,
 * carrying the line's indent plus two, the way a formatter would. Source written for
 * an editor is often wider than a slide column.
 */
function wrap(code: string, width: number) {
  return code
    .split("\n")
    .flatMap((line) => {
      const out: string[] = []
      let rest = line
      const indent = " ".repeat(line.search(/\S|$/) + 2)
      while (rest.length > width) {
        const cut = Math.max(
          rest.lastIndexOf(" ", width),
          rest.lastIndexOf("(", width) + 1
        )
        if (cut <= indent.length) break
        out.push(rest.slice(0, cut).trimEnd())
        rest = indent + rest.slice(cut).trimStart()
      }
      out.push(rest)
      return out
    })
    .join("\n")
}

export function Code({
  code,
  lit,
  className,
  caption,
  width,
}: {
  code: string
  /** Characters a line may run to before it wraps. No wrapping if absent. */
  width?: number
  /** One-based line ranges, inclusive, to keep at full strength. All lit if absent. */
  lit?: [number, number][]
  className?: string
  caption?: string
}) {
  const lines = (width ? wrap(code, width) : code).split("\n")
  const isLit = (n: number) =>
    !lit || lit.some(([from, to]) => n >= from && n <= to)
  return (
    <figure
      className={cn(
        "flex min-h-0 flex-col border border-[var(--slide-surface-border)] bg-[var(--slide-surface)]",
        className
      )}
      data-slide-surface=""
    >
      {caption ? (
        <figcaption className="border-[var(--slide-surface-border)] border-b px-6 py-3 text-[length:var(--slide-label-size)] text-muted-foreground tracking-[var(--slide-label-tracking)]">
          {caption}
        </figcaption>
      ) : null}
      <pre className="min-h-0 overflow-hidden px-6 py-4 font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-support-size)] leading-[1.45]">
        <code className="grid">
          {lines.map((line, i) => (
            <span
              className={cn(
                "whitespace-pre transition-opacity duration-500",
                isLit(i + 1) ? "opacity-100" : "opacity-25"
              )}
              // Lines are positional and never reorder.
              key={i}
            >
              {highlight(line)}
              {line === "" ? " " : null}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}
