"use client"

import { useStill } from "@/deck/parts/beats"
import styles from "@/deck/parts/line.module.css"

/*
 * The one-line slides: the statements that carry the talk between the scenes. A line is the whole slide, so it is set at
 * display size and switched on from the moment the slide mounts, the words
 * flaring up in a quick ripple. A click never waits on the reveal.
 */

// A ripple across the line rather than a word at a time: a seven word line
// is whole in under half a second, so the room reads it instead of waiting
// for it.
const STAGGER = 45

function Words({ delay = 0, text }: { delay?: number; text: string }) {
  const still = useStill()
  const words = text.split(" ")
  return words.map((word, index) => (
    <span
      className={still ? styles.still : styles.word}
      // A word can repeat in a line, so its place is its key.
      // biome-ignore lint/suspicious/noArrayIndexKey: the words never reorder
      key={index}
      style={{ animationDelay: `${delay + index * STAGGER}ms` }}
    >
      {index < words.length - 1 ? `${word} ` : word}
    </span>
  ))
}

/*
 * A claim in the speaker's own voice. Set at display size with a lit rule over it,
 * so a line reads as a beat of the talk rather than a caption.
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
