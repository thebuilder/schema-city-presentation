import {
  effect,
  type FrameLoopHandle,
  frame,
  frameLoop,
  type Gpu,
  init,
  sampler,
  surface,
  target,
  texture,
} from "vgpu"
import {
  atlasGrid,
  drawGlyphAtlas,
  drawTitleMask,
  type TitleBox,
} from "@/deck/parts/takeover/glyphs"
import { timeline } from "@/deck/parts/takeover/timeline"
import takeoverShader from "@/deck/parts/takeover/takeover.wgsl"

type Rgba = readonly [number, number, number, number]

export interface TakeoverScene {
  canvas: HTMLCanvasElement
  // The corporate slide as it is on screen, to be torn apart.
  slide: SVGSVGElement
  titles: TitleBox[]
  colours: { bright: Rgba; ground: Rgba; ink: Rgba }
  monoFamily: string
  // Called with the sequence time before each frame draws, for the DOM layers.
  onFrame: (time: number) => void
  // Draw offscreen and copy each frame into a 2D canvas instead of presenting.
  // Slower, but it works where a WebGPU canvas cannot present, such as the
  // software adapter the fallback is recorded on.
  readback?: boolean
}

export interface Takeover {
  // Starts the clock at `from` seconds and runs until disposed.
  play: (from?: number) => void
  // Draws the frame at `time` and holds it, for scrubbing and recording.
  seek: (time: number) => Promise<void>
  dispose: () => void
}

// The slide's own coordinate space. The deck scales the canvas to fit the
// screen, so everything here is in these units whatever the projector is.
const canvasSize = [1920, 1080] as const
const cellSize = [20, 26] as const

// The beats the shader keys on. The typed lines and the credits are DOM only.
const shaderTimeline = {
  crtDot: timeline.crtDot,
  crtEnd: timeline.crtEnd,
  crtLine: timeline.crtLine,
  crtStart: timeline.crtStart,
  lockEnd: timeline.lockEnd,
  lockStart: timeline.lockStart,
  rainSpread: timeline.rainSpread,
  rainStart: timeline.rainStart,
  settle: timeline.settle,
  titleStart: timeline.titleStart,
}

async function rasterise(svg: SVGSVGElement, scale: number) {
  const copy = svg.cloneNode(true) as SVGSVGElement
  copy.setAttribute("width", String(canvasSize[0] * scale))
  copy.setAttribute("height", String(canvasSize[1] * scale))
  copy.removeAttribute("style")
  const markup = new XMLSerializer().serializeToString(copy)
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml" })
  )
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return await createImageBitmap(image)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function upload(
  gpu: Gpu,
  source: ImageBitmap | HTMLCanvasElement,
  label: string
) {
  const size = [source.width, source.height] as const
  const uploaded = texture(gpu, {
    format: "rgba8unorm",
    kind: "2d",
    label,
    size,
    // copyExternalImageToTexture writes through a render attachment.
    usage: ["texture_binding", "copy_dst", "render_attachment"],
  })
  gpu.gpu.queue.copyExternalImageToTexture(
    { source },
    { texture: uploaded.gpu },
    size
  )
  return uploaded
}

export async function createTakeover(scene: TakeoverScene): Promise<Takeover> {
  if (!("gpu" in navigator)) {
    throw new Error("WebGPU is not available in this browser.")
  }

  const gpu = await init()
  let loop: FrameLoopHandle | undefined

  try {
    const scale = Math.min(2, Math.max(1, Math.ceil(window.devicePixelRatio)))
    const [slideImage] = await Promise.all([
      rasterise(scene.slide, scale),
      document.fonts.ready,
    ])
    const atlas = drawGlyphAtlas(scene.monoFamily)
    const mask = drawTitleMask(canvasSize, scene.titles)

    const offscreen = scene.readback
      ? target(gpu, { format: "rgba8unorm", size: canvasSize })
      : undefined
    const output = offscreen ?? surface(gpu, scene.canvas, { dpr: [1, 2] })
    const takeover = effect(gpu, takeoverShader, {
      label: "takeover",
      set: {
        atlas: upload(gpu, atlas.canvas, "glyph atlas"),
        mask: upload(gpu, mask, "title mask"),
        params: {
          ...shaderTimeline,
          atlasGrid,
          bright: scene.colours.bright,
          canvas: canvasSize,
          cell: cellSize,
          glyphCount: atlas.count,
          grid: [canvasSize[0] / cellSize[0], canvasSize[1] / cellSize[1]],
          ground: scene.colours.ground,
          ink: scene.colours.ink,
          time: 0,
        },
        samp: sampler(gpu, { magFilter: "linear", minFilter: "linear" }),
        slide: upload(gpu, slideImage, "corporate slide"),
      },
    })
    slideImage.close()
    await takeover.compile(output)

    const copyOut = async () => {
      if (!offscreen) {
        return
      }
      const pixels = await offscreen.color.read({ mipLevel: 0, region: "all" })
      scene.canvas.width = canvasSize[0]
      scene.canvas.height = canvasSize[1]
      scene.canvas
        .getContext("2d")
        ?.putImageData(
          new ImageData(new Uint8ClampedArray(pixels), canvasSize[0], canvasSize[1]),
          0,
          0
        )
    }

    const draw = (time: number) => {
      frame(gpu, (current) => {
        scene.onFrame(time)
        takeover.set({ params: { time } })
        current.pass(output, takeover)
      })
    }

    return {
      dispose() {
        loop?.stop()
        gpu.dispose()
      },
      play(from = 0) {
        loop?.stop()
        const start = performance.now() - from * 1000
        loop = frameLoop(gpu, (current) => {
          const time = (performance.now() - start) / 1000
          scene.onFrame(time)
          takeover.set({ params: { time } })
          current.pass(output, takeover)
        })
      },
      async seek(time) {
        loop?.stop()
        loop = undefined
        draw(time)
        await gpu.settled()
        await copyOut()
      },
    }
  } catch (error) {
    gpu.dispose()
    throw error
  }
}
