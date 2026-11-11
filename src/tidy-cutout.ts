/*
 * "Ausrichten": makes a cut-out sit neatly in the wardrobe, on the device,
 * without any AI call (the free AI quota stays for cut-outs and recognition).
 * A piece held up by hand often hangs at an angle and off centre: the
 * opaque outline is turned upright (at most ±20°, choosing the angle with
 * the smallest bounding box), trimmed and centred on a square with a little
 * room around it. The original photo is never changed.
 */
export type Point = readonly [number, number]

/** Convex hull (Andrew's monotone chain). */
export function convexHull(points: Point[]): Point[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Point[] = []
  for (const p of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
    )
      lower.pop()
    lower.push(p)
  }
  const upper: Point[] = []
  for (const p of sorted.reverse()) {
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
    )
      upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

function boxArea(points: Point[], degrees: number) {
  const r = (degrees * Math.PI) / 180
  const cos = Math.cos(r),
    sin = Math.sin(r)
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity
  for (const [x, y] of points) {
    const u = x * cos - y * sin,
      v = x * sin + y * cos
    if (u < minX) minX = u
    if (u > maxX) maxX = u
    if (v < minY) minY = v
    if (v > maxY) maxY = v
  }
  return (maxX - minX) * (maxY - minY)
}

/**
 * The turn (degrees) that makes the outline upright, or 0 when it already
 * is or the gain is too small to be sure (round shapes, shoes from aside).
 */
export function uprightAngle(points: Point[], limit = 20): number {
  const hull = convexHull(points)
  if (hull.length < 3) return 0
  const straight = boxArea(hull, 0)
  let best = 0,
    bestArea = straight
  for (let a = -limit; a <= limit; a += 0.5) {
    const area = boxArea(hull, a)
    if (area < bestArea) {
      bestArea = area
      best = a
    }
  }
  return straight - bestArea > straight * 0.04 && Math.abs(best) >= 2 ? best : 0
}

/** Opaque sample points of an RGBA image, on a coarse grid. */
export function opaquePoints(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  grid = 160,
): Point[] {
  const step = Math.max(1, Math.round(Math.max(width, height) / grid))
  const points: Point[] = []
  for (let y = 0; y < height; y += step)
    for (let x = 0; x < width; x += step)
      if (data[(y * width + x) * 4 + 3] > 128) points.push([x, y])
  return points
}

/** Bounding box of pixels with real opacity, or null when there are none. */
export function opaqueBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
  return maxX < 0
    ? null
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

function load(blob: Blob) {
  const url = URL.createObjectURL(blob)
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild nicht lesbar'))
    img.src = url
  }).finally(() => URL.revokeObjectURL(url))
}

/** Upright, trimmed and centred; returns the input when it has no cut-out. */
export async function tidyCutout(cutout: Blob, max = 1024): Promise<Blob> {
  const image = await load(cutout)
  const scale = Math.min(
    1,
    max / Math.max(image.naturalWidth, image.naturalHeight),
  )
  const w = Math.max(1, Math.round(image.naturalWidth * scale))
  const h = Math.max(1, Math.round(image.naturalHeight * scale))
  const source = document.createElement('canvas')
  source.width = w
  source.height = h
  const sc = source.getContext('2d', { willReadFrequently: true })
  if (!sc) return cutout
  sc.drawImage(image, 0, 0, w, h)
  const pixels = sc.getImageData(0, 0, w, h).data
  // Only real cut-outs (with transparency) are tidied.
  if (!pixels.some((value, index) => index % 4 === 3 && value < 16))
    return cutout
  const angle = uprightAngle(opaquePoints(pixels, w, h))
  // Turn on a canvas large enough for any rotation.
  const side = Math.ceil(Math.hypot(w, h))
  const turned = document.createElement('canvas')
  turned.width = turned.height = side
  const tc = turned.getContext('2d', { willReadFrequently: true })
  if (!tc) return cutout
  tc.translate(side / 2, side / 2)
  tc.rotate((angle * Math.PI) / 180)
  tc.drawImage(source, -w / 2, -h / 2)
  const box = opaqueBox(tc.getImageData(0, 0, side, side).data, side, side)
  if (!box) return cutout
  // Square with 6 % room: every piece the same size in the grid.
  const size = Math.ceil(Math.max(box.w, box.h) * 1.12)
  const out = document.createElement('canvas')
  out.width = out.height = size
  const oc = out.getContext('2d')
  if (!oc) return cutout
  oc.drawImage(
    turned,
    box.x,
    box.y,
    box.w,
    box.h,
    Math.round((size - box.w) / 2),
    Math.round((size - box.h) / 2),
    box.w,
    box.h,
  )
  return new Promise<Blob>((resolve) =>
    out.toBlob((blob) => resolve(blob ?? cutout), 'image/png'),
  )
}
