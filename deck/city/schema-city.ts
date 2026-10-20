/*
 * Schema City's pure layout, building and model modules, from the submodule in
 * vendor/umbraco-schema-city. Nothing here touches three.js, React or the DOM, so
 * server and client parts can both import it.
 *
 * The path is spelled out under `@/` rather than through the `@schema-city/*`
 * alias, because `deckard validate` loads the deck with only `@/` mapped.
 */
import ctBaseline from "@/deck/city/ct-baseline.json"
import type { SchemaGraph } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/types"

export {
  type CityBounds,
  cityBounds,
  cityDistricts,
  type District,
  type DistrictKind,
  ISLAND_PAD,
  layoutCity,
  type Placement,
  ROW_LIMIT,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/layout/city"
export {
  type Cluster,
  layoutNeighbourhoods,
  type Spacing,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/layout/neighbourhoods"
export { structureGroups } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/layout/structure"
import {
  buildFloorCells as buildVendorCells,
  type WindowCell,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/buildings"

export {
  buildPlazaCells,
  connectionsOf,
  type FloorCell,
  type FloorCellKind,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  type WindowCell,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/buildings"

/** How far the package stands a window off its wall. */
const WINDOW_STANDOFF = 0.012

/**
 * The package's cells, with each floor's windows dealt out wall by wall. The
 * pinned release spaces a row evenly around the whole slab, so a window can
 * land on a corner and straddle it. This is the same layout as the fix in
 * thebuilder/umbraco-schema-city, applied to the windows the release returns.
 * Drop it once the submodule is bumped past that fix.
 */
export function buildFloorCells(...args: Parameters<typeof buildVendorCells>) {
  const built = buildVendorCells(...args)
  const centres = new Map(args[1].map((p) => [p.id, p.position]))
  const floors = new Map<string, WindowCell[]>()
  for (const window of built.windows) {
    const key = `${window.buildingId}:${window.cy}`
    floors.set(key, [...(floors.get(key) ?? []), window])
  }
  const windows = [...floors.values()].flatMap((row) => {
    const centre = centres.get(row[0].buildingId)
    if (!centre) {
      return row
    }
    const half = Math.max(
      Math.abs(row[0].cx - centre.x),
      Math.abs(row[0].cz - centre.z)
    )
    const width = (half - WINDOW_STANDOFF) * 2
    const count = row.length
    const first = (wall: number) => Math.ceil((wall * count) / 4)
    return row.map((window, i) => {
      const wall = Math.floor((i * 4) / count)
      const along = ((i - first(wall) + 0.5) / (first(wall + 1) - first(wall)) - 0.5) * width
      const [x, z, rotY] = (
        [
          [along, half, 0],
          [half, -along, Math.PI / 2],
          [-along, -half, Math.PI],
          [-half, along, -Math.PI / 2],
        ] as const
      )[wall]
      return { ...window, cx: centre.x + x, cz: centre.z + z, rotY }
    })
  })
  return { ...built, windows }
}
export type { BuildingPalette } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/building-paint"
export type {
  PropertyGroup,
  SchemaDataType,
  SchemaEdge,
  SchemaGraph,
  SchemaNode,
  SchemaProperty,
  UsageReport,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/types"
export {
  FINDING_LABEL,
  type Finding,
  findFindings,
  findingGroups,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/findings"
export {
  aliasImpact,
  impactOf,
  pathWords,
  totalsLine,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/impact"
export { compareSchemas } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/snapshots"
export {
  type ChangeKind,
  causeLine,
  changeSummary,
  groupChanges,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/changes"

/**
 * The ct-baseline site the live demo opens, 32 Document Types as Schema City
 * exported them on 17 Oct 2026. The build-up defaults to it, so the city on
 * the slides is the city the room sees in the backoffice a few minutes later.
 * Re-export into ct-baseline.json if the site
 * changes before the talk.
 */
export const demoGraph = ctBaseline.graph as unknown as SchemaGraph
