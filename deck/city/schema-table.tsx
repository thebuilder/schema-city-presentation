import type { CSSProperties } from "react"
import type { SchemaGraph, SchemaNode } from "@/deck/city/schema-city"

/*
 * The content model as the wall of rows a backoffice grid would give you. Every
 * Document Type with its counts, its compositions, its allowed children, its
 * blocks and its pickers, in alias order. Dense on purpose. The same component
 * draws the wall and the first frame of the morph, so the rows that lift off
 * are the rows the room was staring at.
 */

type Column = {
  key: string
  label: string
  /** Width in characters. The face is monospace, so a width in ch is exact. */
  width: number
  align?: "right"
}

const COLUMNS: Column[] = [
  { key: "name", label: "Name", width: 24 },
  { key: "alias", label: "Alias", width: 22 },
  { key: "kind", label: "Kind", width: 5 },
  { key: "root", label: "Root", width: 4 },
  { key: "culture", label: "Var", width: 4 },
  { key: "templates", label: "Tpl", width: 3, align: "right" },
  { key: "tabs", label: "Tabs", width: 4, align: "right" },
  { key: "groups", label: "Grp", width: 3, align: "right" },
  { key: "own", label: "Own", width: 3, align: "right" },
  { key: "composed", label: "Cmp", width: 3, align: "right" },
  { key: "compositions", label: "Compositions", width: 38 },
  { key: "children", label: "Allowed children", width: 58 },
  { key: "blocks", label: "Block elements", width: 64 },
  { key: "pickers", label: "Pickers", width: 36 },
]

/** Characters a row takes, cell gaps included, for the font fit below. */
const ROW_CHARS = COLUMNS.reduce((sum, column) => sum + column.width + 1, 0)

export type TableRow = { id: string; cells: Record<string, string> }

/**
 * A list cut to `width` characters with a count of what did not fit, so a cell
 * never overflows its column. Truncating here rather than with CSS ellipsis
 * keeps every box its own size, which is what the deck's overflow check reads.
 */
function list(names: string[], width: number): string {
  if (names.length === 0) {
    return "-"
  }
  let out = ""
  for (const [index, name] of names.entries()) {
    const rest = names.length - index - 1
    const next = out ? `${out}, ${name}` : name
    const tail = rest > 0 ? ` +${rest}` : ""
    if (next.length + tail.length > width) {
      const left = names.length - index
      return `${out}${out ? ", " : ""}+${left}`.slice(0, width)
    }
    out = next
  }
  return out
}

const fit = (text: string, width: number) =>
  text.length > width ? `${text.slice(0, width - 1)}~` : text

export function tableRows(graph: SchemaGraph): TableRow[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const name = (id: string) => byId.get(id)?.name ?? "(missing)"
  const out = (node: SchemaNode, kind: string) =>
    [
      ...new Set(
        (graph.edges ?? [])
          .filter((edge) => edge.from === node.id && edge.kind === kind)
          .map((edge) => name(edge.to))
      ),
    ].sort()
  const width = (key: string) =>
    COLUMNS.find((column) => column.key === key)?.width ?? 0
  const composedBy = new Set(
    (graph.edges ?? [])
      .filter((edge) => edge.kind === "composition")
      .map((edge) => edge.to)
  )

  return [...graph.nodes]
    .sort((a, b) => (a.alias < b.alias ? -1 : 1))
    .map((node) => ({
      id: node.id,
      cells: {
        name: fit(node.name, width("name")),
        alias: fit(node.alias, width("alias")),
        kind: node.isElement ? "elem" : composedBy.has(node.id) ? "comp" : "page",
        root: node.allowedAsRoot ? "yes" : "",
        culture: node.variesByCulture ? "cult" : "",
        templates: String(node.templates?.length ?? 0),
        tabs: String(node.groups?.filter((g) => g.type === "Tab").length ?? 0),
        groups: String(node.groups?.length ?? 0),
        own: String(node.ownPropertyCount),
        composed: String(node.composedPropertyCount),
        compositions: list(out(node, "composition"), width("compositions")),
        children: list(out(node, "allowedChild"), width("children")),
        blocks: list(out(node, "block"), width("blocks")),
        pickers: list(out(node, "reference"), width("pickers")),
      },
    }))
}

/** Canvas pixels the table may fill, below its title strip. */
const TABLE_HEIGHT = 990
const TABLE_WIDTH = 1840
/** Line height of a row, in ems. */
const LEADING = 1.2

/**
 * The type size that fits every row in the height and every column in the
 * width, as a share of the label token, so a larger export shrinks the wall
 * rather than running off the canvas.
 */
export function tableScale(rows: number): number {
  const label = 24
  const byHeight = TABLE_HEIGHT / ((rows + 1) * LEADING)
  const byWidth = TABLE_WIDTH / (ROW_CHARS * 0.6)
  return Math.min(byHeight, byWidth, 10) / label
}

export function SchemaTable({
  rows,
  graph,
  rowRef,
  style,
}: {
  rows: TableRow[]
  graph: SchemaGraph
  /** Called with each row's element, for the morph to measure where rows sit. */
  rowRef?: (id: string, element: HTMLElement | null) => void
  style?: CSSProperties
}) {
  const edges = graph.edges?.length ?? 0
  return (
    <div
      className="flex h-full flex-col gap-2 px-10 pt-6 text-muted-foreground"
      style={style}
    >
      <p className="flex gap-8 text-[length:calc(var(--slide-label-size)*0.6)] uppercase tracking-[var(--slide-label-tracking)]">
        <span className="text-foreground">Settings / Document Types</span>
        <span>{`${rows.length} items`}</span>
        <span>{`${edges} relationships`}</span>
        <span>Sort: alias</span>
      </p>
      <table
        className="table-fixed border-collapse whitespace-pre font-[family-name:var(--slide-font-mono)]"
        style={{
          fontSize: `calc(var(--slide-label-size) * ${tableScale(rows.length).toFixed(3)})`,
          lineHeight: LEADING,
        }}
      >
        <colgroup>
          {COLUMNS.map((column) => (
            <col key={column.key} style={{ width: `${column.width + 1}ch` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-border border-b text-foreground">
            {COLUMNS.map((column) => (
              <th
                className="pr-[1ch] font-semibold"
                key={column.key}
                style={{ textAlign: column.align ?? "left" }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="even:bg-muted/50"
              key={row.id}
              ref={rowRef ? (element) => rowRef(row.id, element) : undefined}
            >
              {COLUMNS.map((column) => (
                <td
                  className="pr-[1ch]"
                  key={column.key}
                  style={{ textAlign: column.align ?? "left" }}
                >
                  {row.cells[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
