"use client"

import {
  ArrowDownToLine,
  ArrowUpDown,
  ArrowUpToLine,
  Bookmark,
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Code,
  Columns2,
  Ellipsis,
  File,
  FileText,
  Folder,
  Globe,
  Grid3x3,
  House,
  Image,
  Info,
  LayoutGrid,
  Link,
  List,
  type LucideIcon,
  Megaphone,
  Merge,
  Network,
  Plus,
  Quote,
  Search,
  Settings,
  Square,
  SquareCheck,
  ToggleRight,
  TriangleAlert,
  Users,
  Video,
  Waypoints,
  X,
} from "lucide-react"
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import ctBaseline from "@/deck/city/ct-baseline.json"
import { useStep } from "@/deck/city/use-step"
import { useStill } from "@/deck/parts/beats"
import { Words } from "@/deck/parts/line"

/*
 * The ct-baseline backoffice, rebuilt rather than screenshotted: Home page on
 * its Metadata tab, the properties Page Meta gives it. Built from parts, the
 * screen can be put together in front of the room and then taken apart to ask
 * the question. The names, aliases and editors are read from the same export
 * the city is built from, so the screen and the city agree.
 *
 * Step 0 builds the tab a property at a time, each one marked as inherited
 * from Page Meta, and the line lands once it is full. The next three steps
 * open the other places the backoffice explains Home page from: the
 * compositions it is made of, the blocks its Modules property allows, and
 * the page types allowed under it. Each one says what Home page takes in and
 * nothing about who else takes the same. The last step goes back to Metadata,
 * dims everything but Page Meta in the tree and the six marks that point at
 * it, and draws a wire from one to each of the others. Its line names the gap
 * without asking the question yet, so the T-rex after it lands as the answer
 * the industry gave. The question itself waits for the demo handoff.
 */

export const BACKOFFICE_STEPS = 5

// The step each screen belongs to, after the opening build.
const COMPOSITIONS = 1
const BLOCKS = 2
const STRUCTURE = 3
const ASKED = 4

// The line under each screen, in the speaker's voice.
const CAPTIONS = [
  "This is how we see our content model.",
  "Home page is built from four other types.",
  "Ten kinds of block can go on it.",
  "Six page types can live under it.",
  "None of it shows what a change would reach.",
]

// Milliseconds between items as a panel fills, after it has slid in.
const PANEL_AT = 250
const ITEM_GAP = 90

// The backoffice is drawn at a laptop's size and scaled up, so its text is the
// size the room is used to seeing it, only larger. The scale leaves the lower
// part of the slide clear for the line and the question, so neither covers a
// property.
const SCALE = 1.35
const WIDTH = 1920 / SCALE
const HEIGHT = 1080 / SCALE

// Milliseconds from the slide's arrival.
const GROUP_AT = 400
const FIRST_ROW_AT = 600
const ROW_GAP = 180
const LINE_AT = FIRST_ROW_AT + ROW_GAP * 6 + 300

interface Property {
  alias: string
  dataTypeName: string
  name: string
}

interface Group {
  alias: string
  fromCompositionId: string | null
  name: string
  properties: Property[]
  type: string
}

interface DocType {
  alias: string
  folderId: string | null
  groups: Group[]
  icon: string
  id: string
  name: string
}

const graph = ctBaseline.graph as unknown as {
  edges: { from: string; kind: string; to: string }[]
  folders: { id: string; name: string; parentId: string | null }[]
  nodes: DocType[]
}

const homePage = graph.nodes.find((node) => node.alias === "homePage")
const pageMeta = graph.nodes.find((node) => node.alias === "pageMetaComposition")
const metadata = homePage?.groups.find(
  (group) => group.type === "Group" && group.fromCompositionId === pageMeta?.id
)

const byId = new Map(graph.nodes.map((node) => [node.id, node]))
const edgesFrom = (kind: string) =>
  graph.edges
    .filter((edge) => edge.kind === kind && edge.from === homePage?.id)
    .flatMap((edge) => byId.get(edge.to) ?? [])

// Every composition the dialog offers, and the ones Home page has ticked.
const compositionsFolder = graph.folders.find((folder) => folder.name === "Compositions")
const compositions = graph.nodes
  .filter((node) => node.folderId === compositionsFolder?.id)
  .sort((a, b) => a.name.localeCompare(b.name))
