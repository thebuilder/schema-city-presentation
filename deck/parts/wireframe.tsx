import { loadGraph, slimGraph } from "@/deck/city/fixtures"
import {
  layoutCity,
} from "@/deck/city/schema-city"
import { excerpt } from "@/deck/city/source"
import { WireframeView } from "@/deck/parts/wireframe-view"

/** The busiest page in the demo schema: seven groups over three tabs, 29 properties. */
const CLOSE_UP = "landingPage"

/*
 * Why it stays fast. Three steps: one building as the triangles the GPU gets, the
 * 300 type stress schema with the draw calls barely moving, then the wireframe off
 * and the glow on, which is a few lines in the fragment shader rather than a pass.
 * The numbers are read off the renderer while the slide runs.
 */
export function Wireframe() {
  const medium = loadGraph("medium")
  const crowd = loadGraph("pathological")
  const node = medium.nodes.find((each) => each.alias === CLOSE_UP)
  if (!node) throw new Error(`${CLOSE_UP} is gone from medium.json`)
  const placed = layoutCity(medium).find((each) => each.id === node.id)
  if (!placed) throw new Error(`${CLOSE_UP} was not placed`)

  return (
    <WireframeView
      city={{
        graph: slimGraph(crowd),
        placements: layoutCity(crowd),
        types: crowd.nodes.length,
      }}
      // The shader sits in a template literal, whose closing tick is not GLSL.
      glow={excerpt(
        "app/scene/BuildingMeshes.tsx",
        "vec3 boxGap",
        "totalEmissiveRadiance"
      ).replace(/`$/, "")}
      instancing={excerpt(
        "app/scene/BuildingMeshes.tsx",
        "items.forEach((item, i)",
        "computeBoundingSphere"
      )}
      single={{
        graph: slimGraph({
          ...medium,
          // Its own edges only, which is all its pins count.
          edges: medium.edges.filter(
            (edge) => edge.from === node.id || edge.to === node.id
          ),
          nodes: [node],
        }),
        placements: [{ ...placed, introDelay: 0, position: { x: 0, z: 0 } }],
        types: 1,
      }}
    />
  )
}
