"use client"

import { useEffect, useState } from "react"
import { useBeat, useStill } from "@/deck/parts/beats"
import { FsnWorld } from "@/deck/parts/fsn-world"
import { DOOR_LOCK_MS, DoorLock } from "@/deck/parts/door-lock"
import { FsnWindow } from "@/deck/parts/fsn-window"
import { park, parkDoors, parkHome, parkRaptor, parkSecurity } from "@/deck/parts/park"
import { Terminal } from "@/deck/parts/terminal"

/*
 * The control room, recreated rather than played. fsn is launched from a
 * shell, the park is scanned in and the camera settles over it, the line lands
 * as a subtitle, and then the film plays out in fsn's own windows. The world
 * is fsn's own renderer, so it looks the way fsn does.
 *
 * Beat 0 launches fsn and beat 1 is the line. Beat 2 flies into security and
 * opens velociraptor.webp: the raptor is inside. Beat 3 picks the doors and
 * locks them, the panels sliding shut and the light going green. Each window
 * waits for its flight to land, so it reads as opened from the block the beam
 * points at.
 */
const delays = [3800, 8500, 13000]

// Long enough for the command to finish typing before the tree appears.
const bootDelay = 1500

// Long enough for fsn's flight to the picked block to land.
const landDelay = 1400

const loadPark = () => Promise.resolve(park)

// True `ms` after `on` turns true, and at once for a still.
function useAfter(on: boolean, ms: number, still: boolean): boolean {
  const [after, setAfter] = useState(false)
  useEffect(() => {
    if (!on) {
      setAfter(false)
      return
    }
    if (still) {
      setAfter(true)
      return
    }
    const timer = window.setTimeout(() => setAfter(true), ms)
    return () => window.clearTimeout(timer)
  }, [on, ms, still])
  return after
}

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
  const picked = beat >= 3 ? parkDoors : parkRaptor
  const raptorOpen = useAfter(beat >= 2, landDelay, still)
  const doorsOpen = useAfter(beat >= 3, landDelay, still)
  const locked = useAfter(doorsOpen, DOOR_LOCK_MS, still)

  return (
    <section className="relative h-full w-full overflow-hidden">
      {booted ? (
        <FsnWorld
          className="absolute inset-0"
          focus={focus ? picked : undefined}
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
            {focus ? picked : parkHome}
          </span>
        </p>
      </div>

      <p
        className="absolute inset-x-0 bottom-[calc(var(--slide-footer-space)+3rem)] text-center font-bold text-[length:var(--slide-subheading-size)] text-foreground transition-opacity duration-300"
        style={{
          opacity: beat >= 1 && !doorsOpen ? 1 : 0,
          textShadow: "0 0 0.4em var(--background), var(--slide-halo)",
        }}
      >
        {"It's a UNIX system! I know this!"}
      </p>

      <FsnWindow
        className="top-[8%] right-[var(--slide-padding-inline)] w-[40%]"
        open={raptorOpen}
        path={parkRaptor}
        mode="PIXEL IMAGE VIEWER / 1.0"
        size="237 KB"
        status="IMAGE DECODED"
      >
        {/* biome-ignore lint/performance/noImgElement: a fixed picture inside a decorative window */}
        <img
          className="block w-full"
          src="/fsn/velociraptor.webp"
          alt=""
          width={1536}
          height={1024}
        />
      </FsnWindow>

      <FsnWindow
        className="top-[36%] left-[var(--slide-padding-inline)] w-[30%]"
        open={doorsOpen}
        path={parkDoors}
        mode="ACCESS CONTROL / 1.0"
        size="160 KB"
        status={locked ? "DOORS LOCKED" : "LOCKING"}
      >
        <DoorLock active={doorsOpen} still={still} />
      </FsnWindow>
    </section>
  )
}
