import { loadGraph } from "@/deck/city/fixtures"
import {
  cityDistricts,
  ROW_LIMIT,
  type SchemaNode,
  type Spacing,
  structureGroups,
} from "@/deck/city/schema-city"
import { highlight } from "@/deck/city/highlight"
import { everyTry } from "@/deck/parts/layout-tries"
import { type Lot, LayoutView } from "@/deck/parts/layout-view"

/** The demo's biggest district: 50 pages under one root, in five neighbourhoods. */
const DISTRICT = "Site"

/**
 * city.ts lays a board of page families out at this spacing and does not export
 * it. The offset check below fails if the copy and the real one part ways.
 */
const FAMILY_SPACING: Spacing = {
  familyGap: 8,
  gap: 6,
  laneGap: 8,
  rowGap: 9,
  rowLimit: ROW_LIMIT,
  street: 9,
}
/** Ground between two buildings in the opening row, the board's own gap. */
const ROW_GAP = FAMILY_SPACING.gap

/*
 * What each step does, cut down to the decision it makes. The real code in
 * city.ts and neighbourhoods.ts carries caps, gaps and edge cases a slide has no
 * room for; the positions on screen still come from that code.
 */
const CODE = [
  {
    caption: "city.ts",
    code: `
// more properties, a wider lot
const footprint =
  3.2 + 0.8 * Math.sqrt(properties)

// one floor per group
const floors = Math.max(groups, 1)`,
  },
  {
    caption: "neighbourhoods.ts",
    code: `
// a parent heads its children,
// and a family never splits
for (const family of families) {
  if (held + family.length > capacity) {
    rows.push([])
    held = 0
  }
  rows.at(-1).push(family)
  held += family.length
}`,
  },
  {
    caption: "neighbourhoods.ts",
    code: `
// try 17 widths, keep the
// smallest, squarest board
for (let i = 0; i <= 16; i++) {
  const board = shelve(widthAt(i))
  const score =
    board.area * squareness(board)
  if (score < best.score) best = board
}`,
  },
  {
    caption: "city.ts",
    code: `
// lay out every district, then
// again with linked types close
let city = districts.map(layout)
arrange(city)
const order = looseOrder(city)
city = districts.map((d) =>
  layout(d, order))
arrange(city)`,
  },
]

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/*
 * One decision the layout makes, on the demo schema. A district's pages arrive as
 * a list, group into neighbourhoods of a parent over its children, then go onto
 * shelves at whichever of seventeen widths gives the most landscape board, and
 * the district takes its place in the city. Every position on screen comes from
 * Schema City's own layout code or from a checked copy of its search.
 */
export async function Layout() {
  const graph = loadGraph("medium")
  const { placements, districts } = cityDistricts(graph)
  const placed = new Map(placements.map((each) => [each.id, each]))
  // structureGroups expects the nodes sorted by alias, as cityDistricts sorts them.
  const nodes = [...graph.nodes].sort((a, b) => compare(a.alias, b.alias))
  const group = structureGroups(nodes, graph.edges).find(
    (each) => each.name === DISTRICT
  )
  if (!group) throw new Error(`No ${DISTRICT} district in medium.json`)

  const item = (id: string) => ({ id, size: placed.get(id)?.footprint ?? 0 })
  const clusters = group.clusters.map((cluster) => ({
    families: cluster.families.map((family) => family.map(item)),
    head: cluster.head ? item(cluster.head) : null,
  }))
  const { tries, best } = everyTry(clusters, FAMILY_SPACING)

  // The board is laid around its own origin and the city moves it as one piece,
  // so a single offset takes every board position to its place in the city.
  const winner = tries[best]?.spots ?? {}
  const first = group.members[0] as SchemaNode
  const offset = {
    x: (placed.get(first.id)?.position.x ?? 0) - (winner[first.id]?.x ?? 0),
    z: (placed.get(first.id)?.position.z ?? 0) - (winner[first.id]?.z ?? 0),
  }
  for (const member of group.members) {
    const at = placed.get(member.id)?.position
    const spot = winner[member.id]
    if (
      !(at && spot) ||
      Math.abs(at.x - spot.x - offset.x) > 1e-6 ||
      Math.abs(at.z - spot.z - offset.z) > 1e-6
    )
      throw new Error(
        "The Site board no longer lands in the city in one piece. Check FAMILY_SPACING against city.ts."
      )
  }

  const clusterOf = new Map<string, number>()
  group.clusters.forEach((cluster, index) => {
    for (const id of [cluster.head, ...cluster.families.flat()])
      if (id) clusterOf.set(id, index)
  })
  const district = districts.find((each) => each.name === DISTRICT)
  const lots: Lot[] = placements.map((each) => ({
    cluster: clusterOf.get(each.id) ?? -1,
    head: group.clusters.some((cluster) => cluster.head === each.id),
    id: each.id,
    size: each.footprint,
    x: each.position.x,
    z: each.position.z,
  }))

  return (
    <LayoutView
      code={await Promise.all(
        CODE.map(async ({ caption, code }) => ({
          caption,
          lines: await highlight(code, "ts"),
        }))
      )}
      districts={districts.map((each) => ({
        id: each.id,
        maxX: each.maxX,
        maxZ: each.maxZ,
        minX: each.minX,
        minZ: each.minZ,
        name: each.name,
      }))}
      gap={ROW_GAP}
      best={best}
      district={district?.id ?? ""}
      lots={lots}
      members={group.members.map((member) => member.id)}
      offset={offset}
      tries={tries.map((each) => ({
        depth: each.depth,
        score: each.score,
        spots: each.spots,
        width: each.width,
      }))}
    />
  )
}
