import type {
  PropertyGroup,
  SchemaDataType,
  SchemaEdge,
  SchemaGraph,
  SchemaNode,
  SchemaProperty,
  UsageReport,
} from "@/deck/city/schema-city"

/*
 * Jurassic Park's website, as InGen's agency might have built it, for the
 * examples that follow the live demo. ct-baseline is tidy, so this one is not:
 * every problem the slides point at is planted here on purpose, and the slides
 * find it by running Schema City's own checks over the graph this file builds.
 *
 * The graph is written the way SchemaGraphBuilder.cs writes one. Composed
 * properties land on every type down the composition chain, attributed to the
 * type that declares them; block and picker properties put an edge on every type
 * that carries them; a parent type is both an `inherits` and a `composition` edge.
 *
 * `parkGraph("after")` is the same park after a release weekend: three edits
 * someone planned and one nobody did. The snapshot slide compares the two.
 */

export type ParkVersion = "before" | "after"

type Editor = { name: string; editor: string; ui: string }

const EDITORS = {
  text: { name: "Textstring", editor: "Umbraco.TextBox", ui: "Umb.PropertyEditorUi.TextBox" },
  textarea: { name: "Textarea", editor: "Umbraco.TextArea", ui: "Umb.PropertyEditorUi.TextArea" },
  rte: { name: "Richtext editor", editor: "Umbraco.RichText", ui: "Umb.PropertyEditorUi.Tiptap" },
  image: { name: "Image Media Picker", editor: "Umbraco.MediaPicker3", ui: "Umb.PropertyEditorUi.MediaPicker" },
  date: { name: "Date Picker with time", editor: "Umbraco.DateTime", ui: "Umb.PropertyEditorUi.DatePicker" },
  toggle: { name: "True/false", editor: "Umbraco.TrueFalse", ui: "Umb.PropertyEditorUi.Toggle" },
  number: { name: "Numeric", editor: "Umbraco.Integer", ui: "Umb.PropertyEditorUi.Integer" },
  decimal: { name: "Decimal", editor: "Umbraco.Decimal", ui: "Umb.PropertyEditorUi.Decimal" },
  dropdown: { name: "Dropdown", editor: "Umbraco.DropDown.Flexible", ui: "Umb.PropertyEditorUi.Dropdown" },
  link: { name: "Multi URL Picker", editor: "Umbraco.MultiUrlPicker", ui: "Umb.PropertyEditorUi.MultiUrlPicker" },
} satisfies Record<string, Editor>

type Plain = keyof typeof EDITORS

/** A block list or a picker, which point at other types by alias. */
type Pointing = {
  name: string
  kind: "blocks" | "picker"
  /** Aliases of types in this file, or `missing:` for a key nothing has any more. */
  targets: string[]
}

type Prop = {
  alias: string
  name: string
  type: Plain | Pointing
  mandatory?: boolean
  cultures?: boolean
}

type Group = { tab: string; group: string; props: Prop[] }

type TypeSpec = {
  alias: string
  name: string
  icon: string
  folder: string
  element?: boolean
  root?: boolean
  cultures?: boolean
  template?: boolean
  /** The parent type, which Umbraco records as a composition as well. */
  parent?: string
  compose?: string[]
  children?: string[]
  groups: Group[]
}

const p = (
  alias: string,
  name: string,
  type: Prop["type"],
  extra: Omit<Prop, "alias" | "name" | "type"> = {}
): Prop => ({ alias, name, type, ...extra })

const blocks = (name: string, ...targets: string[]): Pointing => ({ kind: "blocks", name, targets })
const picker = (name: string, ...targets: string[]): Pointing => ({ kind: "picker", name, targets })

/** Mr. DNA's video block. The Element Type was deleted; the exhibits still list it. */
const MR_DNA = "missing:mrDnaVideo"

const PADDOCKS = [
  "raptorPen",
  "tyrannosaurusPaddock",
  "brachiosaurusPaddock",
  "triceratopsPaddock",
  "dilophosaurusPaddock",
  "gallimimusValley",
]

