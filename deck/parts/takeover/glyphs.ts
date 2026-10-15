/*
 * The two pictures the shader reads besides the corporate slide: an atlas of
 * rain glyphs, and the title as a coverage mask laid over the character grid.
 * Both are drawn with Canvas 2D at mount, from the fonts the deck already
 * loaded, so nothing here is a shipped image.
 */

// The film's rain is half-width katakana, mirrored, with digits mixed in.
const katakana = "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ"
const digits = "0123456789"
const symbols = "Z:.=*+-<>|"
// A projector laptop without a Japanese face still gets rain, in Latin.
const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const japaneseFaces =
  "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Yu Gothic', 'Meiryo', 'MS Gothic', 'Noto Sans CJK JP', IPAGothic"

export const atlasGrid = [8, 8] as const

// One atlas cell has the aspect of one canvas cell, at three times its size.
const atlasCell = [60, 78] as const

function hasJapaneseFace() {
  // A face that lacks katakana draws the same tofu for it as for an
  // unassigned code point, so two identical rasters mean there is no face.
  const probe = document.createElement("canvas")
  probe.width = 32
  probe.height = 32
  const context = probe.getContext("2d", { willReadFrequently: true })
  if (!context) {
    return false
  }
  const raster = (character: string) => {
    context.clearRect(0, 0, 32, 32)
    context.font = `24px ${japaneseFaces}`
    context.fillText(character, 2, 26)
    return context.getImageData(0, 0, 32, 32).data.join(",")
  }
  return raster("ｱ") !== raster("\u{10FFFD}")
}

export function drawGlyphAtlas(monoFamily: string) {
  const japanese = hasJapaneseFace()
  const set = (japanese ? katakana + digits + symbols : latin + digits + symbols)
    .split("")
    .slice(0, atlasGrid[0] * atlasGrid[1])

  const canvas = document.createElement("canvas")
  canvas.width = atlasGrid[0] * atlasCell[0]
  canvas.height = atlasGrid[1] * atlasCell[1]
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("The glyph atlas needs a 2D canvas.")
  }

  context.fillStyle = "#ffffff"
  context.textAlign = "center"
  context.textBaseline = "middle"

  set.forEach((character, index) => {
    const x = (index % atlasGrid[0]) * atlasCell[0]
    const y = Math.floor(index / atlasGrid[0]) * atlasCell[1]
    const isKana = katakana.includes(character)
    context.save()
    context.translate(x + atlasCell[0] / 2, y + atlasCell[1] / 2)
    if (isKana) {
      // Half-width kana are drawn narrow and thin. Widen and embolden them
      // so they hold up at rain size next to the digits.
      context.scale(-1.45, 1)
      context.font = `600 56px ${japaneseFaces}`
      context.strokeStyle = "#ffffff"
      context.lineWidth = 3
      context.strokeText(character, 0, 2)
    } else {
      context.font = `700 54px ${monoFamily}`
    }
    context.fillText(character, 0, 2)
    context.restore()
  })

  return { canvas, count: set.length }
}

export interface TextBox {
  font: string
  left: number
  letterSpacing: string
  lineHeight: number
  text: string
  top: number
}

// A rectangle of the slide, in slide pixels.
export interface Area {
  left: number
  top: number
  width: number
  height: number
}

function measurer() {
  const context = document.createElement("canvas").getContext("2d")
  if (!context) {
    throw new Error("Measuring text needs a 2D canvas.")
  }
  return context
}

// CSS centres the font's ascent and descent in the line box, so the
// baseline sits half the leading plus the ascent below the box top.
function baselineOf(context: CanvasRenderingContext2D, box: TextBox) {
  context.font = box.font
  context.letterSpacing = box.letterSpacing
  const metrics = context.measureText(box.text)
  const ascent = metrics.fontBoundingBoxAscent
  const descent = metrics.fontBoundingBoxDescent
  return box.top + (box.lineHeight - (ascent + descent)) / 2 + ascent
}

// Red is coverage. Green is the same shape blurred by `blur` mask pixels,
// for a glow or a quiet zone. `scale` is mask pixels per slide pixel, so a
// mask can be drawn finer than the slide where the camera will get close.
export function drawTextMask(
  area: Area,
  scale: number,
  boxes: TextBox[],
  blur = 0
) {
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(area.width * scale)
  canvas.height = Math.ceil(area.height * scale)
  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("A text mask needs a 2D canvas.")
  }

  const paint = (style: string, filter: string) => {
    context.save()
    context.scale(scale, scale)
    context.translate(-area.left, -area.top)
    context.filter = filter
    context.fillStyle = style
    context.textBaseline = "alphabetic"
    for (const box of boxes) {
      const baseline = baselineOf(context, box)
      context.fillText(box.text, box.left, baseline)
    }
    context.restore()
  }

  context.globalCompositeOperation = "lighter"
  if (blur > 0) {
    paint("rgb(0 255 0)", `blur(${blur}px)`)
  }
  paint("rgb(255 0 0)", "none")

  return canvas
}

// The slide area the boxes' text covers, with `pad` slide pixels around it.
export function areaOf(boxes: TextBox[], pad: number): Area {
  const context = measurer()
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const box of boxes) {
    context.font = box.font
    context.letterSpacing = box.letterSpacing
    left = Math.min(left, box.left)
    top = Math.min(top, box.top)
    right = Math.max(right, box.left + context.measureText(box.text).width)
    bottom = Math.max(bottom, box.top + box.lineHeight)
  }
  return {
    height: bottom - top + pad * 2,
    left: left - pad,
    top: top - pad,
    width: right - left + pad * 2,
  }
}

// One letter of a box, drawn fine enough to dive into, with the point the
// camera aims for: the middle of its first upright stroke, half way up.
export function drawLetter(box: TextBox, index: number, scale: number) {
  const context = measurer()
  context.font = box.font
  context.letterSpacing = box.letterSpacing
  const before = context.measureText(box.text.slice(0, index)).width
  const through = context.measureText(box.text.slice(0, index + 1)).width
  const character = box.text.charAt(index)
  const area = {
    height: box.lineHeight,
    left: box.left + before,
    top: box.top,
    width: through - before,
  }
  const canvas = drawTextMask(area, scale, [
    { ...box, left: area.left, text: character },
  ])

  const baseline = baselineOf(context, { ...box, text: character })
  const cap = context.measureText(character).actualBoundingBoxAscent
  const aimY = baseline - cap / 2
  const row = Math.min(
    canvas.height - 1,
    Math.max(0, Math.round((aimY - area.top) * scale))
  )
  const pixels = canvas
    .getContext("2d")
    ?.getImageData(0, row, canvas.width, 1).data
  let first = -1
  let last = -1
  for (let x = 0; pixels && x < canvas.width; x += 1) {
    const covered = (pixels[x * 4] ?? 0) > 127
    if (covered && first < 0) {
      first = x
    }
    if (covered) {
      last = x
    } else if (first >= 0) {
      break
    }
  }
  // A letter with no stroke on that row still gets a dive, into its middle.
  const found = first >= 0
  return {
    area,
    canvas,
    focus: [
      found ? area.left + (first + last + 1) / 2 / scale : area.left + area.width / 2,
      aimY,
    ] as const,
    stroke: found ? (last - first + 1) / scale : area.width / 4,
  }
}

// Resolves any CSS colour, oklch and color-mix included, to sRGB floats.
export function resolveColour(colour: string, fallback: string) {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) {
    return [0, 0, 0, 1] as const
  }
  context.fillStyle = fallback
  context.fillStyle = colour || fallback
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return [r / 255, g / 255, b / 255, 1] as const
}
