"use client"

import { useIsPresenterPreview } from "@thebuilder/deckard-core/components"
import { useStill } from "@/deck/parts/beats"
import { FsnWorld } from "@/deck/parts/fsn-world"

const site = "https://fsn.thebuilder.dk/"

// The site's own demo world. Its files are only ever looked at from outside
// here, never opened, so every resource is a name with nothing behind it.
const unread = (id: string) => ({ id, readable: false })
const loadDemo = async () => {
  const { createDemoFilesystem } = await import("@fsn/app/demo")
  return createDemoFilesystem({ bytes: unread, text: unread, url: unread }).root
}

/*
 * The rebuild, running in the slide. This is fsn's own renderer from
 * vendor/fsn on the site's demo world, so it needs no network and looks the
 * way the site does. fsn.thebuilder.dk refuses to be framed
 * (frame-ancestors 'none'), so the site itself is a link in the address
 * strip rather than a frame.
 *
 * The mouse flies it the way it flies the site: drag to orbit, scroll to
 * zoom, double-click a directory to walk in. The arrow keys still step the
 * deck. The presenter console's preview and screenshots get a still copy.
 */
export function Fsn() {
  const preview = useIsPresenterPreview()
  const still = useStill()
  const live = !(preview || still)

  return (
    <section className="relative flex h-full w-full flex-col">
      <a
        className="flex shrink-0 items-center gap-4 border-[var(--slide-rule)] border-b bg-[var(--slide-surface)] px-[var(--slide-padding-inline)] py-3 font-mono text-[length:var(--slide-support-size)]"
        href={site}
        rel="noreferrer"
        target="_blank"
      >
        <span
          aria-hidden
          className="size-[0.6em] bg-primary"
          style={{ boxShadow: "var(--slide-halo)" }}
        />
        <span className="text-foreground">{site}</span>
        <span className="ml-auto text-muted-foreground">
          {live ? "drag to fly" : "demo world"}
        </span>
      </a>
      <div className="relative mb-[var(--slide-footer-space)] min-h-0 flex-1">
        <FsnWorld
          className="absolute inset-0"
          interactive={live}
          load={loadDemo}
          still={still}
        />
      </div>
    </section>
  )
}
