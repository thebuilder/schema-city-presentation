"use client"

import type { CSSProperties } from "react"
import ctBaseline from "@/deck/city/ct-baseline.json"
import { useStep } from "@/deck/city/use-step"
import { useStill } from "@/deck/parts/beats"
import { Words } from "@/deck/parts/line"

/*
 * What a schema is, shown on a page the room has built a hundred times. Step 0
 * is the question on its own. Step 1 draws an article as a reader sees it, and
 * beside it the Article page Document Type from ct-baseline, then wires each
 * part of the page to the property it comes from. Step 2 stacks more articles
 * behind the first, so a Document Type reads as the shape every page of one
 * type shares. Step 3 stacks more Document Types behind that one and answers
 * the question: the schema is all of them, before the backoffice shows them.
 *
 * The slide is drawn on the 1920 by 1080 canvas in fixed positions, so the
 * wires can be plain coordinates instead of measurements.
 */
export const SCHEMA_STEPS = 4

interface Field {
  alias: string
  // Where the wire leaves the page.
  y: number
}

const articlePage = (
  ctBaseline.graph.nodes as unknown as {
    alias: string
    groups: { properties?: { alias: string; dataTypeName: string; name: string }[] }[]
    name: string
  }[]
).find((node) => node.alias === "articlePage")

const properties = new Map(
  (articlePage?.groups ?? [])
    .flatMap((group) => group.properties ?? [])
    .map((property) => [property.alias, property])
)

// The parts of the page, top to bottom, and the height each one leaves from.
const FIELDS: Field[] = [
  { alias: "heading", y: 372 },
  { alias: "publicationDate", y: 446 },
  { alias: "authors", y: 446 },
  { alias: "heroImage", y: 600 },
  { alias: "introduction", y: 790 },
  { alias: "body", y: 900 },
]

const PAGE = { left: 120, top: 260, width: 760, height: 690 }
const PANEL = { left: 1180, top: 300, width: 620 }
const ROW_TOP = PANEL.top + 118
const ROW_GAP = 86

// A few of the other Document Types in ct-baseline, furthest back first.
const OTHER_TYPES = ["Content page", "Home page", "Page Meta"]

// Milliseconds after the click.
const PAGE_AT = 200
const PANEL_AT = 700
const WIRES_AT = 1300
const WIRE_GAP = 140

function fade(on: boolean, at: number, still: boolean, lift = 12): CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? "none" : `translateY(${lift}px)`,
    transition: still
      ? "none"
      : `opacity 420ms ease-out ${on ? at : 0}ms, transform 420ms ease-out ${on ? at : 0}ms`,
  }
}

// A block of grey text lines, the way a wireframe stands in for copy.
function Lines({ count, last = "60%" }: { count: number; last?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <span
          className="block h-3 bg-muted-foreground/35"
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholder lines never reorder
          key={index}
          style={{ width: index === count - 1 ? last : "100%" }}
        />
      ))}
    </div>
  )
}

