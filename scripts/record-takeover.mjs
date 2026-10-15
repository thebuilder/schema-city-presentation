#!/usr/bin/env node
/*
 * Records the takeover to public/takeover/takeover.webm, the video the slide
 * plays when the presenting browser has no WebGPU.
 *
 * Every frame of the takeover is a pure function of time, so this does not
 * screen-record anything. It opens the slide with ?record, asks it for each
 * frame in turn, and screenshots it with the typed lines and the title in
 * place. That works on a software adapter at any speed and gives the same
 * frames every run.
 *
 *   npm run dev                         # in one terminal
 *   npm run record:takeover             # in another
 *
 * Options: --url (default http://localhost:3000), --fps (30), --chromium
 * (a browser binary, for machines where Playwright's own is not installed).
 * Needs ffmpeg with libvpx-vp9 on the PATH.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { chromium } from "playwright"

const { values } = parseArgs({
  options: {
    chromium: { type: "string" },
    fps: { default: "30", type: "string" },
    url: { default: "http://localhost:3000", type: "string" },
  },
})

// The settled title plus a beat, so the video ends on the finished slide.
const duration = 13
const fps = Number(values.fps)
const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const output = join(root, "public", "takeover", "takeover.webm")
const frames = mkdtempSync(join(tmpdir(), "takeover-"))

const browser = await chromium.launch({
  args: [
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=swiftshader",
    "--use-vulkan=swiftshader",
    "--use-webgpu-adapter=swiftshader",
    "--disable-vulkan-surface",
  ],
  executablePath: values.chromium,
  headless: false,
})

try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { height: 1080, width: 1920 },
  })
  page.on("pageerror", (error) => console.error(error))
  await page.goto(`${values.url}/slides/takeover?record`)
  // The deck controls and the dev overlay are not part of the slide.
  await page.addStyleTag({
    content: "[data-deck-controls], nextjs-portal { display: none !important; }",
  })
  await page.waitForFunction(() => window.takeoverRecorder, null, {
    timeout: 120_000,
  })
  const slide = page.locator("[data-takeover]")

  const count = Math.round(duration * fps)
  for (let index = 0; index < count; index += 1) {
    await page.evaluate(
      (time) => window.takeoverRecorder.seek(time),
      index / fps
    )
    await slide.screenshot({
      path: join(frames, `${String(index).padStart(5, "0")}.png`),
    })
    if (index % fps === 0) {
      console.log(`${index / fps}s of ${duration}s`)
    }
  }
} finally {
  await browser.close()
}

mkdirSync(dirname(output), { recursive: true })
execFileSync(
  "ffmpeg",
  [
    "-y",
    "-loglevel",
    "error",
    "-framerate",
    String(fps),
    "-i",
    join(frames, "%05d.png"),
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "36",
    "-b:v",
    "0",
    "-row-mt",
    "1",
    "-pix_fmt",
    "yuv420p",
    output,
  ],
  { stdio: "inherit" }
)
rmSync(frames, { force: true, recursive: true })
console.log(`Wrote ${output}`)
