import {
  aliasImpact,
  findFindings,
  impactOf,
  type SchemaGraph,
  totalsLine,
} from "@/deck/city/schema-city"
import { siteGraph, siteId, siteUsage } from "@/deck/examples/site-schema"

/*
 * What Schema City says about the site, worked out once on the server with the
 * package's own model code. Every type, count and clash a slide shows comes from
 * here, not from the slide, so the examples cannot claim more than the tool
 * does. The slides receive plain arrays, since a Map does not cross to a client
 * component.
 */

const before = siteGraph()
const usage = siteUsage()
const nameOf = (graph: SchemaGraph) => {
  const names = new Map(graph.nodes.map((node) => [node.id, node.name]))
  return (id: string) => names.get(id) ?? id
}

export const siteCity = (): SchemaGraph => before

/** The property someone wants to add to Location Details. */
const PLANNED_ALIAS = "phone"

export type DeletedBlockExample = {
  host: string
  hostName: string
  /** The Element Types the host's block list still resolves. */
  targets: { id: string; name: string }[]
  /** The key the block list keeps for the Element Type that was deleted. */
  missing: string
  missingName: string
  /** Blocks of the deleted type that content still stores. */
  stored: number
  summary: string
}

/** Step 0 is the site, 1 the block list's links, 2 the one that runs to nothing, 3 what content still holds. */
export const DELETED_BLOCK_STEPS = 4

export function deletedBlockExample(): DeletedBlockExample {
  const finding = findFindings(before, usage).find((each) => each.kind === "brokenBlock")
  const host = finding?.nodeId ?? ""
  const name = nameOf(before)
  const known = new Set(before.nodes.map((node) => node.id))
  const links = before.edges.filter((edge) => edge.kind === "block" && edge.from === host)
  const missing = links.find((edge) => !known.has(edge.to))?.to ?? ""
  const stored =
    usage.blocks?.byDataType
      .flatMap((dataType) => dataType.elements)
      .find((element) => element.elementTypeId === missing)?.content ?? 0
  return {
    host,
    hostName: name(host),
    targets: links.filter((edge) => known.has(edge.to)).map((edge) => ({ id: edge.to, name: name(edge.to) })),
    missing,
    // The schema no longer knows the name. The speaker does, from the deleted type.
    missingName: "Video",
    stored,
    summary: finding?.summary ?? "",
  }
}

export type AddPropertyExample = {
  start: string
  startName: string
  alias: string
  /** The types that compose it directly, the ones Umbraco lists. */
  direct: { id: string; name: string }[]
  /** Everything further along, with the type it is reached through. */
  further: { id: string; via: string }[]
  totals: string
  /** The types that already have a property with the alias. */
  collisions: { id: string; name: string }[]
}

/** Step 0 is the site, 1 Umbraco's list, 2 the whole reach, 3 the clash. */
export const ADD_PROPERTY_STEPS = 4

export function addPropertyExample(): AddPropertyExample {
  const start = siteId("locationDetails")
  const name = nameOf(before)
  const impact = impactOf(before, start, {}, usage)
  const rows = impact.groups.flatMap((group) => group.rows)
  const direct = rows.filter((row) => row.direct)
  const further = rows.filter((row) => !row.direct)
  const check = aliasImpact(before, start, PLANNED_ALIAS, usage)
  return {
    start,
    startName: name(start),
    alias: PLANNED_ALIAS,
    direct: direct.map((row) => ({ id: row.id, name: row.name })),
    further: further.map((row) => {
      const path = row.paths[0] ?? []
      return { id: row.id, via: path.at(-2)?.id ?? start }
    }),
    totals: totalsLine(impact.types, impact.content),
    collisions: (check?.collisions ?? []).map((collision) => ({ id: collision.id, name: collision.name })),
  }
}