const composed = new Set(edgesFrom("composition").map((node) => node.id))

const modulesProperty = homePage?.groups
  .flatMap((group) => group.properties ?? [])
  .find((property) => property.alias === "modules") as
  | (Property & { targets?: { nodeId: string }[] })
  | undefined
const contentGroup = homePage?.groups.find(
  (group) => group.type === "Group" && group.properties?.includes(modulesProperty as Property)
)
const blocks = (modulesProperty?.targets ?? []).flatMap(
  (target) => byId.get(target.nodeId) ?? []
)
const children = edgesFrom("allowedChild")

// Umbraco draws its icons from Lucide, so these are the same shapes.
const ICONS: Record<string, LucideIcon> = {
  "icon-alert": TriangleAlert,
  "icon-article": FileText,
  "icon-bookmark": Bookmark,
  "icon-calculator": Calculator,
  "icon-bulleted-list": List,
  "icon-code": Code,
  "icon-document": File,
  "icon-folder": Folder,
  "icon-grid": Grid3x3,
  "icon-help-alt": CircleHelp,
  "icon-info": Info,
  "icon-link": Link,
  "icon-megaphone": Megaphone,
  "icon-page-down": ArrowDownToLine,
  "icon-page-up": ArrowUpToLine,
  "icon-picture": Image,
  "icon-quote": Quote,
  "icon-search": Search,
  "icon-settings": Settings,
  "icon-split": Columns2,
  "icon-users": Users,
  "icon-video": Video,
}

// The folders open in the tree, in the order Umbraco lists them.
const OPEN = ["Blocks", "Compositions", "Modules"]
const SHOWN = ["Blocks", "Components", "Compositions", "Modules", "Navigation"]

function treeOf() {
  const elements = graph.folders.find((folder) => folder.name === "Elements")
  return SHOWN.map((name) => {
    const folder = graph.folders.find(
      (candidate) =>
        candidate.name === name && candidate.parentId === elements?.id
    )
    const types = graph.nodes
      .filter((node) => node.folderId === folder?.id)
      .sort((a, b) => a.name.localeCompare(b.name))
    return { name, open: OPEN.includes(name), types }
  })
}

const tree = treeOf()

const colours = {
  accent: "#1fbf94",
  accentWash: "#e3fbf3",
  border: "#e4e4e8",
  canvas: "#f4f4f6",
  editor: "#f7f7f9",
  header: "#1b264f",
  muted: "#8a8c96",
  tab: "#e8a5a0",
  text: "#2b2d33",
} as const

function useArrived(still: boolean) {
  const [arrived, setArrived] = useState(still)
  useLayoutEffect(() => {
    if (still) {
      setArrived(true)
      return
    }
    const frame = requestAnimationFrame(() => setArrived(true))
    return () => cancelAnimationFrame(frame)
  }, [still])
  return arrived
}

// The box arrives with its first word, so it never sits on screen empty while
// the line waits for the panel or the wires.
function Caption({ delay, still, text }: { delay: number; still: boolean; text: string }) {
  const arrived = useArrived(still)
  return (
    <div
      className="absolute bottom-[var(--slide-padding-block)] left-[var(--slide-padding-inline)] border border-[var(--slide-surface-border)] bg-card px-10 py-7"
      data-slide-surface=""
      style={{
        opacity: arrived ? 1 : 0,
        transition: still ? "none" : `opacity 200ms ease-out ${delay}ms`,
      }}
    >
      <p
        className="font-semibold text-[length:var(--slide-heading-size)] text-primary leading-[1.1]"
        data-slide-statement-text=""
      >
        <Words delay={delay} text={text} />
      </p>
    </div>
  )
}

// A part that slides into place `at` milliseconds after the slide arrives.
function enter(arrived: boolean, at: number, still: boolean): CSSProperties {
  return {
    opacity: arrived ? 1 : 0,
    transform: arrived ? "none" : "translateY(-10px)",
    transition: still
      ? "none"
      : `opacity 360ms ease-out ${at}ms, transform 360ms ease-out ${at}ms`,
  }
}

