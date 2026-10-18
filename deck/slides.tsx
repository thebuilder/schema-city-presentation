import "server-only"

import type { SlideDefinition } from "@thebuilder/deckard-core"
import {
  BROKEN_STEPS,
  CHANGES_STEPS,
  REACH_STEPS,
} from "@/deck/examples/park-results"
import { BackofficeGrid } from "@/deck/parts/backoffice-grid"
import { Close } from "@/deck/parts/close"
import { FakeOut } from "@/deck/parts/fake-out"
import { Ladder } from "@/deck/parts/ladder"
import { Layout } from "@/deck/parts/layout"
import { Legend } from "@/deck/parts/legend"
import { Statement } from "@/deck/parts/line"
import { Live } from "@/deck/parts/live"
import { Morph } from "@/deck/parts/morph"
import {
  ParkBroken,
  ParkChanges,
  ParkIntro,
  ParkReach,
} from "@/deck/parts/park-examples"
import { Pipeline } from "@/deck/parts/pipeline"
import { Place } from "@/deck/parts/place"
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
    slug: "backoffice",
    title: "How we see it",
    notes:
      "1:45, 1 minute. Let the screens sit. They will recognise every one. The line lands on its own a beat later, read it once.",
    header: "hidden",
    footer: "hidden",
    body: <BackofficeGrid />,
  },
  {
    slug: "unix-system",
    title: "I know this",
    notes:
      "2:45, 1.5 minutes. Get the laugh. fsn was real SGI software from 1992. Directories were platforms, files were blocks, height was size. A kid read a filesystem in seconds because it was a place. What they are watching is your rebuild at fsn.thebuilder.dk, on its own renderer. The line is on screen, so let it land before you say anything.",
    layout: "fullscreen",
    stepCount: 3,
    body: <UnixSystem />,
  },
  {
    slug: "a-place",
    title: "A place",
    notes:
      "4:15, 20 seconds. Calm, after the laugh. This is the idea the rest of the talk borrows.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="A filesystem you could read as a place." />,
  },
  {
    slug: "the-wall",
    title: "The wall",
    notes:
      "4:35, 1.5 minutes. The question the whole talk answers: what does a change to SEO Composition reach? Ask the room. Nobody can answer from this view, and that is the point. Leave it open.",
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
      "6:05, 1 minute. One word per rung and let the room laugh at the city. Same content model each time, only the interface changes.",
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
      "7:05, 1.5 minutes. The wall from before, same rows, becomes a city. Say only: same data. The data did not change, the interface did.",
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
      "8:35, 20 seconds. The bridge. Say it plainly, like it was the obvious thing to do.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="So I built something." />,
  },
  {
    slug: "legend",
    title: "How to read it",
    notes:
      "8:55, 1 minute. Say each mapping once as it appears: doc type, property groups, properties, element types, traces. Cut it if the room already reads the city.",
    stepCount: 6,
    body: <Legend />,
  },
  {
    slug: "live",
    title: "Let's see it",
    notes:
      "9:55, 9 minutes. Say it, then click the button. Four questions the content tree cannot answer. Spend the time on the first two. What is in here: the overview. What touches what: open SEO Composition, 37 types and 188 content items. That answers the question from before. Then a quick look at the other two, because the park slides after this go deeper on both. What is already broken: the findings. What did my change actually do: the snapshot, 4 planned edits, 48 side effects, 1 nobody planned.",
    header: "hidden",
    footer: "hidden",
    background: "breaker",
    body: <Live />,
  },
  {
    slug: "park",
    title: "A messier park",
    notes:
      "18:55, 20 seconds. After the demo. The callback to the fsn opener. ct-baseline is tidy, so this is a schema built to go wrong: Jurassic Park's website, 39 types, every problem planted on purpose. Every finding, path and count on the next three slides is Schema City's own, run over it.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    body: <ParkIntro />,
  },
  {
    slug: "park-broken",
    title: "What's broken?",
    notes:
      "19:15, 1.5 minutes. The findings, problems only, worst first. Click through three. A block editor still lists Mr. DNA's video after the Element Type was deleted, and content still holds 12 of those blocks. Restaurant is invariant but composes Page Meta, which varies by culture, so every language shares one meta title. Site B: someone unticked Allow at root on the island. No new island can be made, and the lab and the hatchery live on under the one old node. Each row is Schema City's own sentence.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: BROKEN_STEPS,
    body: <ParkBroken />,
  },
  {
    slug: "park-reach",
    title: "What does it reach?",
    notes:
      "20:45, 1.5 minutes. The question from the wall, asked of the park. Umbraco lists the three types that compose Paddock Security directly. Schema City follows the inheritance too, so every paddock that inherits Paddock comes along. Four of the twelve items sit in Site B. Click: someone wants to add an alarm property. Raptor Pen already has one, Muldoon's own. You find out here, before you build it.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: REACH_STEPS,
    body: <ParkReach />,
  },
  {
    slug: "park-changes",
    title: "What did my change do?",
    notes:
      "22:15, 1 minute. A snapshot from before the release weekend against the park after it. Each edit is one cause with its side effects under it. Three were in the plan, so they are ticked. Click: the fourth was not. Park Systems lost its door locks, and nine types changed with it, their stored values gone too. The alarm went in as fenceAlarm, the clash from the last slide renamed. Pause. Nedry.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: CHANGES_STEPS,
    body: <ParkChanges />,
  },
  {
    slug: "used-to-be",
    title: "The tree",
    notes:
      "23:15, 15 seconds. Slow. Let the words land one by one.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="The interface used to be the tree." />,
  },
  {
    slug: "folders",
    title: "Folders",
    notes:
      "23:30, 15 seconds. Three beats, one per word.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="Folders. Lists. Checkboxes." />,
  },
  {
    slug: "a-place-now",
    title: "Now it's a place",
    notes:
      "23:45, 15 seconds. Pause before it. This is the line people take home.",
    header: "hidden",
    footer: "hidden",
    layout: "fullscreen",
    background: "none",
    body: <Place text="Now it's a place." />,
  },
  {
    slug: "close",
    title: "Thank you",
    notes:
      "24:00. Point at the GitHub link, the install is one dotnet add. End on one honest line: why you built it, and that it still cannot see your code. Then thank them. The world behind you is your own site, thebuilder.dk. If someone asks how it is built: yes, it is an Umbraco package, and the pipeline is in backup. Leave this up through questions. Ask people to try it on their worst schema and open an issue.",
    layout: "fullscreen",
    background: "none",
    header: "hidden",
    footer: "hidden",
    body: <Close />,
  },
  {
    slug: "backup-impact",
    counted: false,
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
    counted: false,
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
    counted: false,
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
    counted: false,
    title: "Backup: pipeline",
    notes:
      "Backup, if someone asks how it is built. Walk the blocks left to right: Umbraco, the graph API, the layout, the scene. Layout and wireframe are in backup if someone asks.",
    body: <Pipeline />,
  },
  {
    slug: "layout",
    counted: false,
    title: "Backup: layout",
    notes:
      "Backup. Layout is the hard part. Show one decision it makes.",
    stepCount: 4,
    body: <Layout />,
  },
  {
    slug: "wireframe",
    counted: false,
    title: "Backup: wireframe",
    notes:
      "Backup. Why it stays fast with 200 document types. Every building is one instanced mesh, and the glow is patched into that mesh's fragment shader, so there is no post-processing pass.",
    stepCount: 3,
    body: <Wireframe />,
  },
]
