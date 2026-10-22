/*
 * "Midnight at the Terminal", the soundtrack of thebuilder.dk, for the closing
 * slide. The site reads it the same way (components/soundtrack.tsx and
 * lib/beat.ts in thebuilder-dk): an analyser split into low, mid and high
 * bands, and a beat counted from the track's own clock at 120 BPM.
 */
const TRACK = "/close/midnight-at-the-terminal.mp3"

// The site plays it at 0.3. A room needs it louder than a laptop does.
const LEVEL = 0.6
const FADE_IN = 1.5
const FADE_OUT = 0.6

const LOW = [20, 160] as const
const MID = [160, 2000] as const
const HIGH = [2000, 8000] as const

export interface Bands {
  high: number
  low: number
  mid: number
}

export interface Music {
  /** The track's clock in seconds, so the beat stays on the music. */
  at: () => number
  bands: () => Bands
  spectrum: () => Uint8Array
  stop: () => void
}

// One element for the whole deck, made as the deck loads, so the file is
// fetched and decoded long before the last slide asks for it. Made on the
// slide instead, the first bars came in late.
let track: HTMLAudioElement | undefined

function element() {
  if (!track) {
    track = new Audio(TRACK)
    track.preload = "auto"
    track.loop = true
    track.load()
  }
  return track
}

// A pause waiting for a fade out, cancelled if the slide comes straight back.
let pausing = 0

export function preloadMusic() {
  element()
}

// The context outlives the slide: an element can be wired into a context once.
let graph:
  | { analyser: AnalyserNode; context: AudioContext; gain: GainNode }
  | undefined

function connect(audio: HTMLAudioElement) {
  if (!graph) {
    const context = new AudioContext()
    const source = context.createMediaElementSource(audio)
    const gain = context.createGain()
    const analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.72
    source.connect(gain)
    gain.connect(analyser)
    analyser.connect(context.destination)
    graph = { analyser, context, gain }
  }
  return graph
}

function averageBetween(
  spectrum: Uint8Array,
  hzPerBin: number,
  [from, to]: readonly [number, number]
) {
  const first = Math.max(1, Math.floor(from / hzPerBin))
  const last = Math.min(spectrum.length - 1, Math.ceil(to / hzPerBin))
  let sum = 0
  for (let bin = first; bin <= last; bin += 1) {
    sum += spectrum[bin] ?? 0
  }
  return last < first ? 0 : sum / (last - first + 1) / 255
}

/**
 * Starts the track from the top and fades it up. The key press that reached
 * the slide is the user activation that lets it play. Without Web Audio it
 * still plays, and the world simply has nothing to move to.
 */
export function startMusic(): Music | null {
  const audio = element()
  window.clearTimeout(pausing)
  let wired: ReturnType<typeof connect> | undefined
  try {
    wired = connect(audio)
  } catch {
    wired = undefined
  }
  audio.currentTime = 0
  if (wired) {
    const { context, gain } = wired
    context.resume().catch(() => undefined)
    gain.gain.cancelScheduledValues(context.currentTime)
    gain.gain.setValueAtTime(0, context.currentTime)
    gain.gain.linearRampToValueAtTime(LEVEL, context.currentTime + FADE_IN)
  } else {
    audio.volume = LEVEL
  }
  audio.play().catch(() => undefined)

  const spectrum = new Uint8Array(wired?.analyser.frequencyBinCount ?? 0)
  const bands: Bands = { high: 0, low: 0, mid: 0 }
  const hzPerBin = wired
    ? wired.context.sampleRate / 2 / wired.analyser.frequencyBinCount
    : 1

  return {
    at: () => audio.currentTime,
    bands() {
      if (wired) {
        wired.analyser.getByteFrequencyData(spectrum)
        bands.low = averageBetween(spectrum, hzPerBin, LOW)
        bands.mid = averageBetween(spectrum, hzPerBin, MID)
        bands.high = averageBetween(spectrum, hzPerBin, HIGH)
      }
      return bands
    },
    spectrum: () => spectrum,
    stop() {
      if (!wired) {
        audio.pause()
        return
      }
      const { context, gain } = wired
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime)
      gain.gain.linearRampToValueAtTime(0, context.currentTime + FADE_OUT)
      pausing = window.setTimeout(() => audio.pause(), FADE_OUT * 1000)
    },
  }
}