// Everything but Page Meta and its marks steps back for the question.
function dim(asked: boolean): CSSProperties {
  return {
    opacity: asked ? 0.28 : 1,
    transition: "opacity 600ms ease-out",
  }
}

interface Wire {
  from: { x: number; y: number }
  to: { x: number; y: number }
}

export function Backoffice() {
  const step = useStep()
  const asked = step >= ASKED
  const view =
    step === BLOCKS ? "content" : step === STRUCTURE ? "structure" : "metadata"
  const still = useStill()
  const arrived = useArrived(still)
  const root = useRef<HTMLDivElement>(null)
  const source = useRef<HTMLDivElement>(null)
  const marks = useRef<(HTMLSpanElement | null)[]>([])
  const [wires, setWires] = useState<Wire[]>([])

  // The wires join real boxes, so they are measured off the laid-out screen
  // in its own unscaled coordinates.
  useLayoutEffect(() => {
    if (!asked) {
      return
    }
    const frame = root.current?.getBoundingClientRect()
    const from = source.current?.getBoundingClientRect()
    if (!(frame && from)) {
      return
    }
    const scale = frame.width / WIDTH
    const at = (x: number, y: number) => ({
      x: (x - frame.left) / scale,
      y: (y - frame.top) / scale,
    })
    setWires(
      marks.current.flatMap((mark) => {
        const box = mark?.getBoundingClientRect()
        return box
          ? [
              {
                from: at(from.right, from.top + from.height / 2),
                to: at(box.left, box.top + box.height / 2),
              },
            ]
          : []
      })
    )
  }, [asked])

  const properties = metadata?.properties ?? []

  return (
    <section
      className="relative h-full w-full overflow-hidden"
      style={{ background: colours.canvas }}
    >
      {/* A picture of an app whose panes scroll, so its lists run on past
          their boxes the way the real ones do. */}
      <div
        // Clipped, so a panel parked off its right edge stays out of view.
        className="absolute top-0 left-0 flex flex-col overflow-hidden"
        data-slide-scroll-area=""
        ref={root}
        style={{
          color: colours.text,
          fontFamily:
            'Lato, "Helvetica Neue", -apple-system, "Segoe UI", Arial, sans-serif',
          height: HEIGHT,
          transform: `scale(${SCALE})`,
          transformOrigin: "0 0",
          width: WIDTH,
        }}
      >
        <TopBar asked={asked} />
        <div className="flex min-h-0 flex-1">
          <aside
            className="w-[200px] shrink-0 overflow-hidden border-r bg-white text-[13px]"
            style={{ borderColor: colours.border }}
          >
            <p className="px-4 pt-4 pb-3 font-bold" style={dim(asked)}>
              Structure
            </p>
            <TreeRow asked={asked} depth={0} label="Document Types" open />
            <TreeRow asked={asked} depth={1} label="Elements" open />
            {tree.map((folder) => (
              <div key={folder.name}>
                <TreeRow
                  asked={asked}
                  depth={2}
                  label={folder.name}
                  open={folder.open}
                />
                {folder.open
                  ? folder.types.map((type) =>
                      type.id === pageMeta?.id ? (
                        <PageMetaRow asked={asked} key={type.id} ref={source} />
                      ) : (
                        <TypeRow
                          asked={asked}
                          icon={type.icon}
                          key={type.id}
                          label={type.name}
                        />
                      )
                    )
                  : null}
              </div>
            ))}
          </aside>

          <main className="flex min-w-0 flex-1 flex-col">
            <EditorHeader asked={asked} view={view} />
            {view === "structure" ? (
              <StructurePanel still={still} />
            ) : (
              <Tabs
                asked={asked}
                choosing={step === COMPOSITIONS}
                view={view}
              />
            )}
            {view === "content" ? <ContentPanel still={still} /> : null}
            <div
              className="flex flex-col gap-4 px-4 pt-4"
              style={{ display: view === "metadata" ? undefined : "none" }}
            >
              <div
                className="rounded-[3px] border border-dashed py-2.5 text-center text-[13px]"
                style={{ ...dim(asked), borderColor: "#c7c8cf" }}
              >
                Add property
              </div>
              <div
                className="rounded-[3px] border bg-white"
                style={{
                  ...enter(arrived, GROUP_AT, still),
                  borderColor: colours.border,
                }}
              >
                <div
                  className="border-b px-3 py-3"
                  style={{ ...dim(asked), borderColor: colours.border }}
                >
                  <span
                    className="inline-block rounded-[3px] px-2 py-1 text-[12px]"
                    style={{ background: colours.editor, color: colours.muted }}
                  >
                    {metadata?.name}
                  </span>
                </div>
                {properties.map((property, index) => (
                  <div
                    className="flex gap-4 px-4 py-1.5"
                    key={property.alias}
                    style={enter(
                      arrived,
                      FIRST_ROW_AT + ROW_GAP * index,
                      still
                    )}
                  >
                    <div
                      className="flex w-[300px] shrink-0 justify-between gap-3 text-[13px]"
                      style={dim(asked)}
                    >
                      <span>{property.name}</span>
                      <span
                        className="truncate italic"
                        style={{ color: colours.muted }}
                      >
                        {property.alias}
                      </span>
                    </div>
                    <div
                      className="relative flex h-[34px] min-w-0 flex-1 items-center justify-between rounded-[3px] px-3 text-[11px]"
                      style={{ background: colours.editor }}
                    >
                      <span style={dim(asked)}>{property.dataTypeName}</span>
                      <InheritedMark
                        asked={asked}
                        name={pageMeta?.name ?? ""}
                        ref={(element) => {
                          marks.current[index] = element
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>

        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0"
          height={HEIGHT}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width={WIDTH}
        >
          {wires.map((wire, index) => (
            <path
              d={`M ${wire.from.x} ${wire.from.y} C ${wire.from.x + 320} ${wire.from.y}, ${wire.to.x - 320} ${wire.to.y}, ${wire.to.x} ${wire.to.y}`}
              fill="none"
              key={`${wire.to.x}:${wire.to.y}`}
              pathLength={1}
              stroke={colours.accent}
              strokeDasharray={1}
              strokeDashoffset={asked ? 0 : 1}
              strokeLinecap="round"
              strokeWidth={2}
              style={{
                filter: `drop-shadow(0 0 3px ${colours.accent})`,
                transition: still
                  ? "none"
                  : `stroke-dashoffset 900ms ease-in-out ${300 + index * 120}ms`,
              }}
            />
          ))}
        </svg>

        <Sidebar
          open={step === COMPOSITIONS}
          still={still}
          subtitle="Inherit tabs and properties from an existing Document Type."
          title="Compositions"
        >
          {compositions.map((node, index) => {
            const Icon = ICONS[node.icon] ?? File
            const ticked = composed.has(node.id)
            const Box = ticked ? SquareCheck : Square
            return (
              <div
                className="flex items-center gap-3 rounded-[3px] border px-3 py-2.5 text-[13px]"
                key={node.id}
                style={{
                  ...enter(step === COMPOSITIONS, PANEL_AT + ITEM_GAP * index, still),
                  background: ticked ? colours.accentWash : "white",
                  borderColor: ticked ? colours.accent : colours.border,
                }}
              >
                <Box
                  className="size-4"
                  style={{ color: ticked ? colours.accent : colours.muted }}
                />
                <Icon className="size-4" />
                <span className={ticked ? "font-bold" : undefined}>{node.name}</span>
              </div>
            )
          })}
        </Sidebar>

        <Sidebar
          open={step === BLOCKS}
          still={still}
          subtitle={`${modulesProperty?.dataTypeName ?? ""}, Block List`}
          title="Available blocks"
        >
          <div className="grid grid-cols-2 gap-2">
            {blocks.map((node, index) => {
              const Icon = ICONS[node.icon] ?? Boxes
              return (
                <div
                  className="flex flex-col items-center gap-2 rounded-[3px] border bg-white px-2 py-3 text-center text-[12px]"
                  key={node.id}
                  style={{
                    ...enter(step === BLOCKS, PANEL_AT + ITEM_GAP * index, still),
                    borderColor: colours.border,
                  }}
                >
                  <Icon className="size-5" style={{ color: colours.header }} />
                  {node.name}
                </div>
              )
            })}
          </div>
        </Sidebar>
      </div>

      {/* A new key per screen, so each caption switches on afresh. */}
      <Caption
        // The last line waits for the wires to reach their marks.
        delay={step === 0 ? LINE_AT : asked ? 1400 : PANEL_AT}
        key={step}
        still={still}
        text={CAPTIONS[Math.min(step, CAPTIONS.length - 1)]}
      />

    </section>
  )
}

function TopBar({ asked }: { asked: boolean }) {
  const sections = [
    "Content",
    "Media",
    "Settings",
    "Packages",
    "Users",
    "Members",
    "Translations",
  ]
  return (
    <header
      className="flex h-[46px] shrink-0 items-center gap-6 px-4 text-[14px] text-white"
      style={{ ...dim(asked), background: colours.header }}
    >
      <span className="flex size-[26px] items-center justify-center rounded-full bg-white">
        <svg aria-hidden height="14" viewBox="0 0 14 14" width="14">
          <path
            d="M3 3.5 L3.6 8 Q4 10.5 7 10.5 Q10 10.5 10.4 8 L11 3.5"
            fill="none"
            stroke={colours.header}
            strokeLinecap="round"
            strokeWidth="2.2"
          />
        </svg>
      </span>
      {sections.map((section) => (
        <span
          className="relative flex h-full items-center"
          key={section}
          style={{ opacity: section === "Settings" ? 1 : 0.82 }}
        >
          {section}
          {section === "Settings" ? (
            <span
              className="absolute inset-x-[-6px] bottom-0 h-[3px] rounded-t"
              style={{ background: colours.tab }}
            />
          ) : null}
        </span>
      ))}
      <span className="ml-auto flex items-center gap-5">
        <span className="flex items-center gap-1.5">
          <Globe className="size-4" />
          Live
        </span>
        <Search className="size-4" />
        <CircleHelp className="size-4" />
        <span className="flex size-[28px] items-center justify-center rounded-full border-2 border-white font-bold text-[11px]">
          DS
        </span>
      </span>
    </header>
  )
}

function TreeRow({
  asked,
  depth,
  label,
  open,
}: {
  asked: boolean
  depth: number
  label: string
  open: boolean
}) {
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div
      className="flex items-center gap-1.5 py-[5px]"
      style={{ ...dim(asked), paddingLeft: 4 + depth * 12 }}
    >
      <Chevron className="size-3.5" />
      <Folder className="size-3.5" />
      <span>{label}</span>
    </div>
  )
}

function TypeRow({
  asked,
  icon,
  label,
}: {
  asked: boolean
  icon: string
  label: string
}) {
  const Icon = ICONS[icon] ?? File
  return (
    <div
      className="flex items-center gap-2 py-[5px] pl-[52px]"
      style={dim(asked)}
    >
      <Icon className="size-3.5" />
      <span className="truncate">{label}</span>
    </div>
  )
}

function PageMetaRow({
  asked,
  ref,
}: {
  asked: boolean
  ref: Ref<HTMLDivElement>
}) {
  return (
    <div className="py-[2px] pr-2 pl-[44px]">
      <div
        className="rounded-[3px] border-2 px-[6px] py-[1px]"
        ref={ref}
        style={{
          background: asked ? colours.accentWash : "transparent",
          borderColor: asked ? colours.accent : "transparent",
          boxShadow: asked ? `0 0 10px ${colours.accent}` : "none",
          transition: "all 500ms ease-out",
        }}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Code className="size-3.5" />
          <span className={asked ? "font-bold" : undefined}>Page Meta</span>
        </div>
        {/* What Page Meta is, opened under its name, since the tree only says
            so by which folder it sits in. */}
        <p
          className="overflow-hidden pl-[22px] font-bold text-[9px] uppercase tracking-wide"
          style={{
            color: colours.accent,
            maxHeight: asked ? 14 : 0,
            opacity: asked ? 1 : 0,
            transition: "max-height 400ms ease-out, opacity 400ms ease-out 200ms",
          }}
        >
          Document Type
        </p>
      </div>
    </div>
  )
}

function InheritedMark({
  asked,
  name,
  ref,
}: {
  asked: boolean
  name: string
  ref: Ref<HTMLSpanElement>
}) {
  return (
    <span
      className="flex items-center gap-1 rounded-[3px] border px-2 py-[3px] font-bold text-[10px]"
      ref={ref}
      style={{
        background: asked ? colours.accentWash : "white",
        borderColor: asked ? colours.accent : colours.border,
        boxShadow: asked ? `0 0 8px ${colours.accent}` : "none",
        color: colours.header,
        transition: "all 500ms ease-out",
      }}
    >
      <Merge className="size-3" />
      {"Inherited from "}
      <span className="underline">{name}</span>
    </span>
  )
}

function EditorHeader({ asked, view }: { asked: boolean; view: string }) {
  const views: [string, LucideIcon][] = [
    ["Design", File],
    ["Structure", Network],
    ["Settings", Settings],
    ["Templates", LayoutGrid],
    ["Relationships", Waypoints],
  ]
  return (
    <div
      className="flex h-[66px] shrink-0 items-stretch border-b bg-white"
      style={{ ...dim(asked), borderColor: colours.border }}
    >
      <div className="flex items-center px-4">
        <span
          className="flex size-[40px] items-center justify-center rounded-[3px] border"
          style={{ borderColor: colours.border }}
        >
          <House className="size-5" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 pr-3">
        <div
          className="flex items-center justify-between rounded-[3px] border px-2.5 py-1.5 text-[14px]"
          style={{ borderColor: colours.border }}
        >
          <span>{homePage?.name}</span>
          <span className="text-[12px]" style={{ color: colours.muted }}>
            {homePage?.alias}
          </span>
        </div>
        <span className="px-2.5 text-[11px]" style={{ color: colours.muted }}>
          Enter a description...
        </span>
      </div>
      <div className="flex items-center px-2">
        <Ellipsis className="size-4" />
      </div>
      {views.map(([label, Icon]) => (
        <div
          className="relative flex w-[78px] flex-col items-center justify-center gap-1 border-l text-[11px]"
          key={label}
          style={{ borderColor: colours.border }}
        >
          <Icon className="size-[18px]" />
          {label}
          {label === (view === "structure" ? "Structure" : "Design") ? (
            <span
              className="absolute inset-x-3 bottom-0 h-[3px] rounded-t"
              style={{ background: colours.tab }}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function Tabs({
  asked,
  choosing,
  view,
}: {
  asked: boolean
  choosing: boolean
  view: string
}) {
  const tabs = homePage?.groups.filter((group) => group.type === "Tab") ?? []
  // Hero adds its fields to the Content tab, so the tab is listed once.
  const names = [...new Set(tabs.map((tab) => tab.name))]
  return (
    <div
      className="flex h-[44px] shrink-0 items-stretch border-b bg-white text-[13px]"
      style={{ ...dim(asked), borderColor: colours.border }}
    >
      {names.map((name) => {
        const inherited = tabs.some(
          (tab) => tab.name === name && tab.fromCompositionId
        )
        const own = tabs.some(
          (tab) => tab.name === name && !tab.fromCompositionId
        )
        const active = name === (view === "content" ? "Content" : "Metadata")
        return (
          <div
            className="relative flex items-center gap-1.5 border-r px-5"
            key={name}
            style={{ borderColor: colours.border }}
          >
            {inherited && !own ? <Merge className="size-3.5" /> : null}
            {name}
            {active ? (
              <span
                className="absolute inset-x-3 bottom-0 h-[3px] rounded-t"
                style={{ background: colours.tab }}
              />
            ) : null}
          </div>
        )
      })}
      <div className="flex items-center gap-1 px-4">
        <Plus className="size-3.5" />
        Add tab
      </div>
      <div className="ml-auto flex items-center gap-2 px-3 text-[12px]">
        <span
          className="flex items-center gap-1 rounded-[3px] border px-2 py-1"
          style={{
            background: choosing ? colours.accentWash : "white",
            borderColor: choosing ? colours.accent : colours.border,
            boxShadow: choosing ? `0 0 8px ${colours.accent}` : "none",
            transition: "all 400ms ease-out",
          }}
        >
          <Merge className="size-3.5" />
          Compositions
        </span>
        <span
          className="flex items-center gap-1 rounded-[3px] border px-2 py-1"
          style={{ borderColor: colours.border }}
        >
          <ArrowUpDown className="size-3.5" />
          Reorder
        </span>
      </div>
    </div>
  )
}

/*
 * Umbraco opens a picker or a configuration as a panel from the right edge,
 * over the editor, so these slide in the same way.
 */
function Sidebar({
  open,
  still,
  title,
  subtitle,
  children,
}: {
  open: boolean
  still: boolean
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div
      className="absolute top-0 right-0 bottom-0 flex w-[520px] flex-col border-l shadow-[-12px_0_32px_rgba(27,38,79,0.18)]"
      style={{
        background: colours.canvas,
        borderColor: colours.border,
        transform: open ? "none" : "translateX(105%)",
        transition: still ? "none" : "transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <div
        className="flex h-[66px] shrink-0 items-center justify-between border-b bg-white px-5"
        style={{ borderColor: colours.border }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-[16px]">{title}</span>
          <span className="text-[11px]" style={{ color: colours.muted }}>
            {subtitle}
          </span>
        </div>
        <X className="size-4" />
      </div>
      <div className="flex flex-col gap-2 p-5">{children}</div>
    </div>
  )
}

/** The Content tab, down to the Modules property whose blocks the panel lists. */
function ContentPanel({ still }: { still: boolean }) {
  const arrived = useArrived(still)
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div
        className="rounded-[3px] border bg-white"
        style={{ ...enter(arrived, 0, still), borderColor: colours.border }}
      >
        <div className="border-b px-3 py-3" style={{ borderColor: colours.border }}>
          <span
            className="inline-block rounded-[3px] px-2 py-1 text-[12px]"
            style={{ background: colours.editor, color: colours.muted }}
          >
            {contentGroup?.name}
          </span>
        </div>
        <div className="flex gap-4 px-4 py-1.5">
          <div className="flex w-[300px] shrink-0 justify-between gap-3 text-[13px]">
            <span>{modulesProperty?.name}</span>
            <span className="italic" style={{ color: colours.muted }}>
              {modulesProperty?.alias}
            </span>
          </div>
          <div
            className="flex h-[34px] min-w-0 flex-1 items-center rounded-[3px] border-2 px-3 text-[11px]"
            style={{
              background: colours.accentWash,
              borderColor: colours.accent,
              boxShadow: `0 0 8px ${colours.accent}`,
            }}
          >
            {modulesProperty?.dataTypeName}
          </div>
        </div>
      </div>
    </div>
  )
}

/** The Structure view: where Home page may stand, and what may stand under it. */
function StructurePanel({ still }: { still: boolean }) {
  const arrived = useArrived(still)
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div
        className="rounded-[3px] border bg-white"
        style={{ ...enter(arrived, 0, still), borderColor: colours.border }}
      >
        <div className="border-b px-4 py-3 font-bold text-[14px]" style={{ borderColor: colours.border }}>
          Permissions
        </div>
        <div className="flex gap-6 border-b px-4 py-3 text-[13px]" style={{ borderColor: colours.border }}>
          <span className="w-[260px] shrink-0">Allow at root</span>
          <ToggleRight className="size-6" style={{ color: colours.accent }} />
        </div>
        <div className="flex gap-6 px-4 py-3 text-[13px]">
          <div className="flex w-[260px] shrink-0 flex-col gap-1">
            <span>Allowed child node types</span>
            <span className="text-[11px]" style={{ color: colours.muted }}>
              Allow content of the specified types to be created underneath content of this type.
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            {children.map((node, index) => {
              const Icon = ICONS[node.icon] ?? File
              return (
                <div
                  className="flex items-center gap-2.5 rounded-[3px] border-2 px-3 py-2"
                  key={node.id}
                  style={{
                    ...enter(arrived, PANEL_AT + ITEM_GAP * index, still),
                    background: colours.accentWash,
                    borderColor: colours.accent,
                  }}
                >
                  <Icon className="size-4" />
                  {node.name}
                </div>
              )
            })}
            <div
              className="rounded-[3px] border border-dashed py-2 text-center"
              style={{ borderColor: "#c7c8cf" }}
            >
              Choose
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
