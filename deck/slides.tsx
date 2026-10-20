import "server-only"

import type { SlideDefinition } from "@thebuilder/deckard-core"
import { Backoffice } from "@/deck/parts/backoffice"
import { Buildup } from "@/deck/parts/buildup"
import { Close } from "@/deck/parts/close"
import { Docs } from "@/deck/parts/docs"
import { FakeOut } from "@/deck/parts/fake-out"
import { Statement } from "@/deck/parts/line"
import { Live } from "@/deck/parts/live"
import { Rotunda } from "@/deck/parts/rotunda"
import { Takeover } from "@/deck/parts/takeover"
import { Schema } from "@/deck/parts/schema"
import { Tangle } from "@/deck/parts/tangle"
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
    slug: "schema",
    title: "What is a schema?",
    notes:
      "1:45, 1 minute. Ask it, and give the room a second. Click: an article as a reader sees it, and the Article page Document Type beside it. The wires show where each part comes from: heading, date, authors, image, introduction, body. Click: more articles behind it, same shape. That shape is a Document Type. Click: more Document Types behind it. The schema is all of them together, the whole content model. The next screen is where you look at it today.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    // SCHEMA_STEPS in deck/parts/schema.tsx.
    stepCount: 4,
    body: <Schema />,
  },
  {
    slug: "backoffice",
    title: "How we see it",
    notes:
      "2:45, 2.5 minutes. The screen builds itself: Home page, Metadata tab, one property at a time, each inherited from Page Meta. They know it. The line lands once it is full, read it once. Click: the Compositions dialog, Hero, Header, Footer and Page Meta ticked. Home page is four other types underneath, and the tabs blend them together. Click: the Modules property and its ten blocks. You can see what Home page allows, not that three other page types allow the same ten. Click: Structure, six page types allowed under it. Every screen tells you what goes into Home page. Next: what happens when there are many of them.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    // BACKOFFICE_STEPS in deck/parts/backoffice.tsx.
    stepCount: 4,
    body: <Backoffice />,
  },
  {
    slug: "tangle",
    title: "It gets messy",
    notes:
      "5:15, 20 seconds. No click. Every Document Type in the demo site lands, then every link between them draws: compositions, allowed children, blocks, references. This is a small site, 32 types. Let the line land, then say it: and you are expected to keep all of this in your head before you change anything.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    body: <Tangle />,
  },
  {
    slug: "better-way",
    title: "Is there a better way?",
    notes:
      "5:35, 10 seconds. Ask it straight, as if you mean it. One beat, then click.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="Is there a better way?" />,
  },
  {
    slug: "trex",
    title: "Perfected",
    notes:
      "5:45, 15 seconds. The joke answer to the question. No click: the line fades in after a second, then the T-rex roars. Deadpan, as if the perfect UI really was invented in 1993. Then straight on to fsn.",
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
      "6:00, 2 minutes. The turn. Get the laugh. fsn was real SGI software from 1992. Directories were platforms, files were blocks, height was size. A kid read a filesystem in seconds because it was a place. What they are watching is your rebuild at fsn.thebuilder.dk, on its own renderer, and the link in the corner is there for anyone who wants to try it. The line lands on its own once the camera settles, let it sit. Click, fly into security and open velociraptor.webp: it's inside. Click, the doors, and she locks them. Wait for the green light.",
    layout: "fullscreen",
    stepCount: 3,
    body: <UnixSystem />,
  },
  {
    slug: "apply-to-umbraco",
    title: "Apply it to Umbraco",
    notes:
      "8:00, 15 seconds. The bridge. A filesystem read as a place in 1993. Ask it plainly, then click.",
    header: "hidden",
    footer: "hidden",
    body: <Statement text="What if we applied this to Umbraco?" />,
  },
  {
    slug: "buildup",
    title: "Same data",
    notes:
      "8:15, 2.25 minutes. The only reveal. Click through slowly, one sentence a click, the line on screen says what each Umbraco term becomes. Content page, the one you just saw in the backoffice, rises as a building. Click, its floors are its property groups. Click, the windows are its properties. Click, Page Meta, the composition it uses, and the arc between them. Click, Article page and Articles page use it too, each linked once it is built. Click, and pull up: same data, every Document Type. The data did not change, the interface did. Then, plainly: so I built something.",
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
      "10:30, about 12 minutes, wrap up by 22:30. Click the button. Three questions the content tree cannot answer, all on this one site. What is in here: the overview. What touches what: open Page Meta. Six page types get its properties, Home, Content, Articles, Article, Not found and Search results, and the panel counts the content behind them. Then the third, what is already broken: the findings. ct-baseline already carries real problems, so take your time here and open one or two of them.",
    header: "hidden",
    footer: "hidden",
    background: "breaker",
    body: <Live />,
  },
  {
    slug: "docs",
    title: "Read more",
    notes:
      "22:30, 30 seconds. Back from the demo. This is the docs site, schema-city.thebuilder.dk: the guide, the install line and how it works. The logo forms out of particles, let it settle. Say it is free and in preview, and that it runs on Umbraco 17 and 18.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    body: <Docs />,
  },
  {
    slug: "reflection",
    title: "Developers ruled the earth",
    notes:
      "23:00, 45 seconds. The callback to the T-rex, and your one honest beat. No click to start: the T-rex roars and the banner comes down, so stay quiet until it lands. The first line comes up on its own. Click for the second, and let the question hang. Then tell it plainly: it started as a silly idea, a ridiculous 3D world for a content model, and it kept turning out useful. Then thank them.",
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    stepCount: 2,
    body: <Rotunda />,
  },
  {
    slug: "close",
    title: "Thank you",
    notes:
      "23:45. Thank them. The links are your site and the package library, and the install line was on the docs slide. The world behind you is your own site, thebuilder.dk. If someone asks how it is built: yes, it is an Umbraco package. Leave this up through questions. Ask people to try it on their worst schema and open an issue.",
    layout: "fullscreen",
    background: "none",
    header: "hidden",
    footer: "hidden",
    body: <Close />,
  },
]