function Page({ heading }: { heading: string }) {
  return (
    <div className="flex h-full flex-col border border-[var(--slide-surface-border)] bg-card">
      <div className="flex items-center gap-2 border-[var(--slide-surface-border)] border-b px-5 py-3">
        <span className="size-3 rounded-full bg-muted-foreground/40" />
        <span className="size-3 rounded-full bg-muted-foreground/40" />
        <span className="size-3 rounded-full bg-muted-foreground/40" />
        <span className="ml-4 font-mono text-[1.1rem] text-muted-foreground">
          /articles/{heading.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-6 px-10 pt-8">
        <p className="font-bold text-[2.6rem] text-foreground leading-[1.05]">{heading}</p>
        <p className="font-mono text-[1.25rem] text-muted-foreground">
          20 Oct 2026 · Daniel Schmidt
        </p>
        {/* A wireframe picture, so the article stays ordinary and nothing on
            it gives away the T-rex that comes after. */}
        <div className="h-[260px] overflow-hidden border border-[var(--slide-surface-border)] bg-muted-foreground/15">
          <svg aria-hidden className="block h-full w-full" preserveAspectRatio="xMidYMax slice" viewBox="0 0 680 260">
            <circle cx={520} cy={80} fill="currentColor" className="text-muted-foreground/40" r={34} />
            <path className="text-muted-foreground/30" d="M0 260 L190 110 L320 210 L420 140 L680 260 Z" fill="currentColor" />
            <path className="text-muted-foreground/45" d="M0 260 L120 180 L260 260 Z" fill="currentColor" />
          </svg>
        </div>
        <Lines count={2} last="70%" />
        <div className="pt-2">
          <Lines count={4} last="40%" />
        </div>
      </div>
    </div>
  )
}

export function Schema() {
  const step = useStep()
  const still = useStill()
  const shown = step >= 1
  const shared = step >= 2
  const answered = step >= 3

  return (
    <section className="relative h-full w-full overflow-hidden">
      {/* The question starts as the slide and moves up to label it. */}
      <p
        className="absolute left-[120px] origin-top-left font-semibold text-[length:var(--slide-title-size)] text-primary leading-[1.06] tracking-[-0.02em]"
        data-slide-statement-text=""
        style={{
          top: 0,
          transform: shown ? "translateY(110px) scale(0.6)" : "translateY(440px)",
          transition: still ? "none" : "transform 600ms cubic-bezier(0.2, 0.7, 0.2, 1)",
        }}
      >
        {answered ? (
          <Words key="answer" text="The schema is all of them." />
        ) : shared ? (
          <Words key="shared" text="A Document Type is the shape they share." />
        ) : (
          <Words key="question" text="What is a schema?" />
        )}
      </p>

      {/* More articles behind the first, so one shape reads as many pages. */}
      {[2, 1].map((depth) => (
        <div
          className="absolute"
          key={depth}
          style={{
            height: PAGE.height,
            left: PAGE.left + depth * 28,
            top: PAGE.top - depth * 28,
            width: PAGE.width,
            ...fade(shared, (2 - depth) * 160, still, 0),
            filter: "brightness(0.55)",
          }}
        >
          <Page heading={depth === 1 ? "Umbraco DK meetup recap" : "What\u2019s new in Umbraco 17"} />
        </div>
      ))}

      <div
        className="absolute"
        style={{
          height: PAGE.height,
          left: PAGE.left,
          top: PAGE.top,
          width: PAGE.width,
          ...fade(shown, PAGE_AT, still),
        }}
      >
        <Page heading="Building an Umbraco package" />
      </div>

      {/* More Document Types behind this one, so the schema reads as all of them. */}
      {OTHER_TYPES.map((name, index) => {
        const depth = OTHER_TYPES.length - index
        return (
          <div
            className="absolute border border-[var(--slide-surface-border)] bg-card px-8 pt-2"
            key={name}
            style={{
              height: 660,
              left: PANEL.left + depth * 22,
              top: PANEL.top - depth * 40,
              width: PANEL.width,
              ...fade(answered, index * 140, still, 0),
              filter: `brightness(${1 - depth * 0.15})`,
            }}
          >
            <p className="font-bold text-[1.4rem] text-foreground">{name}</p>
          </div>
        )
      })}

      <div
        className="absolute border border-[var(--slide-surface-border)] bg-card px-8 py-6"
        data-slide-surface=""
        style={{ left: PANEL.left, top: PANEL.top, width: PANEL.width, ...fade(shown, PANEL_AT, still) }}
      >
        <p className="font-mono text-[1.1rem] text-muted-foreground uppercase tracking-[0.12em]">
          Document Type
        </p>
        <p className="pt-1 font-bold text-[2.2rem] text-foreground leading-[1.1]">
          {articlePage?.name}
          <span className="pl-4 font-mono font-normal text-[1.3rem] text-muted-foreground">
            {articlePage?.alias}
          </span>
        </p>
        <div className="pt-6">
          {FIELDS.map((field) => {
            const property = properties.get(field.alias)
            return (
              <div
                className="flex h-[86px] flex-col justify-center border-[var(--slide-surface-border)] border-t"
                key={field.alias}
              >
                <p className="text-[1.6rem] text-foreground leading-[1.2]">
                  {property?.name}
                  <span className="pl-3 font-mono text-[1.15rem] text-muted-foreground">
                    {field.alias}
                  </span>
                </p>
                <p className="font-mono text-[1.1rem] text-primary">{property?.dataTypeName}</p>
              </div>
            )
          })}
        </div>
      </div>

      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0"
        height={1080}
        viewBox="0 0 1920 1080"
        width={1920}
      >
        {FIELDS.map((field, index) => {
          const from = { x: PAGE.left + PAGE.width, y: field.y }
          const to = { x: PANEL.left, y: ROW_TOP + ROW_GAP * index + ROW_GAP / 2 }
          return (
            <g key={field.alias}>
              <path
                d={`M ${from.x} ${from.y} C ${from.x + 150} ${from.y}, ${to.x - 150} ${to.y}, ${to.x} ${to.y}`}
                fill="none"
                pathLength={1}
                stroke="var(--primary)"
                strokeDasharray={1}
                strokeDashoffset={shown ? 0 : 1}
                strokeLinecap="round"
                strokeWidth={2.5}
                style={{
                  filter: "drop-shadow(0 0 4px var(--primary))",
                  // A round cap still draws a dot at a fully offset dash, so a
                  // hidden wire is also transparent.
                  opacity: shown ? 1 : 0,
                  transition: still
                    ? "none"
                    : `stroke-dashoffset 700ms ease-in-out ${shown ? WIRES_AT + index * WIRE_GAP : 0}ms`,
                }}
              />
              <circle
                cx={from.x}
                cy={from.y}
                fill="var(--primary)"
                r={6}
                style={fade(shown, WIRES_AT + index * WIRE_GAP, still, 0)}
              />
            </g>
          )
        })}
      </svg>
    </section>
  )
}
