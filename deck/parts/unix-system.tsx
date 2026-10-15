"use client"

import { useEffect, useState } from "react"
import { useBeat, useStill } from "@/deck/parts/beats"
import { FsnWorld } from "@/deck/parts/fsn-world"
import { park, parkDoors, parkHome, parkSecurity } from "@/deck/parts/park"
import { Terminal } from "@/deck/parts/terminal"

/*
 * The control room, recreated rather than played. fsn is launched from a
 * shell, the park is scanned in and the camera settles over it, the line lands
 * as a subtitle, and then the camera walks into security and picks the door
 * locks. The world is fsn's own renderer, so it looks the way fsn does.
 *
 * Beat 0 launches fsn, beat 1 is the line, beat 2 is the flight.
 */
const delays = [3800, 8500]

// Long enough for the command to finish typing before the tree appears.
const bootDelay = 1500

const loadPark = () => Promise.resolve(park)

export function UnixSystem() {
  const beat = useBeat(delays)
  const still = useStill()
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    if (still) {
      setBooted(true)
      return
    }
    const timer = window.setTimeout(() => setBooted(true), bootDelay)
    return () => window.clearTimeout(timer)
  }, [still])

  const focus = beat >= 2

  return (
    <section className="relative h-full w-full overflow-hidden">
      {booted ? (
        <FsnWorld
          className="absolute inset-0"
          focus={focus ? parkDoors : undefined}
          open={focus ? parkSecurity : parkHome}
          load={loadPark}
          still={still}
        />
      ) : null}

      <div className="absolute top-[var(--slide-padding-block)] left-[var(--slide-padding-inline)] border border-[var(--slide-surface-border)] bg-[var(--slide-surface)] px-6 py-4">
        <Terminal
          beat={0}
          entries={[{ command: "fsn /usr/park" }]}
          idle={false}
          prompt="lex@control-room:~$"
          still={still}
        />
        <p
          className="font-mono text-[length:var(--slide-support-size)] text-muted-foreground leading-[1.5] transition-opacity duration-500"
          style={{ opacity: booted ? 1 : 0 }}
        >
          {"location: "}
          <span
            className={
              focus ? "text-[color:var(--slide-signal)]" : "text-foreground"
            }
          >
            {focus ? parkDoors : parkHome}
          </span>
        </p>
      </div>

      <p
        className="absolute inset-x-0 bottom-[calc(var(--slide-footer-space)+3rem)] text-center font-bold text-[length:var(--slide-subheading-size)] text-foreground transition-opacity duration-300"
        style={{
          opacity: beat >= 1 ? 1 : 0,
          textShadow: "0 0 0.4em var(--background), var(--slide-halo)",
        }}
      >
        {"It's a UNIX system! I know this!"}
      </p>
    </section>
  )
}
