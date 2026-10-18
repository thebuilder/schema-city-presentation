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
 * An ordinary company site in two languages, for the examples that follow the
 * live demo. ct-baseline is tidy, so this one is not: every problem the slides
 * point at is planted here on purpose, and the slides find it by running Schema
 * City's own checks over the graph this file builds.
 *
 * The graph is written the way SchemaGraphBuilder.cs writes one. Composed
 * properties land on every type down the composition chain, attributed to the
 * type that declares them; block and picker properties put an edge on every type
 * that carries them; a parent type is both an `inherits` and a `composition` edge.
 */

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

/** The video block. Its Element Type was deleted; the page blocks still list it. */
const VIDEO = "missing:videoEmbed"

const LOCATIONS = ["store", "office", "warehouse", "showroom", "serviceCenter", "outlet"]

function types(): TypeSpec[] {
  return [
    // Compositions
    {
      alias: "seo",
      name: "SEO",
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
      alias: "locationDetails",
      name: "Location Details",
      icon: "icon-map-location",
      folder: "Compositions",
      groups: [
        {
          tab: "Location",
          group: "Address",
          props: [
            p("address", "Address", "textarea", { mandatory: true }),
            p("postcode", "Postcode", "text", { mandatory: true }),
            p("city", "City", "text"),
            p("mapLink", "Map link", "link"),
          ],
        },
      ],
    },
    {
      alias: "navigation",
      name: "Navigation",
      icon: "icon-navigation",
      folder: "Compositions",
      groups: [
        {
          tab: "Settings",
          group: "Navigation",
          props: [
            p("menuTitle", "Menu title", "text"),
            p("umbracoNaviHide", "Hide from menu", "toggle"),
            p("sitemapPriority", "Sitemap priority", "dropdown"),
          ],
        },
      ],
    },
    {
      alias: "teamInfo",
      name: "Team Info",
      icon: "icon-users",
      folder: "Compositions",
      groups: [
        {
          tab: "Team",
          group: "Team",
          props: [
            p("manager", "Manager", "text", { mandatory: true }),
            p("teamSize", "Team size", "number"),
            p("teamPhoto", "Team photo", "image"),
            p("languages", "Languages spoken", "dropdown"),
          ],
        },
      ],
    },
    {
      alias: "openingHours",
      name: "Opening Hours",
      icon: "icon-time",
      folder: "Compositions",
      groups: [
        {
          tab: "Location",
          group: "Hours",
          props: [p("openingHours", "Opening hours", "textarea"), p("holidayHours", "Holiday hours", "textarea")],
        },
      ],
    },

    // The site
    {
      alias: "home",
      name: "Home",
      icon: "icon-home",
      folder: "Pages",
      root: true,
      cultures: true,
      template: true,
      compose: ["seo"],
      children: ["aboutUs", "locations", "events", "services", "news"],
      groups: [
        {
          tab: "Content",
          group: "Intro",
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
            p("homeBlocks", "Blocks", blocks("Home Blocks", "hero", "quote", "imageGallery", "map"), {
              cultures: true,
            }),
          ],
        },
      ],
    },
    {
      alias: "aboutUs",
      name: "About Us",
      icon: "icon-info",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo", "navigation"],
      children: ["careers", "shop"],
      groups: [
        {
          tab: "Content",
          group: "Page",
          props: [
            p("heading", "Heading", "text", { cultures: true }),
            p("blocks", "Blocks", blocks("Page Blocks", "hero", "imageGallery", VIDEO, "richText"), {
              cultures: true,
            }),
          ],
        },
      ],
    },
    {
      alias: "careers",
      name: "Careers",
      icon: "icon-briefcase",
      folder: "Pages",
      // Invariant, yet SEO varies by culture, so its meta title and description
      // keep one value for every language.
      template: true,
      compose: ["seo"],
      groups: [
        {
          tab: "Content",
          group: "Jobs",
          props: [p("contactPerson", "Contact person", "text"), p("jobsIntro", "Intro", "rte")],
        },
      ],
    },
    {
      alias: "shop",
      name: "Shop",
      icon: "icon-shopping-basket",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      children: ["product"],
      groups: [{ tab: "Content", group: "Shop", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "product",
      name: "Product",
      icon: "icon-tag",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
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
    {
      alias: "locations",
      name: "Locations",
      icon: "icon-map",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      children: LOCATIONS,
      groups: [{ tab: "Content", group: "List", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "location",
      name: "Location",
      icon: "icon-pin-location",
      folder: "Locations",
      cultures: true,
      compose: ["locationDetails", "navigation", "seo"],
      groups: [
        {
          tab: "Content",
          group: "Overview",
          props: [
            p("heading", "Heading", "text", { cultures: true, mandatory: true }),
            p("intro", "Introduction", "textarea", { cultures: true }),
            p("heroImage", "Hero image", "image"),
            p("notices", "Notices", blocks("Location Blocks", "notice", "imageGallery")),
          ],
        },
      ],
    },
    locationType("store", "Store", [
      // The store's own, from before the composition existed.
      p("phone", "Phone", "text"),
      p("parking", "Parking", "toggle"),
      p("clickAndCollect", "Click and collect", "toggle"),
    ]),
    locationType("office", "Office", [p("reception", "Reception", "toggle")]),
    locationType("warehouse", "Warehouse", [p("loadingBays", "Loading bays", "number")]),
    locationType("showroom", "Showroom", [p("bookingNote", "Booking note", "rte")]),
    locationType("serviceCenter", "Service Center", [p("servicesOffered", "Services", "dropdown")]),
    locationType("outlet", "Outlet", [p("discount", "Discount (%)", "number")]),
    {
      alias: "events",
      name: "Events",
      icon: "icon-calendar",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      children: ["event"],
      groups: [{ tab: "Content", group: "List", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "event",
      name: "Event",
      icon: "icon-calendar-alt",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      groups: [
        {
          tab: "Content",
          group: "Event",
          props: [
            p("heading", "Heading", "text", { cultures: true }),
            p("startDate", "Starts", "date"),
            p("venue", "Venue", picker("Venue picker", "venue")),
            p(
              "agenda",
              "Agenda",
              blocks("Agenda", "agendaItem"),
              { cultures: true }
            ),
          ],
        },
      ],
    },
    {
      alias: "services",
      name: "Services",
      icon: "icon-wrench",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      children: ["oldServicePage", "pickupPoint"],
      groups: [{ tab: "Content", group: "List", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "oldServicePage",
      name: "Old Service Page",
      icon: "icon-wrench",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      groups: [
        {
          tab: "Content",
          group: "Service",
          props: [p("price", "Price", "decimal"), p("bookable", "Bookable", "toggle")],
        },
      ],
    },
    {
      alias: "pickupPoint",
      name: "Pickup Point",
      icon: "icon-box",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo", "locationDetails"],
      groups: [{ tab: "Content", group: "Pickup", props: [p("lockers", "Lockers", "number")] }],
    },
    {
      alias: "news",
      name: "News",
      icon: "icon-newspaper",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      children: ["article"],
      groups: [{ tab: "Content", group: "List", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "article",
      name: "Article",
      icon: "icon-article",
      folder: "Pages",
      cultures: true,
      template: true,
      compose: ["seo"],
      groups: [
        {
          tab: "Content",
          group: "Article",
          props: [
            p("heading", "Heading", "text", { cultures: true, mandatory: true }),
            p("publishDate", "Date", "date"),
            p("author", "Author", "text"),
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
      children: ["header", "venue"],
      groups: [{ tab: "Settings", group: "Site", props: [p("siteName", "Site name", "text")] }],
    },
    {
      alias: "header",
      name: "Header",
      icon: "icon-layout",
      folder: "Settings",
      compose: ["navigation"],
      groups: [{ tab: "Settings", group: "Header", props: headerProps() }],
    },
    {
      alias: "venue",
      name: "Venue",
      icon: "icon-company",
      folder: "Settings",
      groups: [
        {
          tab: "Venue",
          group: "Venue",
          props: [p("venueName", "Name", "text"), p("capacity", "Capacity", "number"), p("stepFree", "Step-free", "toggle")],
        },
      ],
    },

    // Last year's campaign site. Its Allow at root was unticked, so nothing leads in.
    {
      alias: "campaignSite",
      name: "Campaign Site",
      icon: "icon-globe",
      folder: "Campaign",
      cultures: true,
      template: true,
      children: ["campaignPage"],
      groups: [{ tab: "Content", group: "Campaign", props: [p("heading", "Heading", "text", { cultures: true })] }],
    },
    {
      alias: "campaignPage",
      name: "Campaign Page",
      icon: "icon-megaphone",
      folder: "Campaign",
      cultures: true,
      template: true,
      children: ["popUpStore"],
      groups: [{ tab: "Content", group: "Page", props: [p("campaignCode", "Campaign code", "text")] }],
    },
    {
      alias: "popUpStore",
      name: "Pop-up Store",
      icon: "icon-store",
      folder: "Campaign",
      cultures: true,
      template: true,
      compose: ["teamInfo", "openingHours"],
      groups: [{ tab: "Content", group: "Store", props: [p("openUntil", "Open until", "date")] }],
    },

    // Element Types
    element("hero", "Hero", "icon-picture", [
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
    element("map", "Map", "icon-map-location", [
      p("label", "Label", "text"),
      p("latitude", "Latitude", "decimal"),
      p("longitude", "Longitude", "decimal"),
    ]),
    element("notice", "Notice", "icon-alert", [
      p("message", "Message", "textarea", { mandatory: true }),
      p("level", "Level", "dropdown"),
    ]),
    element("agendaItem", "Agenda Item", "icon-list", [
      p("time", "Time", "text"),
      p("location", "Location", picker("Location picker", "store", "office", "showroom", "serviceCenter")),
      p("description", "Description", "textarea"),
    ]),
    // Left over from a redesign. No block editor offers it.
    element("legacyBanner", "Legacy Banner", "icon-flag", [p("bannerText", "Text", "text")]),
  ]
}

function locationType(alias: string, name: string, props: Prop[]): TypeSpec {
  return {
    alias,
    name,
    icon: "icon-pin-location",
    folder: "Locations",
    cultures: true,
    template: true,
    parent: "location",
    compose: ["teamInfo", "openingHours"],
    groups: [{ tab: "Content", group: name, props }],
  }
}

function element(alias: string, name: string, icon: string, props: Prop[]): TypeSpec {
  return { alias, name, icon, folder: "Blocks", element: true, groups: [{ tab: "Content", group: name, props }] }
}

/** The header's switches, the long flat tab every site grows. */
function headerProps(): Prop[] {
  const toggles = [
    ["showSearch", "Show search"],
    ["showLanguagePicker", "Show language picker"],
    ["showLogin", "Show login"],
    ["showBasket", "Show basket"],
    ["stickyHeader", "Sticky header"],
    ["showBanner", "Show banner"],
    ["showBreadcrumbs", "Show breadcrumbs"],
    ["megaMenu", "Mega menu"],
    ["darkLogo", "Dark logo"],
    ["showPhone", "Show phone"],
    ["showOpeningHours", "Show opening hours"],
    ["cookieBanner", "Cookie banner"],
  ] as const
  return [
    ...toggles.map(([alias, name]) => p(alias, name, "toggle")),
    p("bannerText", "Banner text", "textarea"),
    p("logo", "Logo", "image"),
  ]
}


// Ids are made from the alias, as stable as a key, so every build draws the same
// city.
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

export function siteGraph(): SchemaGraph {
  const specs = types()
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
    generatedAt: "2026-10-16T08:00:00Z",
    folders,
    nodes: nodes.sort((a, b) => a.alias.localeCompare(b.alias)),
    edges: [...unique.values()],
    dataTypes: [...dataTypes.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}

/** Content items per type. The campaign pages still hold what was made before the cut. */
const CONTENT: Record<string, number> = {
  home: 1,
  aboutUs: 1,
  careers: 1,
  shop: 1,
  product: 128,
  locations: 1,
  store: 1,
  office: 1,
  warehouse: 2,
  showroom: 1,
  serviceCenter: 1,
  outlet: 1,
  events: 1,
  event: 3,
  services: 1,
  oldServicePage: 0,
  pickupPoint: 1,
  news: 1,
  article: 46,
  siteSettings: 1,
  header: 1,
  venue: 6,
  campaignSite: 1,
  campaignPage: 2,
  popUpStore: 4,
}

export function siteUsage(): UsageReport {
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
          cultures: total > 0 ? ["en-US", "da-DK"] : [],
          lastEdited: total > 0 ? "2026-09-30T09:00:00Z" : null,
        },
      ])
    ),
    references: [{ fromType: idOf("event"), toType: idOf("venue"), count: 3 }],
    blocks: {
      partial: false,
      valuesRead: 64,
      unreadable: 0,
      byDataType: [
        block("Page Blocks", 1, [["hero", 1], ["imageGallery", 3], ["videoEmbed", 12], ["richText", 4]]),
        block("Home Blocks", 1, [["hero", 1], ["quote", 1], ["imageGallery", 1]]),
        block("Location Blocks", 7, [["notice", 9], ["imageGallery", 7]]),
        block("Agenda", 3, [["agendaItem", 14]]),
      ],
    },
  }
}

/** The id the graph gives a type, for a slide that names one. */
export const siteId = idOf
