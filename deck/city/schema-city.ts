/*
 * Schema City's pure layout, building and model modules, from the submodule in
 * vendor/umbraco-schema-city. Nothing here touches three.js, React or the DOM, so
 * server and client parts can both import it.
 *
 * The path is spelled out under `@/` rather than through the `@schema-city/*`
 * alias, because `deckard validate` loads the deck with only `@/` mapped.
 */
import medium from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/dev/fixtures/medium.json"
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
  type WindowCell,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/buildings"
export type { BuildingPalette } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/building-paint"
export type {
  SchemaEdge,
  SchemaGraph,
  SchemaNode,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/types"

/** Where the client lives inside the submodule, for code read off disk. */
export const CLIENT_DIR = "vendor/umbraco-schema-city/src/SchemaCity/Client"

/**
 * The client's medium fixture, 86 Document Types exported from the seeded demo
 * site, as a default the client widgets can import directly. Swap in a
 * ct-baseline export by passing a different graph to each widget.
 */
export const demoGraph = medium as unknown as SchemaGraph
