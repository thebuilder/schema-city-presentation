"use client"

import Image, { type StaticImageData } from "next/image"
import heroStacked from "@/public/backoffice/hero-stacked.webp"
import homePage from "@/public/backoffice/home-page.webp"
import pageMeta from "@/public/backoffice/page-meta.webp"
import tree from "@/public/backoffice/tree.webp"
import { Words } from "@/deck/parts/line"

/*
 * Four screens of the real ct-baseline backoffice, then one line a beat after
 * them. No captions: the room knows these screens, and naming them would only
 * slow the recognition down.
 */
const shots: { alt: string; src: StaticImageData }[] = [
  { alt: "The Document Types tree, folders expanded", src: tree },
  {
    alt: "Home page on its Content tab, every property inherited from Hero",
    src: homePage,
  },
  {
    alt: "Home page on its Metadata tab, every property inherited from Page Meta",
    src: pageMeta,
  },
  { alt: "Hero opened on top of Home page, one editor stacked on another", src: heroStacked },
]

// After the room has had time to recognise the screens.
const LINE_DELAY = 1800

export function BackofficeGrid() {
  return (
    <section className="flex h-full flex-col justify-center gap-12">
      {/* Sized by height: two 16:9 rows and the line have to fit the canvas,
          so the grid is narrower than the slide rather than cropping the shots. */}
      <div className="grid w-[86rem] max-w-full grid-cols-2 gap-[var(--slide-content-gap)]">
        {shots.map((shot) => (
          <figure
            className="aspect-video overflow-hidden border border-[var(--slide-surface-border)]"
            key={shot.alt}
          >
            <Image
              alt={shot.alt}
              className="h-full w-full object-cover object-top-left"
              placeholder="blur"
              priority
              sizes="43rem"
              src={shot.src}
            />
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
