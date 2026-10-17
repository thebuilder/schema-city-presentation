import "server-only"

import type { SlideDefinition } from "@thebuilder/deckard-core"
import { BackofficeGrid } from "@/deck/parts/backoffice-grid"
import { Close } from "@/deck/parts/close"
import { FakeOut } from "@/deck/parts/fake-out"
import { Ladder } from "@/deck/parts/ladder"
import { Layout } from "@/deck/parts/layout"
import { Legend } from "@/deck/parts/legend"
import { Statement, Thought } from "@/deck/parts/line"
import { Live } from "@/deck/parts/live"
import { Morph } from "@/deck/parts/morph"
import { Pipeline } from "@/deck/parts/pipeline"
import { Placeholder } from "@/deck/parts/placeholder"
import { Takeover } from "@/deck/parts/takeover"
import { TheWall } from "@/deck/parts/the-wall"
import { UnixSystem } from "@/deck/parts/unix-system"
import { Whoami } from "@/deck/parts/whoami"
import { Wireframe } from "@/deck/parts/wireframe"

/*
 * The order and the speaker notes live here. Each visual lives in its own file
 * under deck/parts/, so the slides can be built in parallel without two people
 * editing the same lines. Timings add up to 25 minutes before questions. Most slides are one line, so
 * nearly all of the clock goes to the scenes and the demo.
 */
