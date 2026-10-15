import { graphBytes, loadGraph, slimGraph } from "@/deck/city/fixtures"
import { cityDistricts } from "@/deck/city/schema-city"
import { type Packet, PipelineView } from "@/deck/parts/pipeline-view"

/**
 * The types that ride through the pipeline, in the order they set off. Pages of
 * several shapes, then the composition the demo is about and one Element Type, so
 * the last stage lights a tower, a hollow shell and a low block in turn.
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
 * The demo schema on its way from Umbraco to the screen. Each stage shows the
 * same type as that stage holds it, computed here from medium.json with Schema
 * City's own layout code.
 */
export function Pipeline() {
  const graph = loadGraph("medium")
  const { placements } = cityDistricts(graph)

  const packets = RIDERS.map((alias): Packet => {
    const node = graph.nodes.find((each) => each.alias === alias)
    const placement = placements.find((each) => each.id === node?.id)
    if (!(node && placement)) throw new Error(`${alias} is gone from medium.json`)
    return {
      alias,
      id: node.id,
      name: node.name,
      x: placement.position.x,
      z: placement.position.z,
    }
  })

  return (
    <PipelineView
      bytes={graphBytes("medium")}
      graph={slimGraph(graph)}
      packets={packets}
      placements={placements}
    />
  )
}