function types(version: ParkVersion): TypeSpec[] {
  const after = version === "after"
  return [
    // Compositions
    {
      alias: "pageMeta",
      name: "Page Meta",
      icon: "icon-search",
      folder: "Compositions",
      cultures: true,
      groups: [
        {
          tab: "SEO",
          group: "Meta",
          props: [
            p("metaTitle", "Meta title", "text", { cultures: true }),
            p("metaDescription", "Meta description", "textarea", { cultures: true }),
            p("ogImage", "Share image", "image"),
          ],
        },
      ],
    },
    {
      alias: "paddockSecurity",
      name: "Paddock Security",
      icon: "icon-lock",
      folder: "Compositions",
      groups: [
        {
          tab: "Security",
          group: "Fence",
          props: [
            p("fenceVoltage", "Fence voltage", "number", { mandatory: true }),
            p("gateStatus", "Gate status", "dropdown", { mandatory: true }),
            p("containmentLevel", "Containment level", "dropdown"),
            p("lastInspection", "Last inspection", "date"),
            // Added over the weekend, under the name the alias check left free.
            ...(after ? [p("fenceAlarm", "Fence alarm", "toggle")] : []),
          ],
        },
      ],
    },
    {
      alias: "parkSystems",
      name: "Park Systems",
      icon: "icon-power",
      folder: "Compositions",
      groups: [
        {
          tab: "Systems",
          group: "Power",
          props: [
            p("powerGrid", "Power grid", "dropdown"),
            // Nobody planned this one.
            ...(after ? [] : [p("doorLocks", "Door locks", "toggle", { mandatory: true })]),
            p("backupGenerator", "Backup generator", "toggle"),
          ],
        },
      ],
    },
    {
      alias: "speciesProfile",
      name: "Species Profile",
      icon: "icon-dna",
      folder: "Compositions",
      groups: [
        {
          tab: "Species",
          group: "Profile",
          props: [
            p("species", "Species", "text", { mandatory: true }),
            p("period", "Period", "dropdown"),
            p("diet", "Diet", "dropdown"),
            p("heightMetres", "Height (m)", "decimal"),
            p("dnaSource", "DNA source", "textarea"),
          ],
        },
      ],
    },
    {
      alias: "feedingSchedule",
      name: "Feeding Schedule",
      icon: "icon-food",
      folder: "Compositions",
      groups: [
        {
          tab: "Care",
          group: "Feeding",
          props: [
            p("feedingTime", "Feeding time", "text"),
            p("feedType", "Feed type", "dropdown"),
          ],
        },
      ],
    },

    // The site
    {
      alias: "home",
      name: "Jurassic Park",
      icon: "icon-home",
      folder: "Pages",
      root: true,
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      children: ["visitorCenter", "paddocks", "tours", "attractions", "newsroom"],
      groups: [
        {
          tab: "Content",
          group: "Welcome",
          props: [
            p("heading", "Heading", "text", { cultures: true, mandatory: true }),
            p("intro", "Introduction", "textarea", { cultures: true }),
            p("heroImage", "Hero image", "image"),
          ],
        },
        {
          tab: "Content",
          group: "Blocks",
          props: [
            p("homeBlocks", "Blocks", blocks("Home Blocks", "heroBanner", "quote", "imageGallery", "mapPin"), {
              cultures: true,
            }),
          ],
        },
      ],
    },
    {
      alias: "visitorCenter",
      name: "Visitor Center",
      icon: "icon-store",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta", "parkSystems"],
      children: ["restaurant", "giftShop"],
      groups: [
        {
          tab: "Content",
          group: "Exhibits",
          props: [
            p("heading", "Heading", "text", { cultures: true }),
            p("openingHours", "Opening hours", "text"),
            p("exhibits", "Exhibits", blocks("Exhibit Blocks", "heroBanner", "imageGallery", MR_DNA, "richText"), {
              cultures: true,
            }),
          ],
        },
      ],
    },
    {
      alias: "restaurant",
      name: "Restaurant",
      icon: "icon-coffee",
      folder: "Pages",
      // Invariant, yet Page Meta varies by culture, so its title and description
      // keep one value for every language.
      template: true,
      compose: ["pageMeta"],
      groups: [
        {
          tab: "Content",
          group: "Menu",
          props: [
            p("chef", "Chef", "text"),
            p("menu", "Menu", "rte"),
          ],
        },
      ],
    },
    {
      alias: "giftShop",
      name: "Gift Shop",
      icon: "icon-shopping-basket",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      children: after ? ["merchProduct", "merchBundle"] : ["merchProduct"],
      groups: [{ tab: "Content", group: "Shop", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "merchProduct",
      name: "Merch Product",
      icon: "icon-tag",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      groups: [
        {
          tab: "Product",
          group: "Details",
          props: [
            p("productName", "Name", "text", { cultures: true, mandatory: true }),
            p("price", "Price", "decimal", { mandatory: true }),
            p("sku", "SKU", "text"),
            p("productImage", "Image", "image"),
            p("sizes", "Sizes", "dropdown"),
          ],
        },
      ],
    },
    ...(after
      ? [
          {
            alias: "merchBundle",
            name: "Merch Bundle",
            icon: "icon-box",
            folder: "Pages",
            cultures: true,
            template: true,
            compose: ["pageMeta"],
            groups: [
              {
                tab: "Product",
                group: "Bundle",
                props: [
                  p("bundleName", "Name", "text", { cultures: true }),
                  p("products", "Products", picker("Product picker", "merchProduct")),
                  p("price", "Price", "decimal"),
                ],
              },
            ],
          } satisfies TypeSpec,
        ]
      : []),
    {
      alias: "paddocks",
      name: "Paddocks",
      icon: "icon-map",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      children: PADDOCKS,
      groups: [{ tab: "Content", group: "Map", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "paddock",
      name: "Paddock",
      icon: "icon-fence",
      folder: "Paddocks",
      cultures: true,
      compose: ["paddockSecurity", "parkSystems", "pageMeta"],
      groups: [
        {
          tab: "Content",
          group: "Overview",
          props: [
            p("heading", "Heading", "text", { cultures: true, mandatory: true }),
            p("intro", "Introduction", "textarea", { cultures: true }),
            p("heroImage", "Hero image", "image"),
            p("notices", "Notices", blocks("Paddock Blocks", "safetyNotice", "imageGallery")),
          ],
        },
      ],
    },
    paddockType("raptorPen", "Raptor Pen", [
      p("packSize", "Pack size", "number"),
      // Muldoon's own, before anyone thought of the composition.
      p("alarm", "Alarm", "toggle"),
      p("feedingCrane", "Feeding crane", "toggle"),
    ]),
    paddockType("tyrannosaurusPaddock", "T. rex Paddock", [
      p("goatFeeder", "Goat feeder", "toggle"),
    ]),
    paddockType("brachiosaurusPaddock", "Brachiosaurus Paddock", [p("treeHeight", "Tree height", "decimal")]),
    paddockType("triceratopsPaddock", "Triceratops Paddock", [p("vetNotes", "Vet notes", "rte")]),
    paddockType("dilophosaurusPaddock", "Dilophosaurus Paddock", [p("spitRange", "Spit range", "decimal")]),
    paddockType("gallimimusValley", "Gallimimus Valley", [p("flockSize", "Flock size", "number")]),
    {
      alias: "tours",
      name: "Tours",
      icon: "icon-car",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      children: ["tourRoute"],
      groups: [{ tab: "Content", group: "Tours", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "tourRoute",
      name: "Tour Route",
      icon: "icon-navigation",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      groups: [
        {
          tab: "Content",
          group: "Route",
          props: [
            p("heading", "Heading", "text", { cultures: true }),
            p("duration", "Duration (min)", "number"),
            p("vehicle", "Vehicle", picker("Vehicle picker", "tourVehicle")),
            p(
              "stops",
              "Stops",
              after ? blocks("Tour Stops", "tourStop", "mapPin") : blocks("Tour Stops", "tourStop"),
              { cultures: true }
            ),
          ],
        },
      ],
    },
    {
      alias: "attractions",
      name: "Attractions",
      icon: "icon-ticket",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      children: ["jungleRiverCruise", "pettingZoo"],
      groups: [{ tab: "Content", group: "List", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "jungleRiverCruise",
      name: "Jungle River Cruise",
      icon: "icon-anchor",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      groups: [
        {
          tab: "Content",
          group: "Ride",
          props: [p("boatCount", "Boats", "number"), p("rapidsWarning", "Rapids warning", "toggle")],
        },
      ],
    },
    {
      alias: "pettingZoo",
      name: "Petting Zoo",
      icon: "icon-hearts",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta", "paddockSecurity"],
      groups: [{ tab: "Content", group: "Zoo", props: [p("babies", "Babies on show", "number")] }],
    },
    {
      alias: "newsroom",
      name: "Newsroom",
      icon: "icon-newspaper",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      children: ["pressRelease"],
      groups: [{ tab: "Content", group: "List", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "pressRelease",
      name: "Press Release",
      icon: "icon-article",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["pageMeta"],
      groups: [
        {
          tab: "Content",
          group: "Release",
          props: [
            p("heading", "Heading", "text", { cultures: true, mandatory: true }),
            p("releaseDate", "Date", "date"),
            p("spokesperson", "Spokesperson", "text"),
            p("body", "Body", "rte", { cultures: true }),
          ],
        },
      ],
    },

    // Settings
    {
      alias: "siteSettings",
      name: "Site Settings",
      icon: "icon-settings",
      folder: "Settings",
      root: true,
      children: ["controlRoom", "tourVehicle"],
      groups: [{ tab: "Settings", group: "Site", props: [p("siteName", "Site name", "text")] }],
    },
    {
      alias: "controlRoom",
      name: "Control Room",
      icon: "icon-terminal",
      folder: "Settings",
      compose: ["parkSystems"],
      groups: [{ tab: "Systems", group: "Everything", props: controlRoomProps() }],
    },
    {
      alias: "tourVehicle",
      name: "Tour Vehicle",
      icon: "icon-car",
      folder: "Settings",
      groups: [
        {
          tab: "Vehicle",
          group: "Vehicle",
          props: [p("model", "Model", "text"), p("track", "Track", "text"), p("nightVision", "Night vision", "toggle")],
        },
      ],
    },

    // Isla Sorna, Site B. Its root flag was switched off, so nothing leads in.
    {
      alias: "islaSorna",
      name: "Isla Sorna",
      icon: "icon-globe",
      folder: "Site B",
      cultures: true,
      template: true,
      children: ["siteBLab"],
      groups: [{ tab: "Content", group: "Island", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "siteBLab",
      name: "Site B Lab",
      icon: "icon-lab",
      folder: "Site B",
      cultures: true,
      template: true,
      children: ["hatchery"],
      groups: [{ tab: "Content", group: "Lab", props: [p("labCode", "Lab code", "text")] }],
    },
    {
      alias: "hatchery",
      name: "Hatchery",
      icon: "icon-egg",
      folder: "Site B",
      cultures: true,
      template: true,
      compose: ["speciesProfile", "paddockSecurity"],
      groups: [{ tab: "Content", group: "Eggs", props: [p("clutchSize", "Clutch size", "number")] }],
    },

    // Element Types
    element("heroBanner", "Hero Banner", "icon-picture", [
      p("heading", "Heading", "text"),
      p("image", "Image", "image"),
      p("link", "Link", "link"),
    ]),
    element("richText", "Rich Text", "icon-paragraph", [p("text", "Text", "rte")]),
    element("imageGallery", "Image Gallery", "icon-pictures", [
      p("images", "Images", "image"),
      p("caption", "Caption", "text"),
    ]),
    element("quote", "Quote", "icon-quote", [p("quote", "Quote", "textarea"), p("cite", "Cite", "text")]),
    element("mapPin", "Map Pin", "icon-pin-location", [
      p("label", "Label", "text"),
      p("x", "X", "number"),
      p("y", "Y", "number"),
    ]),
    element("safetyNotice", "Safety Notice", "icon-alert", [
      p("message", "Message", "textarea", { mandatory: true }),
      p("level", "Level", "dropdown"),
    ]),
    element("tourStop", "Tour Stop", "icon-flag", [
      p("stopName", "Stop", "text"),
      p(
        "paddock",
        "Paddock",
        picker("Paddock picker", "tyrannosaurusPaddock", "brachiosaurusPaddock", "triceratopsPaddock", "dilophosaurusPaddock")
      ),
      p("narration", "Narration", "textarea"),
    ]),
    // Kept in case the animals get out. No block editor offers it.
    element("lysineContingency", "Lysine Contingency", "icon-medicine", [p("dose", "Dose", "number")]),
  ]
}

function paddockType(alias: string, name: string, props: Prop[]): TypeSpec {
  return {
    alias,
    name,
    icon: "icon-fence",
    folder: "Paddocks",
    cultures: true,
    template: true,
    parent: "paddock",
    compose: ["speciesProfile", "feedingSchedule"],
    groups: [{ tab: "Content", group: name, props }],
  }
}

function element(alias: string, name: string, icon: string, props: Prop[]): TypeSpec {
  return { alias, name, icon, folder: "Blocks", element: true, groups: [{ tab: "Content", group: name, props }] }
}

/** Twenty-two settings on one tab, whte_rbt.obj among them. */
function controlRoomProps(): Prop[] {
  const toggles = [
    ["mainPower", "Main power"],
    ["auxPower", "Auxiliary power"],
    ["securityGrid", "Security grid"],
    ["perimeterFence", "Perimeter fence"],
    ["phoneLines", "Phone lines"],
    ["motionTrackers", "Motion trackers"],
    ["tourProgram", "Tour program"],
    ["parkCameras", "Park cameras"],
    ["nightLights", "Night lights"],
    ["dockLink", "Dock link"],
    ["boatSchedule", "Boat schedule"],
    ["stormMode", "Storm mode"],
    ["eastDockAccess", "East dock access"],
    ["helipadLights", "Helipad lights"],
    ["visitorCenterDoors", "Visitor Center doors"],
    ["embryoColdStorage", "Embryo cold storage"],
    ["restaurantPower", "Restaurant power"],
    ["jurassicParkSystem", "Jurassic Park system"],
    ["shutdownSequence", "Shutdown sequence"],
    ["animalCount", "Animal count"],
    ["kernelVersion", "Kernel version"],
  ] as const
  return [
    ...toggles.map(([alias, name]) => p(alias, name, "toggle")),
    p("whteRbtObj", "whte_rbt.obj", "textarea"),
  ]
}

// Ids are made from the alias, as stable as a key, so the before and after graphs
// match type for type and every build draws the same city.
function hash(text: string, seed: number): number {
  let h = 2166136261 ^ seed
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function guid(text: string): string {
  const hex = [1, 2, 3, 4].map((seed) => hash(text, seed).toString(16).padStart(8, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

const idOf = (alias: string) => guid(`type:${alias.replace(/^missing:/, "")}`)
const camel = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())

export function parkGraph(version: ParkVersion = "before"): SchemaGraph {
  const specs = types(version)
  const byAlias = new Map(specs.map((spec) => [spec.alias, spec]))
  const folderNames = [...new Set(specs.map((spec) => spec.folder))].sort()
  const folders = folderNames.map((name) => ({ id: guid(`folder:${name}`), name, parentId: null }))
  const dataTypes = new Map<string, SchemaDataType>()
  const edges: SchemaEdge[] = []

  const dataTypeOf = (prop: Prop) => {
    const pointing = typeof prop.type === "object" ? prop.type : null
    const plain = pointing ? null : EDITORS[prop.type as Plain]
    const name = pointing ? pointing.name : (plain as Editor).name
    const editor = pointing
      ? pointing.kind === "blocks"
        ? { editor: "Umbraco.BlockList", ui: "Umb.PropertyEditorUi.BlockList" }
        : { editor: "Umbraco.MultiNodeTreePicker", ui: "Umb.PropertyEditorUi.ContentPicker" }
      : (plain as Editor)
    const id = guid(`dataType:${name}`)
    const targets = (pointing?.targets ?? []).map((alias) => ({
      nodeId: idOf(alias),
      role: pointing?.kind === "picker" ? ("picker" as const) : ("content" as const),
    }))
    if (!dataTypes.has(id))
      dataTypes.set(id, {
        id,
        name,
        editorAlias: editor.editor,
        editorUiAlias: editor.ui,
        folder: pointing ? (pointing.kind === "blocks" ? "Blocks" : "Pickers") : null,
        targets,
        otherUses: 0,
        isBuiltIn: !pointing,
      })
    return { id, name, editor, targets }
  }

  const toProperty = (prop: Prop, hostId: string, from: string | null): SchemaProperty => {
    const dataType = dataTypeOf(prop)
    for (const target of dataType.targets)
      edges.push(
        target.role === "picker"
          ? { kind: "reference", from: hostId, to: target.nodeId, propertyAlias: prop.alias }
          : { kind: "block", from: hostId, to: target.nodeId, propertyAlias: prop.alias, role: "content" }
      )
    return {
      alias: prop.alias,
      name: prop.name,
      dataTypeId: dataType.id,
      dataTypeName: dataType.name,
      editorAlias: dataType.editor.editor,
      editorUiAlias: dataType.editor.ui,
      mandatory: prop.mandatory ?? false,
      variesByCulture: prop.cultures ?? false,
      fromCompositionId: from,
      targets: dataType.targets,
    }
  }

  // A tab holding its groups, the shape Umbraco has used since 14. Composed ones
  // keep the composition's group keys, which is how the Editor view merges them.
  const toGroups = (owner: TypeSpec, hostId: string, from: string | null): PropertyGroup[] =>
    owner.groups.flatMap((group) => {
      const tab = camel(group.tab)
      return [
        {
          id: guid(`group:${owner.alias}:${tab}`),
          alias: tab,
          name: group.tab,
          type: "Tab" as const,
          parentAlias: null,
          fromCompositionId: from,
          properties: [],
        },
        {
          id: guid(`group:${owner.alias}:${tab}/${camel(group.group)}`),
          alias: `${tab}/${camel(group.group)}`,
          name: group.group,
          type: "Group" as const,
          parentAlias: tab,
          fromCompositionId: from,
          properties: group.props.map((prop) => toProperty(prop, hostId, from)),
        },
      ]
    })

  const directCompositions = (spec: TypeSpec) => [...(spec.parent ? [spec.parent] : []), ...(spec.compose ?? [])]

  /** Every composition down the chain, direct ones first, each once. */
  const chain = (spec: TypeSpec) => {
    const ordered: TypeSpec[] = []
    const queue = directCompositions(spec)
    for (let alias = queue.shift(); alias; alias = queue.shift()) {
      const next = byAlias.get(alias)
      if (!next || ordered.includes(next)) continue
      ordered.push(next)
      queue.push(...directCompositions(next))
    }
    return ordered
  }

  const nodes: SchemaNode[] = specs.map((spec) => {
    const id = idOf(spec.alias)
    const own = toGroups(spec, id, null)
    const composed = chain(spec).flatMap((composition) => toGroups(composition, id, idOf(composition.alias)))
    const count = (groups: PropertyGroup[]) => groups.reduce((sum, group) => sum + group.properties.length, 0)
    for (const child of spec.children ?? []) edges.push({ kind: "allowedChild", from: id, to: idOf(child) })
    for (const composition of directCompositions(spec))
      edges.push({ kind: "composition", from: id, to: idOf(composition) })
    if (spec.parent) edges.push({ kind: "inherits", from: id, to: idOf(spec.parent) })
    return {
      id,
      alias: spec.alias,
      name: spec.name,
      icon: spec.icon,
      iconColor: null,
      folderId: guid(`folder:${spec.folder}`),
      isElement: spec.element ?? false,
      allowedAsRoot: spec.root ?? false,
      variesByCulture: spec.cultures ?? false,
      variesBySegment: false,
      description: null,
      groups: [...own, ...composed],
      ownPropertyCount: count(own),
      composedPropertyCount: count(composed),
      templates: spec.template
        ? [{ id: guid(`template:${spec.alias}`), alias: spec.alias, name: spec.name, isDefault: true }]
        : [],
    }
  })

  const unique = new Map(edges.map((edge) => [JSON.stringify(edge), edge]))
  return {
    generatedAt: version === "after" ? "2026-10-19T08:00:00Z" : "2026-10-16T08:00:00Z",
    folders,
    nodes: nodes.sort((a, b) => a.alias.localeCompare(b.alias)),
    edges: [...unique.values()],
    dataTypes: [...dataTypes.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/** Content items per type. Isla Sorna's lab still holds what was made before the cut. */
const CONTENT: Record<string, number> = {
  home: 1,
  visitorCenter: 1,
  restaurant: 1,
  giftShop: 1,
  merchProduct: 128,
  paddocks: 1,
  raptorPen: 1,
  tyrannosaurusPaddock: 1,
  brachiosaurusPaddock: 2,
  triceratopsPaddock: 1,
  dilophosaurusPaddock: 1,
  gallimimusValley: 1,
  tours: 1,
  tourRoute: 3,
  attractions: 1,
  jungleRiverCruise: 0,
  pettingZoo: 1,
  newsroom: 1,
  pressRelease: 46,
  siteSettings: 1,
  controlRoom: 1,
  tourVehicle: 6,
  islaSorna: 1,
  siteBLab: 2,
  hatchery: 4,
}

export function parkUsage(): UsageReport {
  const block = (dataType: string, values: number, elements: [alias: string, content: number][]) => ({
    dataTypeId: guid(`dataType:${dataType}`),
    values,
    items: values,
    elements: elements.map(([alias, content]) => ({
      elementTypeId: idOf(alias),
      content,
      settings: 0,
      items: Math.min(values, content),
    })),
  })
  return {
    generatedAt: "2026-10-16T08:00:00Z",
    byType: Object.fromEntries(
      Object.entries(CONTENT).map(([alias, total]) => [
        idOf(alias),
        {
          total,
          published: total,
          drafts: 0,
          trashed: 0,
          rootInstances: alias === "home" || alias === "siteSettings" ? 1 : 0,
          cultures: total > 0 ? ["en-US", "es-CR"] : [],
          lastEdited: total > 0 ? "1993-06-11T09:00:00Z" : null,
        },
      ])
    ),
    references: [{ fromType: idOf("tourRoute"), toType: idOf("tourVehicle"), count: 3 }],
    blocks: {
      partial: false,
      valuesRead: 64,
      unreadable: 0,
      byDataType: [
        block("Exhibit Blocks", 1, [["heroBanner", 1], ["imageGallery", 3], ["mrDnaVideo", 12], ["richText", 4]]),
        block("Home Blocks", 1, [["heroBanner", 1], ["quote", 1], ["imageGallery", 1]]),
        block("Paddock Blocks", 7, [["safetyNotice", 9], ["imageGallery", 7]]),
        block("Tour Stops", 3, [["tourStop", 14]]),
      ],
    },
  }
}

/** The id the graph gives a type, for a slide that names one. */
export const parkId = idOf
