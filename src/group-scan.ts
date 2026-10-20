import {
  parseAttributes,
  readAIConnection,
  type PhotoAttributes,
} from './cloud-ai'
import { AIProviderError, describeAIProblem, providerError } from './ai-errors'
import { blobToDataURL } from './photos'
import type { GarmentDraft } from './model'
import { db, saveGarment } from './db'

export type GarmentBox = [number, number, number, number]
export interface DetectedGarment {
  box: GarmentBox
  attributes: PhotoAttributes
}
export interface ScannedGarment extends DetectedGarment {
  id: string
  photo: Blob
  cutout?: Blob
  warning?: string
  selected: boolean
}
export function parseGroupDetection(value: unknown): DetectedGarment[] {
  const items = (value as { items?: unknown } | null)?.items
  if (!Array.isArray(items) || !items.length || items.length > 6)
    throw new Error(
      'Keine eindeutige Auswahl erkannt. Fotografiere bis zu sechs getrennt sichtbare Stücke nebeneinander.',
    )
  const parsed = items.map((value) => {
    const item = value as { box?: unknown; attributes?: unknown }
    const box = item?.box
    if (
      !Array.isArray(box) ||
      box.length !== 4 ||
      !box.every(
        (n) =>
          typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1000,
      ) ||
      box[2] - box[0] < 10 ||
      box[3] - box[1] < 10
    )
      throw new Error(
        'Die KI konnte die Bildbereiche nicht zuverlässig bestimmen. Versuche ein übersichtlicheres Foto.',
      )
    return {
      box: box as GarmentBox,
      attributes: parseAttributes(item.attributes),
    }
  })
  for (let i = 0; i < parsed.length; i++)
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i].box,
        b = parsed[j].box
      const overlap =
        Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) *
        Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]))
      const union =
        (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - overlap
      if (overlap / union > 0.85)
        throw new Error(
          'Die KI hat denselben Bildbereich mehrfach erkannt. Bitte ordne die Stücke mit etwas Abstand an.',
        )
    }
  return parsed
}
function permitted(signal: AbortSignal) {
  signal.throwIfAborted()
  const connection = readAIConnection()
  if (!connection?.enabled || connection.mode !== 'community')
    throw new Error(
      'Aktiviere für den Mehrfachscan die kostenlose Community-Foto-KI.',
    )
}
export async function detectGarments(
  photo: Blob,
  signal: AbortSignal,
): Promise<DetectedGarment[]> {
  permitted(signal)
  const { callCommunity, VISION_HOST } = await import('./community-ai')
  const encoded = (await blobToDataURL(photo)).split(',')[1]
  permitted(signal)
  const prompt = `Locate up to six distinct clothing items in this image. Return ONLY JSON: {"items":[{"box":[left,top,right,bottom],"attributes":{"name":"short German name","category":"Oberteile|Hosen|Kleider|Jacken|Schuhe|Accessoires","color":"Schwarz|Weiss|Grau|Beige|Braun|Blau|Grün|Rot|Rosa|Gelb|Violett|Bunt or empty","brand":"only if legible, else empty","seasons":[],"styles":[],"notes":"short German description"}}]}. Coordinates MUST be normalized 0..1000 relative to the whole image. Tight boxes must include the WHOLE garment, not faces, background objects or separate sleeves. Treat a matching pair of shoes as ONE item. Do not invent unseen items. If ambiguous, omit that item. Return an empty items list if no garments are clear. Seasons can only contain Frühling, Sommer, Herbst, Winter. Styles can only contain Casual, Minimalistisch, Elegant, Sportlich, Streetwear, Vintage. Leave uncertain brand, season and style empty.`
  const result = await callCommunity(
    VISION_HOST,
    'run_router',
    ['Qwen3-VL-8B-Instruct', prompt, encoded, 1600, 0.1, 0.9, 50, 1.05, 60],
    signal,
  )
  permitted(signal)
  if (!Array.isArray(result) || typeof result[0] !== 'string')
    throw new AIProviderError('invalid')
  const text = result[0]
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
  if (/^\[ERROR\]/i.test(text)) throw providerError(text)
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new AIProviderError('invalid')
  }
  return parseGroupDetection(data)
}
export async function cropGarment(photo: Blob, box: GarmentBox): Promise<Blob> {
  const url = URL.createObjectURL(photo)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const [left, top, right, bottom] = box
    const x = Math.round((left * image.naturalWidth) / 1000),
      y = Math.round((top * image.naturalHeight) / 1000)
    const width = Math.max(
      1,
      Math.min(
        image.naturalWidth - x,
        Math.round(((right - left) * image.naturalWidth) / 1000),
      ),
    )
    const height = Math.max(
      1,
      Math.min(
        image.naturalHeight - y,
        Math.round(((bottom - top) * image.naturalHeight) / 1000),
      ),
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('Der Bildausschnitt konnte nicht erstellt werden.')
    context.drawImage(image, x, y, width, height, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(
                new Error(
                  'Der Bildausschnitt konnte nicht gespeichert werden.',
                ),
              ),
        'image/jpeg',
        0.9,
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
export async function cutoutGarment(photo: Blob, signal: AbortSignal) {
  permitted(signal)
  const { removeBackground } = await import('./community-ai')
  const cutout = await removeBackground(photo, signal)
  permitted(signal)
  return cutout
}
export function scanProblem(error: unknown) {
  return describeAIProblem('Mehrfachscan', error)
}
export async function saveScannedGarments(
  items: ScannedGarment[],
  database = db,
) {
  const selected = items.filter((item) => item.selected)
  if (!selected.length || selected.length > 6)
    throw new Error('Wähle ein bis sechs Stücke zum Speichern aus.')
  return database.transaction(
    'rw',
    database.garments,
    database.preferences,
    async () => {
      for (const item of selected) {
        const draft: GarmentDraft = {
          ...item.attributes,
          photo: item.photo,
          cutout: item.cutout,
          favorite: false,
        }
        await saveGarment(draft, undefined, database)
      }
      return selected.length
    },
  )
}
