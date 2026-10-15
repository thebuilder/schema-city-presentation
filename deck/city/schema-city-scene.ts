/*
 * The half of Schema City's scene that draws: the board and building meshes, the
 * boot timing, roads, arcs and the stage. Boards and Buildings use React hooks,
 * so they live apart from schema-city.ts, which server parts import. Importing a
 * hook user through a file a server component also loads fails the Next build.
 */
export {
  type BoardPalette,
  Boards,
  SLAB_HEIGHT,
  tint,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/Boards"
export { Buildings } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/BuildingMeshes"
export { buildLinkGeometry } from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/layers"
export {
  buildingRiseAt,
  revealAt,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/reveal"
export {
  buildRoadGeometry,
  planRoutes,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/roads"
export {
  atmosphere,
  CAMERA_FOV,
  GRID_FRAGMENT_SHADER,
  GRID_VERTEX_SHADER,
  SKY_FRAGMENT_SHADER,
  SKY_VERTEX_SHADER,
} from "@/vendor/umbraco-schema-city/src/SchemaCity/Client/src/app/scene/stage"
