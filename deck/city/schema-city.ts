/*
 * Schema City's pure layout, building and model modules, from the submodule in
 * vendor/umbraco-schema-city. Nothing here touches three.js, React or the DOM, so
 * server and client parts can both import it.
 *
 * The path is spelled out under `@/` rather than through the `@schema-city/*`
 * alias, because `deckard validate` loads the deck with only `@/` mapped.
 */
export {
  type CityBounds,
  cityBounds,
  cityDistricts,
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
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/buildings"
export type { BuildingPalette } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/building-paint"
export type {
  SchemaGraph,
  SchemaNode,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/types"

/** Where the client lives inside the submodule, for code read off disk. */
export const CLIENT_DIR = "vendor/umbraco-schema-city/src/SchemaCity/Client"
