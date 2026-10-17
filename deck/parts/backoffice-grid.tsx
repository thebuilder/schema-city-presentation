"use client"

import { Words } from "@/deck/parts/line"

/*
 * Four screens of the real backoffice, then one line a beat after them. The
 * frames are labelled stand-ins until the screenshots are taken: the shot list
 * is in storyline-v2.md, and each frame becomes an image with the same caption.
 */
const shots = [
  "The Document Types tree, expanded three levels",
  "A document type's property groups",
  "The compositions dialog",
  "The alias error on save",
]

// After the room has had time to recognise the screens.
const LINE_DELAY = 1800

export function BackofficeGrid() {
  return (
    <section className="flex h-full flex-col justify-center gap-12">
      <div className="grid grid-cols-2 gap-[var(--slide-content-gap)]">
        {shots.map((shot) => (
          <figure
            className="flex h-[300px] items-end border-2 border-[var(--slide-surface-border)] border-dashed p-6"
            key={shot}
          >
            <figcaption className="font-[family-name:var(--slide-font-mono)] text-[length:var(--slide-label-size)] text-muted-foreground uppercase tracking-[var(--slide-label-tracking)]">
              {`todo :: ${shot}`}
            </figcaption>
          </figure>
        ))}
      </div>
      <p
        className="font-semibold text-[length:var(--slide-heading-size)] text-primary leading-[1.1]"
        data-slide-statement-text=""
      >
        <Words delay={LINE_DELAY} text="This is how we see our content model." />
      </p>
    </section>
  )
}
