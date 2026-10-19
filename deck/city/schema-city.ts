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
export {
  buildFloorCells,
  buildPlazaCells,
  connectionsOf,
  type FloorCell,
  type FloorCellKind,
  WINDOW_HEIGHT,
  WINDOW_WIDTH,
  type WindowCell,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/buildings"
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
