// The one place the talk reaches into the package. Every city slide draws with Schema
// City's own layout and scene modules from the submodule, so what the audience sees is
// what the backoffice draws, and a package update shows up on the slides unchanged.
// The slides take these modules because they use relative imports only. Scene.tsx
// would drag in the Inspector, which needs the client's own "@/" alias.
//
// The paths are relative on purpose. `deckard validate` loads the deck through Vite
// with only the "@/" alias, so any other path alias resolves for Next and tsc but
// fails there.
import medium from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/dev/fixtures/medium.json"
import type { SchemaGraph } from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/types"

export {
  type CityBounds,
  cityBounds,
  cityDistricts,
  type District,
  type DistrictKind,
  ISLAND_PAD,
  type Placement,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/layout/city"
export {
  type BoardPalette,
  Boards,
  SLAB_HEIGHT,
  tint,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/Boards"
export { Buildings } from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/BuildingMeshes"
export type { BuildingPalette } from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/building-paint"
export {
  buildFloorCells,
  buildPlazaCells,
  connectionsOf,
  type FloorCell,
  type FloorCellKind,
  type WindowCell,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/buildings"
export {
  buildingRiseAt,
  revealAt,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/reveal"
export { buildLinkGeometry } from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/layers"
export {
  buildRoadGeometry,
  planRoutes,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/roads"
export {
  atmosphere,
  CAMERA_FOV,
  GRID_FRAGMENT_SHADER,
  GRID_VERTEX_SHADER,
  SKY_FRAGMENT_SHADER,
  SKY_VERTEX_SHADER,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/stage"
export type {
  SchemaEdge,
  SchemaGraph,
  SchemaNode,
} from "../../vendor/umbraco-schema-city/src/SchemaCity/Client/src/model/types"

/**
 * The client's medium fixture, 86 Document Types exported from the seeded demo site.
 * Swap in a ct-baseline export by passing a different graph to each widget.
 */
export const demoGraph = medium as unknown as SchemaGraph
