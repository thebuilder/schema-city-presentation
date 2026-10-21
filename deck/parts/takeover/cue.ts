// Seven ElevenLabs clips mixed onto the takeover's timeline, 15 s from the
// click: the glitch on the click, the tube going off at crtStart, the drone
// under the second line, the riser peaking at the tear, the hit on titleStart.
const cueSound = "/takeover/cue.mp3"

// One element for the whole deck, so the file is fetched and decoded while
// the fake-out is up. Made on first play instead, it started late the first
// time and drifted out of step with the picture.
let cue: HTMLAudioElement | undefined

function element() {
  if (!cue) {
    cue = new Audio(cueSound)
    cue.preload = "auto"
    cue.load()
  }
  return cue
}

export function preloadCue() {
  element()
}

// The click that advanced the deck is the user activation that lets this
// play without a prompt. Only a sequence that runs from the top gets it, so
// stepping back to the settled title stays quiet.
export function playCue() {
  const audio = element()
  audio.currentTime = 0
  audio.play().catch(() => undefined)
  return () => {
    audio.pause()
    audio.currentTime = 0
  }
}
