import "server-only"

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { CLIENT_DIR, type SchemaGraph } from "@/deck/city/schema-city"

/*
 * The schemas Schema City is developed against, from its dev fixtures. `medium` is the
 * seeded demo site with SEO Composition and Dup Alias Page; `pathological`
 * is 300 types built to break the layout.
 *
 * Read off disk on the server, so a slide hands its client part only what it
 * computed rather than shipping a megabyte of JSON per slide.
 */
export type Fixture = "small" | "medium" | "pathological"

const cache = new Map<Fixture, { graph: SchemaGraph; bytes: number }>()

function load(name: Fixture) {
  let entry = cache.get(name)
  if (!entry) {
    const text = readFileSync(
      join(process.cwd(), CLIENT_DIR, "dev/fixtures", `${name}.json`),
      "utf8"
    )
    entry = {
      bytes: Buffer.byteLength(text),
      graph: JSON.parse(text) as SchemaGraph,
    }
    cache.set(name, entry)
  }
  return entry
}

export const loadGraph = (name: Fixture): SchemaGraph => load(name).graph

/** The size of the payload the graph endpoint answered with, in bytes. */
export const graphBytes = (name: Fixture): number => load(name).bytes

/**
 * The graph with only what the buildings read: groups, how many properties each
 * holds and which are mandatory, templates, the variance flags and the edges. A
 * third of the size, which matters because a slide's client part receives it in
 * the page payload. Names and editors are blanked rather than dropped, so it is
 * still a SchemaGraph to the code that takes one.
 */
export function slimGraph(graph: SchemaGraph): SchemaGraph {
  return {
    edges: graph.edges.map(({ kind, from, to }) => ({ from, kind, to })),
    folders: [],
    generatedAt: graph.generatedAt,
    nodes: graph.nodes.map((node) => ({
      ...node,
      description: null,
      fingerprint: undefined,
      groups: node.groups.map((group) => ({
        ...group,
        properties: group.properties.map((property) => ({
          alias: "",
          dataTypeId: "",
          editorAlias: "",
          editorUiAlias: null,
          fromCompositionId: property.fromCompositionId,
          mandatory: property.mandatory,
          name: "",
          targets: [],
          variesByCulture: false,
        })),
      })),
    })),
  }
}
