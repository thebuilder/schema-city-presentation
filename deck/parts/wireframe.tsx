import { loadGraph, slimGraph } from "@/deck/city/fixtures"
import {
  layoutCity,
} from "@/deck/city/schema-city"
import { highlight } from "@/deck/city/highlight"
import { WireframeView } from "@/deck/parts/wireframe-view"

/** The busiest page in the demo schema: seven groups over three tabs, 29 properties. */
const CLOSE_UP = "landingPage"

/*
 * The two ideas the slide stands on, cut down from BuildingMeshes.tsx: every part
 * of every building is an instance of one box, and the glow is a few lines patched
 * into that box's fragment shader rather than a post pass.
 */
const INSTANCING = `
// one box mesh, one draw call,
// one matrix per building part
parts.forEach((part, i) => {
  place(part, scratch)
  mesh.setMatrixAt(i, scratch.matrix)
})`

const GLOW = `
// how far to the nearest edge
float edge = edgeGap(vBoxLocal);
float line = 1.0 - smoothstep(
  0.0, EDGE_WIDTH, edge);
glow += colour * (body + rim * line);`

/*
 * Why it stays fast. Three steps: one building as the triangles the GPU gets, the
 * 300 type stress schema with the draw calls barely moving, then the wireframe off
 * and the glow on, which is a few lines in the fragment shader rather than a pass.
 * The numbers are read off the renderer while the slide runs.
 */
export async function Wireframe() {
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
      glow={await highlight(GLOW, "glsl")}
      instancing={await highlight(INSTANCING, "ts")}
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
