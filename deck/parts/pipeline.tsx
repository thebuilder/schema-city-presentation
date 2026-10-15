import { graphBytes, loadGraph, slimGraph } from "@/deck/city/fixtures"
import {
  buildFloorCells,
  cityDistricts,
  connectionsOf,
  type SchemaGraph,
} from "@/deck/city/schema-city"
import { type Packet, PipelineView } from "@/deck/parts/pipeline-view"

/**
 * The types that ride through the pipeline, in the order they set off. Pages of
 * several shapes, then the composition the demo is about and one Element Type, so
 * the last stage draws a tower, a hollow shell and a low block in turn.
 */
const RIDERS = [
  "landingPage",
  "blogPost",
  "seoComposition",
  "home",
  "elementCard",
  "productPage",
  "dupAliasPage",
  "pressRelease",
]

/*
 * The demo schema on its way from Umbraco to the screen. Every value a packet
 * carries is computed here from medium.json with Schema City's own layout and
 * building code, so each stage shows what that stage really holds for that type.
 */
export function Pipeline() {
  const graph = loadGraph("medium")
  const { placements, districts } = cityDistricts(graph)
  const connections = connectionsOf(graph.edges)
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const districtName = new Map(districts.map((each) => [each.id, each.name]))

  const packets = RIDERS.map((alias): Packet => {
    const node = graph.nodes.find((each) => each.alias === alias)
    const placement = placements.find((each) => each.id === node?.id)
    if (!(node && placement)) throw new Error(`${alias} is gone from medium.json`)
    const built = buildFloorCells(byId, [placement], connections)
    const parts = (kinds: string[]) =>
      built.cells.filter((cell) => kinds.includes(cell.kind)).length
    return {
      alias,
      api: {
        edges: graph.edges.filter(
          (edge) => edge.from === node.id || edge.to === node.id
        ).length,
        groups: node.groups.length,
        isElement: node.isElement,
      },
      id: node.id,
      layout: {
        district: districtName.get(placement.district) ?? placement.district,
        floors: placement.floors,
        footprint: placement.footprint,
        x: placement.position.x,
        z: placement.position.z,
      },
      scene: {
        pins: parts(["pin"]),
        slabs: parts(["own", "composed", "element"]),
        windows: built.windows.length,
        other: parts(["plinth", "core", "lid", "litLid", "separator", "marker"]),
      },
      umbraco: {
        children: childrenOf(graph, node.id),
        groups: node.groups.length,
        name: node.name,
        properties: node.groups.reduce(
          (sum, group) => sum + group.properties.length,
          0
        ),
      },
    }
  })

  return (
    <PipelineView
      bytes={graphBytes("medium")}
      edges={graph.edges.length}
      graph={slimGraph(graph)}
      packets={packets}
      placements={placements}
    />
  )
}

const childrenOf = (graph: SchemaGraph, id: string) =>
  graph.edges.filter((edge) => edge.kind === "allowedChild" && edge.from === id)
    .length