export const slides: SlideDefinition[] = [
  {
    slug: "fake-out",
    title: "Content Model Governance",
    notes:
      "Before the talk. Up on screen while people sit down. Play it straight and stand beside it like this is the talk. One click when you are ready.",
    header: "hidden",
    footer: "hidden",
    layout: "fullscreen",
    background: "none",
    body: <FakeOut />,
  },
  {
    slug: "takeover",
    title: "Schema City",
    notes:
      "0:00, 45 seconds. The takeover runs about 15 seconds, so let it play without talking. The screen tears open at the U and the camera dives into the rain. When the title has settled, around 14 seconds in: sorry, wrong deck. Going back to the fake-out and forward again replays it. Stepping back here from whoami shows the settled title.",
    header: "hidden",
    footer: "hidden",
    layout: "fullscreen",
    background: "hero",
    body: <Takeover />,
  },
  {
    slug: "whoami",
    title: "whoami",
    notes:
      "0:45, 1 minute. Short. Who you are. Schema City is one of a growing set of Umbraco packages at umbraco.thebuilder.dk.",
    stepCount: 3,
    body: <Whoami />,
  },
  {
    slug: "one-field",
    title: "One field",
    notes:
      "1:45, 15 seconds. The room's own voice. Say it like you said it on Monday, and let them recognise themselves.",
    header: "hidden",
    footer: "hidden",
    body: <Thought text="I'll just add one field." />,
  },
  {
    slug: "which-types",
    title: "Which types",
    notes:
      "2:00, 15 seconds. Still casual. A fair question.",
    header: "hidden",
    footer: "hidden",
    body: <Thought text="Which types use this composition?" />,
  },
  {
    slug: "expand",
    title: "Expand",
    notes:
      "2:15, 15 seconds. Dry delivery gets the laugh. One beat between each expand.",
    header: "hidden",
    footer: "hidden",
    body: <Thought text="Settings. Document Types. Expand. Expand. Expand." />,
  },
  {
    slug: "saved",
    title: "Saved",
    notes:
      "2:30, 10 seconds. Brutally short. Say it and move.",
    header: "hidden",
    footer: "hidden",
    body: <Thought text="Saved." />,
  },
  {
    slug: "blog",
    title: "The blog",
    notes:
      "2:40, 20 seconds. The only heavy slide. Say it, then pause until it is uncomfortable.",
    header: "hidden",
    footer: "hidden",
    body: <Thought text="Why is the blog broken?" />,
  },
  {
    slug: "backoffice",
    title: "How we see it",
    notes:
      "3:00, 45 seconds. Let the screens sit. They will recognise every one. The line lands on its own a beat later, read it once.",
    header: "hidden",
    footer: "hidden",
    body: <BackofficeGrid />,
  },
  {
    slug: "unix-system",
    title: "I know this",
    notes:
      "3:45, 1.5 minutes. Get the laugh. fsn was real SGI software from 1992. Directories were platforms, files were blocks, height was size. A kid read a filesystem in seconds because it was a place. What they are watching is your rebuild at fsn.thebuilder.dk, on its own renderer. The line is on screen, so let it land before you say anything.",
    layout: "fullscreen",
    stepCount: 3,
    body: <UnixSystem />,
  },
  {
    slug: "a-place",
    title: "A place",
    notes:
      "5:15, 20 seconds. Calm, after the laugh. This is the idea the rest of the talk borrows.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="A filesystem you could read as a place." />,
  },
  {
    slug: "the-wall",
    title: "The wall",
    notes:
      "5:35, 1.5 minutes. The question the whole talk answers: what does a change to SEO Composition reach? Ask the room. Nobody can answer from this view, and that is the point. Leave it open.",
    layout: "fullscreen",
    stepCount: 2,
    header: "hidden",
    footer: "hidden",
    body: <TheWall />,
  },
  {
    slug: "ladder",
    title: "The ladder",
    notes:
      "7:05, 1 minute. One word per rung and let the room laugh at the city. Same content model each time, only the interface changes.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    stepCount: 4,
    body: <Ladder />,
  },
  {
    slug: "morph",
    title: "Same data",
    notes:
      "8:05, 1.5 minutes. The wall from before, same rows, becomes a city. Say only: same data. The data did not change, the interface did.",
    layout: "fullscreen",
    background: "statement",
    stepCount: 2,
    header: "hidden",
    footer: "hidden",
    body: <Morph />,
  },
  {
    slug: "built-something",
    title: "So I built something",
    notes:
      "9:35, 20 seconds. The bridge. Say it plainly, like it was the obvious thing to do.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="So I built something." />,
  },
  {
    slug: "legend",
    title: "How to read it",
    notes:
      "9:55, 1 minute. Say each mapping once as it appears: doc type, property groups, properties, element types, traces. Cut it if the room already reads the city.",
    stepCount: 6,
    body: <Legend />,
  },
  {
    slug: "live",
    title: "Let's see it",
    notes:
      "10:55, 12 minutes. Say it, then click the button. Four questions the content tree cannot answer. What is in here: the overview. What touches what: open SEO Composition, 37 types and 188 content items. That answers the question from before. What is already broken: the findings. What did my change actually do: the snapshot, 4 planned edits, 48 side effects, 1 nobody planned.",
    header: "hidden",
    footer: "hidden",
    background: "breaker",
    body: <Live />,
  },
  {
    slug: "used-to-be",
    title: "The tree",
    notes:
      "22:55, 15 seconds. Slow. Let the words land one by one.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="The interface used to be the tree." />,
  },
  {
    slug: "folders",
    title: "Folders",
    notes:
      "23:10, 15 seconds. Three beats, one per word.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="Folders. Lists. Checkboxes." />,
  },
  {
    slug: "a-place-now",
    title: "Now it's a place",
    notes:
      "23:25, 15 seconds. Pause before it. This is the line people take home.",
    header: "hidden",
    footer: "hidden",
    background: "accent",
    body: <Statement text="Now it's a place." />,
  },
  {
    slug: "close",
    title: "Go look at it",
    notes:
      "23:40. Read the line, then the install line. End on one honest line: why you built it, and that it still cannot see your code. Then thank them. The world behind you is your own site, thebuilder.dk. If someone asks how it is built: yes, it is an Umbraco package, and the pipeline is in backup. Leave this up through questions. Ask people to try it on their worst schema and open an issue.",
    layout: "fullscreen",
    background: "none",
    header: "hidden",
    footer: "hidden",
    body: <Close />,
  },
  {
    slug: "backup-impact",
    title: "Backup: impact",
    notes:
      "Backup. A change to SEO Composition reaches 37 types and 188 content items. Adding seoTitle collides on Dup Alias Page.",
    body: (
      <Placeholder
        label="backup"
        shows="Impact of changing SEO Composition, captured from the demo."
      />
    ),
  },
  {
    slug: "backup-findings",
    title: "Backup: findings",
    notes:
      "Backup. Findings, grouped by kind, breakages first. Each row says what it is about and what to do next.",
    body: (
      <Placeholder
        label="backup"
        shows="Findings, grouped by kind, captured from the demo."
      />
    ),
  },
  {
    slug: "backup-snapshot",
    title: "Backup: snapshot",
    notes:
      "Backup. Compare against a snapshot from before four planned edits: 4 causes, 48 side effects, 1 unplanned.",
    body: (
      <Placeholder
        label="backup"
        shows="Snapshot comparison, captured from the demo."
      />
    ),
  },
  {
    slug: "pipeline",
    title: "Backup: pipeline",
    notes:
      "Backup, if someone asks how it is built. Walk the blocks left to right: Umbraco, the graph API, the layout, the scene. Layout and wireframe are in backup if someone asks.",
    body: <Pipeline />,
  },
  {
    slug: "layout",
    title: "Backup: layout",
    notes:
      "Backup. Layout is the hard part. Show one decision it makes.",
    stepCount: 4,
    body: <Layout />,
  },
  {
    slug: "wireframe",
    title: "Backup: wireframe",
    notes:
      "Backup. Why it stays fast with 200 document types. Every building is one instanced mesh, and the glow is patched into that mesh's fragment shader, so there is no post-processing pass.",
    stepCount: 3,
    body: <Wireframe />,
  },
]
