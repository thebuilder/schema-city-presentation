/*
 * Whether the takeover slide should play from the top when it mounts.
 *
 * The deck navigates client-side, so this module outlives each slide. A fresh
 * page load starts armed, which lets a rehearsal open the takeover slide
 * directly. Playing disarms it, so stepping back from the next slide lands on
 * the settled title instead of running the whole sequence again. The fake-out
 * re-arms it.
 */
let armed = true

export function armTakeover() {
  armed = true
}

export function claimTakeover() {
  const wasArmed = armed
  armed = false
  return wasArmed
}
