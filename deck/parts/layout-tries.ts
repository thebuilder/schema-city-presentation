import {
  type Cluster,
  layoutNeighbourhoods,
  type Spacing,
} from "@/deck/city/schema-city"

/*
 * layoutNeighbourhoods tries seventeen shelf widths and keeps the best board. The
 * slide shows every try, so this is the same search with the losers kept: layCluster,
 * shelve and measureShelves are copied from the submodule's app/layout/
 * neighbourhoods.ts, which exports only the winner.
 *
 * A copy can drift, so `everyTry` checks its winner against the real function on
 * every render and throws when they disagree. A sync that changes the search fails
 * the build here instead of putting a layout on screen the package never draws.
 */

type Item = { id: string; size: number }
type Laid = { width: number; rows: { item: Item; x: number }[][] }
type Stack = { left: number; width: number; next: number }
type Shelf = {
  stacks: Stack[]
  held: { laid: Laid; stack: Stack; row: number }[]
  rows: number
  used: number
}

const CLUSTER_ASPECT = 1.4
const TARGET_ASPECT = 1.6
const TRIES = 16

function layCluster(cluster: Cluster, spacing: Spacing): Laid {
  const cells = cluster.families.reduce((sum, family) => sum + family.length, 0)
  const longest = Math.max(0, ...cluster.families.map((family) => family.length))
  const capacity = Math.max(
    longest,
    Math.min(spacing.rowLimit, Math.ceil(Math.sqrt(cells * CLUSTER_ASPECT)))
  )
  const rows: Item[][][] = []
  let held = Number.POSITIVE_INFINITY
  for (const family of cluster.families) {
    if (held + family.length > capacity) {
      rows.push([family])
      held = family.length
    } else {
      ;(rows[rows.length - 1] as Item[][]).push(family)
      held += family.length
    }
  }
  const laid = rows.map((row) => {
    const width =
      row.reduce(
        (sum, family) =>
          sum +
          family.reduce((inner, item) => inner + item.size, 0) +
          spacing.gap * (family.length - 1),
        0
      ) +
      spacing.familyGap * (row.length - 1)
    const placed: { item: Item; x: number }[] = []
    let left = -width / 2
    for (const family of row) {
      for (const item of family) {
        placed.push({ item, x: left + item.size / 2 })
        left += item.size + spacing.gap
      }
      left += spacing.familyGap - spacing.gap
    }
    return { placed, width }
  })
  const head = cluster.head ? [[{ item: cluster.head, x: 0 }]] : []
  return {
    rows: [...head, ...laid.map((row) => row.placed)],
    width: Math.max(cluster.head?.size ?? 0, ...laid.map((row) => row.width)),
  }
}

function shelve(laid: readonly Laid[], limit: number, spacing: Spacing) {
  const shelves: Shelf[] = []
  for (const one of laid) {
    const shelf = shelves[shelves.length - 1]
    const last = shelf?.stacks[shelf.stacks.length - 1]
    const under = shelf?.stacks.find(
      (open) =>
        open.next + one.rows.length <= shelf.rows &&
        (one.width <= open.width + 1e-9 ||
          (open === last && open.left + one.width <= limit + 1e-9))
    )
    if (shelf && under) {
      shelf.held.push({ laid: one, row: under.next, stack: under })
      under.next += one.rows.length
      under.width = Math.max(under.width, one.width)
      shelf.used = Math.max(shelf.used, under.left + under.width)
      continue
    }
    const wider = (shelf?.used ?? 0) + spacing.laneGap + one.width
    if (shelf && wider <= limit + 1e-9) {
      const stack = { left: wider - one.width, next: one.rows.length, width: one.width }
      shelf.stacks.push(stack)
      shelf.held.push({ laid: one, row: 0, stack })
      shelf.rows = Math.max(shelf.rows, one.rows.length)
      shelf.used = wider
      continue
    }
    const stack = { left: 0, next: one.rows.length, width: one.width }
    shelves.push({
      held: [{ laid: one, row: 0, stack }],
      rows: one.rows.length,
      stacks: [stack],
      used: one.width,
    })
  }
  return shelves
}

function measureShelves(shelves: readonly Shelf[], spacing: Spacing) {
  let top = 0
  const laidOut = shelves.map((shelf) => {
    const depths = new Array<number>(shelf.rows).fill(0)
    const starts = new Set<number>()
    for (const { laid: one, row } of shelf.held) {
      if (row > 0) starts.add(row)
      one.rows.forEach((members, r) => {
        for (const { item } of members)
          depths[row + r] = Math.max(depths[row + r] as number, item.size)
      })
    }
    const tops: number[] = []
    let z = top
    depths.forEach((depth, r) => {
      if (starts.has(r)) z += spacing.laneGap - spacing.gap
      tops.push(z)
      z += depth + spacing.rowGap
    })
    top = z - spacing.rowGap + spacing.street
    return { depths, shelf, tops }
  })
  return {
    depth: top - spacing.street,
    laidOut,
    width: Math.max(...shelves.map((shelf) => shelf.used)),
  }
}

/** Where each building stands on one board: the placing loop of layoutNeighbourhoods. */
function spotsOf(board: ReturnType<typeof measureShelves>) {
  const spots: Record<string, { x: number; z: number }> = {}
  for (const { shelf, depths, tops } of board.laidOut) {
    for (const { laid: one, stack, row } of shelf.held) {
      const centre = stack.left + stack.width / 2 - shelf.used / 2
      one.rows.forEach((members, r) => {
        const south = (tops[row + r] as number) + (depths[row + r] as number)
        for (const { item, x } of members)
          spots[item.id] = { x: centre + x, z: south - item.size / 2 }
      })
    }
  }
  return spots
}

export type Try = {
  limit: number
  width: number
  depth: number
  score: number
  /** Where each building stands on this board. */
  spots: Record<string, { x: number; z: number }>
}

/** Every board layoutNeighbourhoods weighs, in the order it weighs them, and the winner. */
export function everyTry(
  clusters: readonly Cluster[],
  spacing: Spacing
): { tries: Try[]; best: number } {
  const laid = clusters.map((cluster) => layCluster(cluster, spacing))
  const narrowest = Math.max(...laid.map((one) => one.width))
  const widest =
    laid.reduce((sum, one) => sum + one.width, 0) +
    spacing.laneGap * (laid.length - 1)
  const tries: Try[] = []
  let best = 0
  for (let i = 0; i <= TRIES; i++) {
    const limit = narrowest + ((widest - narrowest) * i) / TRIES
    const board = measureShelves(shelve(laid, limit, spacing), spacing)
    const aspect = board.width / Math.max(board.depth, 1e-9)
    const score =
      board.width * board.depth * (1 + Math.abs(Math.log(aspect / TARGET_ASPECT)) / 2)
    tries.push({ depth: board.depth, limit, score, spots: spotsOf(board), width: board.width })
    if (score < (tries[best] as Try).score - 1e-9) best = i
  }

  const real = layoutNeighbourhoods(clusters, spacing)
  const mine = (tries[best] as Try).spots
  for (const [id, spot] of real) {
    const copy = mine[id]
    if (!copy || Math.abs(copy.x - spot.x) > 1e-6 || Math.abs(copy.z - spot.z) > 1e-6)
      throw new Error(
        "deck/parts/layout-tries.ts no longer matches layoutNeighbourhoods. Copy the search again."
      )
  }
  return { best, tries }
}
