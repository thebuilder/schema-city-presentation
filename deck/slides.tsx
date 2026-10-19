import "server-only"

import type { SlideDefinition } from "@thebuilder/deckard-core"
import { ADD_PROPERTY_STEPS, DELETED_BLOCK_STEPS } from "@/deck/examples/site-results"
import { BackofficeGrid } from "@/deck/parts/backoffice-grid"
import { Buildup } from "@/deck/parts/buildup"
import { Close } from "@/deck/parts/close"
import { FakeOut } from "@/deck/parts/fake-out"
import { Ladder } from "@/deck/parts/ladder"
import { Statement } from "@/deck/parts/line"
import { Live } from "@/deck/parts/live"
import { Place } from "@/deck/parts/place"
import { AddProperty, DeletedBlock, SiteIntro } from "@/deck/parts/site-examples"
import { Takeover } from "@/deck/parts/takeover"
import { TheWall } from "@/deck/parts/the-wall"
import { Trex } from "@/deck/parts/trex"
import { UnixSystem } from "@/deck/parts/unix-system"
import { Whoami } from "@/deck/parts/whoami"

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
    slug: "the-wall",
    title: "The wall",
    notes:
      "2:45, 1.5 minutes. The question the whole talk answers: what does a change to Page Meta reach? Ask the room. Nobody can answer from this view, and that is the point. Leave it open.",
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
      "4:15, 30 seconds. One word per rung. Tree, list, graph: the same content model each time, each shows a bit more, and the graph ends as a hairball. None of them answers the question. Do not mention the city yet.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    stepCount: 3,
    body: <Ladder />,
  },
  {
    slug: "trex",
    title: "Perfected",
    notes:
      "4:45, 15 seconds. The storm is up as the ladder leaves. Click: the T-rex roars and the line lands. Deadpan. Then straight on to fsn.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: 2,
    body: <Trex />,
  },
  {
    slug: "unix-system",
    title: "I know this",
    notes:
      "5:00, 1.5 minutes. The turn. Get the laugh. fsn was real SGI software from 1992. Directories were platforms, files were blocks, height was size. A kid read a filesystem in seconds because it was a place. What they are watching is your rebuild at fsn.thebuilder.dk, on its own renderer. Let the line land, then: so what would our content model look like as a place?",
    layout: "fullscreen",
    stepCount: 3,
    body: <UnixSystem />,
  },
  {
    slug: "buildup",
    title: "Same data",
    notes:
      "6:30, 2.5 minutes. The only reveal. Click through slowly, one sentence a click. One row from the wall, Content Page. Click, it becomes a building. Click, its floors are its property groups. Click, the windows are its properties. Click, Page Meta, the composition it uses, and the arc between them. Click, Article Page uses it too. Click, and pull up: same data, the whole wall. The data did not change, the interface did. Then, plainly: so I built something.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    stepCount: 7,
    body: <Buildup />,
  },
  {
    slug: "live",
    title: "Let's see it",
    notes:
      "9:00, 10 minutes, wrap up by 18:55. Say it, then click the button. Three questions the content tree cannot answer. Spend the time on the first two. What is in here: the overview. What touches what: open Page Meta. Six page types get its properties, Home, Content, Articles, Article, Not found and Search results, and the panel counts the content behind them. That answers the question from before. Then a quick look at the third, what is already broken: the findings. The two example slides after this go deeper on reach and on a broken block.",
    header: "hidden",
    footer: "hidden",
    background: "breaker",
    body: <Live />,
  },
  {
    slug: "examples",
    title: "A messier site",
    notes:
      "18:55, 20 seconds. After the demo. ct-baseline is tidy, so this is a site built to go wrong. An ordinary company site in two languages, 39 types, every problem planted on purpose. Every type, count and clash on the next two slides is Schema City's own.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    body: <SiteIntro />,
  },
  {
    slug: "add-property",
    title: "Can I add a phone property?",
    notes:
      "19:15, 2 minutes. You want a phone property on Location Details. Click, this is what Umbraco tells you, two types compose it. Click, Schema City keeps going. Location is a parent, so all six location types inherit the property too, 8 types and 8 pages. Click, Store already has a phone property of its own. Umbraco would refuse the save. Here you see it before you start.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: ADD_PROPERTY_STEPS,
    body: <AddProperty />,
  },
  {
    slug: "deleted-block",
    title: "Someone deleted the Video block",
    notes:
      "21:15, 2 minutes. A cleanup removed the Video Element Type. Click, About Us and the Element Types its block list offers. Click, one link runs to an empty plot, because the type it points at is gone. Click, content still holds 12 of those blocks. Schema City lists it as a broken block, before an editor opens the page and finds out.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: DELETED_BLOCK_STEPS,
    body: <DeletedBlock />,
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
      "24:00. Point at the GitHub link, the install is one dotnet add. End on one honest line: why you built it, and that it still cannot see your code. Then thank them. The world behind you is your own site, thebuilder.dk. If someone asks how it is built: yes, it is an Umbraco package. Leave this up through questions. Ask people to try it on their worst schema and open an issue.",
    layout: "fullscreen",
    background: "none",
    header: "hidden",
    footer: "hidden",
    body: <Close />,
  },
]
