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
    notes: [
      "Up while people sit down. Check the volume.",
      "Play it straight, like this is the talk.",
      "Click when ready.",
    ].join("\n"),
    header: "hidden",
    footer: "hidden",
    layout: "fullscreen",
    background: "none",
    body: <FakeOut />,
  },
  {
    slug: "takeover",
    title: "Schema City",
    notes: [
      "0:00 · 45s",
      "Hands off. Let it play with sound, about 15s.",
      "When the title settles: \"Sorry, wrong deck.\"",
      "Misfire? Back, then forward replays it.",
    ].join("\n"),
    header: "hidden",
    footer: "hidden",
    layout: "fullscreen",
    background: "hero",
    body: <Takeover />,
  },
  {
    slug: "whoami",
    title: "whoami",
    notes: [
      "0:45 · 1 min",
      "Keep it short.",
      "Schema City is one of your packages, all at umbraco.thebuilder.dk.",
    ].join("\n"),
    stepCount: 3,
    body: <Whoami />,
  },
  {
    slug: "schema",
    title: "What is a schema?",
    notes: [
      "1:45 · 1 min",
      "Ask it. Give the room a second.",
      "Click: an article, wired to its Document Type.",
      "Click: more articles, same shape.",
      "Click: more Document Types. The schema is all of them.",
      "Bridge: and this is where we look at it today.",
    ].join("\n"),
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
    notes: [
      "2:45 · 2.5 min",
      "Let it build. Read the line once.",
      "Click: Compositions. Four types blended into its tabs.",
      "Click: Modules. Three other page types allow the same ten, and nothing here says so.",
      "Click: Structure.",
      "Every screen is about what goes into Home page.",
    ].join("\n"),
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
    notes: [
      "5:15 · 20s",
      "No click. Let it draw. 32 types, a small site.",
      "Then: \"And you keep all of this in your head before you change anything.\"",
    ].join("\n"),
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    body: <Tangle />,
  },
  {
    slug: "better-way",
    title: "Is there a better way?",
    notes: [
      "5:35 · 10s",
      "Ask it like you mean it. One beat, click.",
    ].join("\n"),
    header: "hidden",
    footer: "hidden",
    body: <Statement text="Is there a better way?" />,
  },
  {
    slug: "trex",
    title: "Perfected",
    notes: [
      "5:45 · 15s",
      "No click. Deadpan.",
      "Straight on after the roar.",
    ].join("\n"),
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    background: "none",
    body: <Trex />,
  },
  {
    slug: "unix-system",
    title: "I know this",
    notes: [
      "6:00 · 2 min",
      "Get the laugh. Real SGI software, 1992.",
      "A kid read a filesystem because it was a place.",
      "Your rebuild, link in the corner. Let the line sit.",
      "Click: into security, open velociraptor.webp.",
      "Click: the doors. Wait for the green light.",
    ].join("\n"),
    layout: "fullscreen",
    stepCount: 3,
    body: <UnixSystem />,
  },
  {
    slug: "apply-to-umbraco",
    title: "Apply it to Umbraco",
    notes: [
      "8:00 · 15s",
      "Ask it plainly. Click.",
    ].join("\n"),
    header: "hidden",
    footer: "hidden",
    body: <Statement text="What if we applied this to Umbraco?" />,
  },
  {
    slug: "buildup",
    title: "Same data",
    notes: [
      "8:15 · 2.25 min",
      "Slow, one sentence a click. Content page rises.",
      "Click: floors. Click: windows.",
      "Click: Page Meta. Click: Article and Articles page.",
      "Click: pull up. \"The data didn't change. The interface did.\"",
      "Then: \"So I built something.\"",
    ].join("\n"),
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    stepCount: 6,
    body: <Buildup />,
  },
  {
    slug: "live",
    title: "Let's see it",
    notes: [
      "10:30 · 12 min. Back by 22:30.",
      "Click the button. Beats are on the demo sheet.",
      "1. What's in here? Overview. Until 14:00.",
      "2. What touches what? Page Meta, Impact. Until 19:30.",
      "3. What's already broken? Findings. Until 22:00.",
    ].join("\n"),
    header: "hidden",
    footer: "hidden",
    background: "breaker",
    body: <Live />,
  },
  {
    slug: "docs",
    title: "Read more",
    notes: [
      "22:30 · 30s",
      "Let the logo settle.",
      "Free, in preview, Umbraco 17 and 18.",
    ].join("\n"),
    layout: "fullscreen",
    header: "hidden",
    footer: "hidden",
    body: <Docs />,
  },
  {
    slug: "reflection",
    title: "Developers ruled the earth",
    notes: [
      "23:00 · 45s",
      "Quiet until the banner lands.",
      "Click: the second line. Let it hang.",
      "Then plainly: it started as a silly idea and kept turning out useful.",
    ].join("\n"),
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
    notes: [
      "23:45",
      "Thank them. Leave this up through questions.",
      "Ask: try it on your worst schema, tell me what it finds.",
    ].join("\n"),
    layout: "fullscreen",
    background: "none",
    header: "hidden",
    footer: "hidden",
    body: <Close />,
  },
]
