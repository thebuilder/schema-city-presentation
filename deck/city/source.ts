import "server-only"

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { CLIENT_DIR } from "@/deck/city/schema-city"

/*
 * Code on a slide is cut from Schema City's source in the submodule at render time, so
 * what the audience reads is what drew the city beside it. A marker that no longer
 * matches throws, which turns a renamed function into a failed build instead of a
 * slide quoting code that is gone.
 */
export function excerpt(
  file: string,
  from: string,
  /** The line that ends the cut, or how many lines to take. */
  to: string | number,
  { skipComments = true }: { skipComments?: boolean } = {}
): string {
  const lines = readFileSync(
    join(process.cwd(), CLIENT_DIR, "src", file),
    "utf8"
  ).split("\n")
  const start = lines.findIndex((line) => line.includes(from))
  const end =
    typeof to === "number"
      ? start + to - 1
      : lines.findIndex((line, i) => i >= start && line.includes(to))
  if (start < 0 || end < 0)
    throw new Error(`No excerpt from "${from}" to "${to}" in ${file}`)
  const cut = lines
    .slice(start, end + 1)
    .filter((line) => !(skipComments && /^\s*(\/\/|\/\*|\*)/.test(line)))
  const indent = Math.min(
    ...cut.filter((line) => line.trim()).map((line) => line.search(/\S/))
  )
  return cut.map((line) => line.slice(indent)).join("\n")
}
