import {
  aliasImpact,
  type ChangeKind,
  causeLine,
  changeSummary,
  compareSchemas,
  FINDING_LABEL,
  type Finding,
  findFindings,
  findingGroups,
  groupChanges,
  impactOf,
  pathWords,
  type SchemaGraph,
  totalsLine,
} from "@/deck/city/schema-city"
import { parkGraph, parkId, parkUsage } from "@/deck/examples/park-schema"

/*
 * What Schema City says about the park, worked out once on the server with the
 * package's own model code. Every sentence a slide prints from here is the app's
 * sentence, not one written for the slide, so the examples cannot claim more than
 * the tool does. The slides receive plain arrays, since a Map does not cross to a
 * client component.
 */

const before = parkGraph("before")
const usage = parkUsage()
const nameOf = (graph: SchemaGraph) => {
  const names = new Map(graph.nodes.map((node) => [node.id, node.name]))
  return (id: string) => names.get(id) ?? id
}

export const parkCity = (): SchemaGraph => before

export type FindingRow = { label: string; names: string[]; ids: string[] }
export type FindingFocus = { label: string; ids: string[]; summary: string }

export type BrokenExample = {
  rows: FindingRow[]
  /** Every type a problem finding is about. */
  lit: string[]
  /** One per step after the first, in the order the speaker walks them. */
  focus: FindingFocus[]
  notes: number
}

/** The kinds the speaker stops on, each with the types that belong in its picture. */
const WALK: { kind: Finding["kind"]; with?: Finding["kind"][]; say?: string }[] = [
  { kind: "brokenBlock" },
  { kind: "duplicateAlias" },
  // The lab's row, because it names the island the dead end is about.
  { kind: "unreachableChain", with: ["deadEnd"], say: "siteBLab" },
]

/** Step 0 lights every problem. Each step after stops on one kind of WALK. */
export const BROKEN_STEPS = WALK.length + 1

export function brokenExample(): BrokenExample {
  const findings = findFindings(before, usage)
  const name = nameOf(before)
  const problems = findings.filter((finding) => finding.severity === "problem")
  const groups = findingGroups(problems)
  const idsOf = (kinds: Finding["kind"][]) =>
    problems.filter((finding) => kinds.includes(finding.kind)).flatMap((finding) => finding.nodeId ?? [])
  return {
    rows: groups.map((group) => {
      const ids = group.rows.flatMap((row) => row.nodeId ?? [])
      return { label: FINDING_LABEL[group.kind], names: ids.map(name), ids }
    }),
    lit: [...new Set(problems.flatMap((finding) => finding.nodeId ?? []))],
    focus: WALK.map(({ kind, with: also = [], say }) => {
      const first =
        problems.find((finding) => finding.kind === kind && finding.nodeId === (say && parkId(say))) ??
        problems.find((finding) => finding.kind === kind)
      return {
        label: FINDING_LABEL[kind],
        ids: idsOf([kind, ...also]),
        summary: first?.summary ?? "",
      }
    }),
    notes: findings.length - problems.length,
  }
}

export type ReachExample = {
  start: string
  startName: string
  totals: string
  /** The start and every type it reaches. */
  lit: string[]
  /** The path that goes further than Umbraco's list, in the app's words. */
  paths: string[]
  alias: string
  collision: { ids: string[]; line: string }
}

/** Step 0 is the reach. Step 1 checks a new alias against every type it lands on. */
export const REACH_STEPS = 2

/** The property someone wants to add to Paddock Security. */
const PLANNED_ALIAS = "alarm"

export function reachExample(): ReachExample {
  const start = parkId("paddockSecurity")
  const name = nameOf(before)
  const impact = impactOf(before, start, {}, usage)
  const rows = impact.groups.flatMap((group) => group.rows)
  // Two hops through inheritance, which the composition's own list of users does
  // not show. A direct user would only repeat what Umbraco already lists.
  const paths = ["raptorPen"]
    .map((alias) => rows.find((row) => row.alias === alias))
    .flatMap((row) => (row?.paths[0] ? [pathWords(start, row.paths[0], "dependents", name)] : []))
  const check = aliasImpact(before, start, PLANNED_ALIAS, usage)
  const collisions = check?.collisions ?? []
  return {
    start,
    startName: name(start),
    totals: totalsLine(impact.types, impact.content),
    lit: [start, ...rows.map((row) => row.id)],
    paths,
    alias: PLANNED_ALIAS,
    collision: {
      ids: collisions.map((collision) => collision.id),
      line: collisions.map((collision) => `${collision.name} already has an ${PLANNED_ALIAS}`).join(", "),
    },
  }
}

export type CauseRow = {
  key: string
  name: string
  status: string
  line: string
  edits: string[]
  planned: boolean
  effects: string[]
}

export type ChangesExample = {
  summary: string
  causes: CauseRow[]
  kinds: [string, ChangeKind][]
}

/** Step 0 is the comparison. Step 1 opens the cause nobody planned. */
export const CHANGES_STEPS = 2

/** What the release plan named. The fourth cause is the one nobody wrote down. */
const PLANNED = new Set(["paddockSecurity", "merchBundle", "tourRoute"])

export function changesExample(): ChangesExample {
  const groups = groupChanges(compareSchemas(before, parkGraph("after")))
  // Planned first, the way a reviewer ticks them off, so the stranger is last.
  const causes = groups.causes
    .map((cause) => ({
      key: cause.key,
      name: cause.change.name,
      status: cause.change.status,
      line: causeLine(cause),
      // The count lines say what the property lines already do.
      edits: cause.details.map((detail) => detail.text).filter((text) => !text.includes("PropertyCount")),
      planned: PLANNED.has(cause.change.alias),
      effects: cause.effects.map((effect) => effect.change.currentId ?? effect.change.alias),
    }))
    .sort((a, b) => Number(b.planned) - Number(a.planned))
  return { summary: changeSummary(groups), causes, kinds: [...groups.kinds] }
}

/** The graph after the weekend, which the snapshot slide draws. */
export const parkCityAfter = (): SchemaGraph => parkGraph("after")
