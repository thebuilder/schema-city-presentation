import "server-only"

import type { SlideDefinition } from "@thebuilder/deckard-core"
import { ADD_PROPERTY_STEPS, DELETED_BLOCK_STEPS } from "@/deck/examples/site-results"
import { Backoffice } from "@/deck/parts/backoffice"
import { Buildup } from "@/deck/parts/buildup"
import { Close } from "@/deck/parts/close"
import { FakeOut } from "@/deck/parts/fake-out"
import { Statement } from "@/deck/parts/line"
import { Live } from "@/deck/parts/live"
import { AddProperty, DeletedBlock } from "@/deck/parts/site-examples"
import { Takeover } from "@/deck/parts/takeover"
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
      "0:00, 45 seconds. The takeover runs about 15 seconds with its own sound cue, so let it play without talking and check the room volume beforehand. The screen tears open at the U and the camera dives into the rain. When the title has settled, around 14 seconds in: sorry, wrong deck. Going back to the fake-out and forward again replays it. Stepping back here from whoami shows the settled title.",
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
      "1:45, 3 minutes. The screen builds itself: Home page, Metadata tab, one property at a time, each inherited from Page Meta. They know it. The line lands once it is full, read it once. Click: the Compositions dialog, Hero, Header, Footer and Page Meta ticked. Home page is four other types underneath, and the tabs blend them together. Click: the Modules property and its ten blocks. You can see what Home page allows, not that three other page types allow the same ten. Click: Structure, six page types allowed under it. Every screen tells you what goes into Home page. None of them tells you where anything goes. Click: back on Metadata, everything dims but Page Meta in the tree, a Document Type, and wires run from it to every property it gave Home page. Read the line: nothing here counts the content behind it. Opening Page Meta would list the types that use it, but not how much content they carry or what else shares those aliases. The demo answers that. Don't ask the question yet, let the T-rex answer.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    // BACKOFFICE_STEPS in deck/parts/backoffice.tsx.
    stepCount: 5,
    body: <Backoffice />,
  },
  {
    slug: "trex",
    title: "Perfected",
    notes:
      "3:45, 15 seconds. The storm is up over the gap you just named. No click: the line fades in after a second, then the T-rex roars. Deadpan. Then straight on to fsn.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    body: <Trex />,
  },
  {
    slug: "unix-system",
    title: "I know this",
    notes:
      "4:00, 2 minutes. The turn. Get the laugh. fsn was real SGI software from 1992. Directories were platforms, files were blocks, height was size. A kid read a filesystem in seconds because it was a place. What they are watching is your rebuild at fsn.thebuilder.dk, on its own renderer. The line lands on its own once the camera settles, let it sit. Click, fly into security and open velociraptor.webp: it's inside. Click, the doors, and she locks them. Wait for the green light.",
    layout: "fullscreen",
    stepCount: 3,
    body: <UnixSystem />,
  },
  {
    slug: "apply-to-umbraco",
    title: "Apply it to Umbraco",
    notes:
      "6:00, 15 seconds. The bridge. A filesystem read as a place in 1993. Ask it plainly, then click.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="What if we applied this to Umbraco?" />,
  },
  {
    slug: "buildup",
    title: "Same data",
    notes:
      "6:15, 2.25 minutes. The only reveal. Click through slowly, one sentence a click, the line on screen says what each Umbraco term becomes. Content page, the one you just saw in the backoffice, rises as a building. Click, its floors are its property groups. Click, the windows are its properties. Click, Page Meta, the composition it uses, and the arc between them. Click, Article page and Articles page use it too, each linked once it is built. Click, and pull up: same data, every Document Type. The data did not change, the interface did. Then, plainly: so I built something.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    stepCount: 6,
    body: <Buildup />,
  },
  {
    slug: "live",
    title: "Let's see it",
    notes:
      "8:30, about 10 minutes, wrap up by 18:55. Now ask the question the opening left open: what does a change to Page Meta reach? Ask the room. Say it, then click the button. Three questions the content tree cannot answer. Spend the time on the first two. What is in here: the overview. What touches what: open Page Meta. Six page types get its properties, Home, Content, Articles, Article, Not found and Search results, and the panel counts the content behind them. That answers the question from before. Then a quick look at the third, what is already broken: the findings. The two example slides after this go deeper on reach and on a broken block.",
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
    header: "hidden",
    footer: "hidden",
    body: <Statement text="Now, a messier site." />,
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
    slug: "close",
    title: "Thank you",
    notes:
      "23:15. Point at the GitHub link, the install is one dotnet add. End on one honest line: why you built it, and that it still cannot see your code. Then thank them. The world behind you is your own site, thebuilder.dk. If someone asks how it is built: yes, it is an Umbraco package. Leave this up through questions. Ask people to try it on their worst schema and open an issue.",
    layout: "fullscreen",
    background: "none",
    header: "hidden",
    footer: "hidden",
    body: <Close />,
  },
]
