"use client"

import { useStill } from "@/deck/parts/beats"
import styles from "@/deck/parts/line.module.css"

/*
 * The one-line slides: the inner voice near the start and the statements that
 * carry the talk between the scenes. A line is the whole slide, so it is set at
 * display size and revealed a word at a time from the moment the slide mounts.
 * That paces the room to the speaker, and a click never waits on the reveal.
 */

// Long enough that each word is read on its own, short enough that a five
// word line has landed before the speaker has finished saying it.
const STAGGER = 220

function Words({ delay = 0, text }: { delay?: number; text: string }) {
  const still = useStill()
  const words = text.split(" ")
  return words.map((word, index) => (
    <span
      className={still ? styles.still : styles.word}
      // A word can repeat ("Expand. Expand. Expand."), so its place is its key.
      // biome-ignore lint/suspicious/noArrayIndexKey: the words never reorder
      key={index}
      style={{ animationDelay: `${delay + index * STAGGER}ms` }}
    >
      {index < words.length - 1 ? `${word} ` : word}
    </span>
  ))
}

/*
 * Something the audience has said to themselves at their own desk, in the
 * first person. The quotation marks are what tell it apart from a claim made
 * by the speaker, so they are part of the line rather than the theme's.
 */
export function Thought({ text }: { text: string }) {
  return (
    <section className="flex h-full flex-col justify-center">
      <p
        className="max-w-[1560px] text-balance font-medium text-[length:var(--slide-title-size)] text-foreground leading-[1.1] tracking-[-0.02em]"
        data-slide-quote-text=""
      >
        <span className="text-muted-foreground">“</span>
        <Words text={text} />
        <span className="text-muted-foreground">”</span>
      </p>
    </section>
  )
}

/*
 * A claim in the speaker's own voice. Same size as a thought and no marks, so
 * the turn from the room's voice to the speaker's is the only thing that
 * changes on screen.
 */
export function Statement({ text }: { text: string }) {
  return (
    <section className="flex h-full flex-col justify-center gap-10">
      <span
        className="block h-[3px] w-[120px] bg-primary"
        data-slide-accent-rule=""
      />
      <p
        className="max-w-[1560px] text-balance font-semibold text-[length:var(--slide-title-size)] text-primary leading-[1.06] tracking-[-0.02em]"
        data-slide-statement-text=""
      >
        <Words text={text} />
      </p>
    </section>
  )
}

export { Words }
