export type Rgb = readonly [number, number, number]
export interface PhotoPixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

// CIELAB (D65) gives a more useful nearest colour than distance in sRGB.
function lab(rgb: Rgb): number[] {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const transform = (value: number) =>
    value > 216 / 24389 ? Math.cbrt(value) : ((24389 / 27) * value + 16) / 116
  const x = transform((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047)
  const y = transform(0.2126729 * r + 0.7151522 * g + 0.072175 * b)
  const z = transform((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

// Broad wardrobe families, including dark and saturated shades. These are
// reference colours, not learned clothing/material recognition.
const references = [
  ['Schwarz', '#121212'],
  ['Schwarz', '#29282a'],
  ['Weiss', '#ffffff'],
  ['Weiss', '#faf9f6'],
  ['Grau', '#808080'],
  ['Grau', '#bcbcbc'],
  ['Grau', '#525252'],
  ['Beige', '#d6c4ac'],
  ['Beige', '#eee0c5'],
  ['Braun', '#8c6550'],
  ['Braun', '#563422'],
  ['Braun', '#b4773a'],
  ['Blau', '#718ba8'],
  ['Blau', '#173052'],
  ['Blau', '#2459ab'],
  ['Blau', '#0000ff'],
  ['Grün', '#778a73'],
  ['Grün', '#255737'],
  ['Grün', '#168d35'],
  ['Grün', '#00ff00'],
  ['Rot', '#b45d57'],
  ['Rot', '#a3152c'],
  ['Rot', '#ff0000'],
  ['Rosa', '#d5a7b5'],
  ['Rosa', '#f1c1ce'],
  ['Rosa', '#f05d9b'],
  ['Gelb', '#dec17b'],
  ['Gelb', '#ffff00'],
  ['Violett', '#a491b3'],
  ['Violett', '#7628a6'],
  ['Violett', '#5a265e'],
] as const

function fromHex(hex: string): Rgb {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}
const palette = references.map(([name, hex]) => ({
  name,
  lab: lab(fromHex(hex)),
}))

export function nearestWardrobeColor(rgb: Rgb) {
  const sample = lab(rgb)
  let closest = palette[0]
  let distance = Infinity
  for (const reference of palette) {
    const next = Math.hypot(
      ...sample.map((value, index) => value - reference.lab[index]),
    )
    if (next < distance) {
      distance = next
      closest = reference
    }
  }
  return {
    name: closest.name,
    hex: `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`,
  }
}

export function samplePhotoColor(
  pixels: PhotoPixels,
  xPercent: number,
  yPercent: number,
): Rgb | undefined {
  if (
    !Number.isFinite(xPercent) ||
    !Number.isFinite(yPercent) ||
    !Number.isInteger(pixels.width) ||
    !Number.isInteger(pixels.height) ||
    pixels.width < 1 ||
    pixels.height < 1 ||
    pixels.data.length !== pixels.width * pixels.height * 4
  )
    return undefined
  const x = Math.round(
    (Math.max(0, Math.min(100, xPercent)) / 100) * (pixels.width - 1),
  )
  const y = Math.round(
    (Math.max(0, Math.min(100, yPercent)) / 100) * (pixels.height - 1),
  )
  const channels: number[][] = [[], [], []]
  // A small median patch tolerates isolated JPEG noise; it does not find the
  // garment boundary or determine the dominant colour of a patterned fabric.
  for (
    let row = Math.max(0, y - 2);
    row <= Math.min(pixels.height - 1, y + 2);
    row++
  ) {
    for (
      let col = Math.max(0, x - 2);
      col <= Math.min(pixels.width - 1, x + 2);
      col++
    ) {
      const index = (row * pixels.width + col) * 4
      if (pixels.data[index + 3] < 128) continue
      for (let channel = 0; channel < 3; channel++)
        channels[channel].push(pixels.data[index + channel])
    }
  }
  if (!channels[0].length) return undefined
  const values = channels.map(
    (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)],
  )
  return [values[0], values[1], values[2]]
}

export async function readPhotoPixels(photo: Blob): Promise<PhotoPixels> {
  const url = URL.createObjectURL(photo)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () =>
        reject(
          new Error('Das Foto konnte nicht für die Farbprobe geöffnet werden.'),
        )
      img.src = url
    })
    const scale = Math.min(
      1,
      320 / Math.max(image.naturalWidth, image.naturalHeight),
    )
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context)
      throw new Error(
        'Die Farbprobe ist in diesem Browser nicht verfügbar. Du kannst die Farbe weiterhin selbst wählen.',
      )
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    canvas.width = canvas.height = 0
    return { width: pixels.width, height: pixels.height, data: pixels.data }
  } finally {
    URL.revokeObjectURL(url)
  }
}
