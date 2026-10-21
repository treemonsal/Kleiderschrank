import { CATEGORIES, COLORS, SEASONS, STYLES, type GarmentDraft } from './model'
import { blobToDataURL, validateBackupPhotos } from './photos'

export interface AIConnection {
  url: string
  code: string
  enabled: boolean
  mode?: 'server' | 'community'
}
export type PhotoAttributes = Pick<
  GarmentDraft,
  'name' | 'category' | 'color' | 'brand' | 'seasons' | 'styles' | 'notes'
>
export type PhotoTask = 'all' | 'attributes' | 'cutout'
export interface AIResult {
  attributes?: PhotoAttributes
  cutout?: Blob
  warnings: string[]
}
export const AI_CONNECTION_KEY = 'mystyle-photo-ai'
export const AI_CONNECTION_CHANGED = 'mystyle-photo-ai-changed'
export function validateConnection(value: AIConnection): AIConnection {
  if (typeof value.enabled !== 'boolean')
    throw new Error('Die Foto-Freigabe ist ungültig.')
  if (value.mode === 'community') {
    if (
      value.url !== 'https://prithivmlmods-qwen3-vl-outpost.hf.space' ||
      value.code !== ''
    )
      throw new Error('Der Community-Dienst ist ungültig.')
    return { ...value, mode: 'community' }
  }
  if (value.mode !== undefined && value.mode !== 'server')
    throw new Error('Unbekannte KI-Verbindung.')
  const url = new URL(value.url.trim())
  if (
    url.protocol !== 'https:' ||
    !/^[a-z0-9-]+\.hf\.space$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error(
      'Bitte die HTTPS-Adresse deines Hugging-Face-Spaces eingeben (… .hf.space).',
    )
  if (value.code.trim().length < 24 || value.code.length > 200)
    throw new Error('Der Verbindungscode muss mindestens 24 Zeichen lang sein.')
  return { url: url.origin, code: value.code.trim(), enabled: value.enabled }
}
export function readAIConnection(): AIConnection | null {
  try {
    const value = JSON.parse(localStorage.getItem(AI_CONNECTION_KEY) || 'null')
    return value ? validateConnection(value) : null
  } catch {
    return null
  }
}
export function saveAIConnection(value: AIConnection | null) {
  const normalized = value ? validateConnection(value) : null
  if (normalized)
    localStorage.setItem(AI_CONNECTION_KEY, JSON.stringify(normalized))
  else localStorage.removeItem(AI_CONNECTION_KEY)
  // Native storage events only reach other documents. Notify other mounted
  // controls in this document too, without putting URL/code/secrets in an event.
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event(AI_CONNECTION_CHANGED))
  return normalized
}
export function stylistEnabled(): boolean {
  const connection = readAIConnection()
  return connection?.enabled === true && connection.mode === 'community'
}
export function parseAttributes(value: unknown): PhotoAttributes {
  if (!value || typeof value !== 'object')
    throw new Error('Die KI hat keine prüfbaren Angaben geliefert.')
  const a = value as Record<string, unknown>
  const text = (key: string, max: number, required = false) => {
    const v = a[key]
    if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
      throw new Error('Die KI-Angaben sind unvollständig oder ungültig.')
    return v.trim()
  }
  const list = <T extends string>(key: string, allowed: readonly T[]): T[] => {
    const v = a[key]
    if (
      !Array.isArray(v) ||
      v.length > allowed.length ||
      !v.every((x) => allowed.includes(x))
    )
      throw new Error('Die KI hat unbekannte Merkmale geliefert.')
    return [...new Set(v)] as T[]
  }
  const category = text('category', 30)
  const color = text('color', 30)
  if (
    !CATEGORIES.includes(category as GarmentDraft['category']) ||
    (color !== '' && !COLORS.some((c) => c.name === color))
  )
    throw new Error('Kategorie oder Farbe konnte nicht zugeordnet werden.')
  return {
    name: text('name', 100, true),
    category: category as GarmentDraft['category'],
    color,
    brand: text('brand', 100),
    seasons: list('seasons', SEASONS),
    styles: list('styles', STYLES),
    notes: text('notes', 2000),
  }
}
async function readResponse(
  response: Response,
  maximum: number,
): Promise<string> {
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        'Der Verbindungscode stimmt nicht. Prüfe ihn unter Mehr → Online-Foto-KI.',
      )
    if (response.status === 429 || response.status === 503)
      throw new Error(
        'Der kostenlose KI-Server ist gerade beschäftigt oder startet. Bitte später erneut versuchen.',
      )
    throw new Error(
      'Der KI-Server konnte das Foto nicht verarbeiten. Dein Original bleibt erhalten.',
    )
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Der KI-Server hat keine Antwort gesendet.')
  const chunks: Uint8Array[] = []
  let bytes = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.length
      if (bytes > maximum) throw new Error('Die KI-Antwort ist zu gross.')
      chunks.push(part.value)
    }
  } finally {
    await reader.cancel()
  }
  const result = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(result)
}
export async function checkAIConnection(
  connection: AIConnection,
  signal: AbortSignal,
) {
  const c = validateConnection(connection)
  if (c.mode === 'community') {
    const { checkCommunity } = await import('./community-ai')
    return checkCommunity(signal)
  }
  const response = await fetch(`${c.url}/health`, {
    headers: { Authorization: `Bearer ${c.code}` },
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    redirect: 'error',
  })
  const data = JSON.parse(await readResponse(response, 4096))
  if (data.service !== 'mystyle-photo-ai' || data.version !== 1)
    throw new Error('Dieser Server ist kein kompatibler MyStyle-KI-Server.')
  return data as { photo_tasks?: unknown }
}
export async function analyzePhoto(
  photo: Blob,
  connection: AIConnection,
  signal: AbortSignal,
  task: PhotoTask = 'all',
): Promise<AIResult> {
  if (!['all', 'attributes', 'cutout'].includes(task))
    throw new Error('Unbekannter Foto-Schritt.')
  const c = validateConnection(connection)
  if (!c.enabled) throw new Error('Die Online-KI ist noch nicht freigegeben.')
  if (photo.type !== 'image/jpeg' || photo.size > 5 * 1024 * 1024)
    throw new Error(
      'Das Foto ist für die Online-KI zu gross oder nicht vorbereitet.',
    )
  if (c.mode === 'community') {
    const { analyzeCommunityPhoto } = await import('./community-ai')
    return analyzeCommunityPhoto(photo, signal, task)
  }
  if (task !== 'all') {
    const health = await checkAIConnection(c, signal)
    if (
      !health ||
      !Array.isArray(health.photo_tasks) ||
      !health.photo_tasks.includes(task)
    )
      throw new Error(
        'Dein Server unterstützt einzelne Schritte noch nicht. Aktualisiere ihn oder starte die vollständige Analyse. Dein bisheriges Ergebnis bleibt erhalten.',
      )
  }
  const response = await fetch(`${c.url}/v1/garment`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${c.code}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      photo: await blobToDataURL(photo),
      ...(task === 'all' ? {} : { task }),
    }),
    signal,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    redirect: 'error',
  })
  const data = JSON.parse(await readResponse(response, 9 * 1024 * 1024))
  const warnings: string[] = []
  let attributes: PhotoAttributes | undefined
  let cutout: Blob | undefined
  if (task !== 'cutout' && data.attributes) {
    try {
      attributes = parseAttributes(data.attributes)
    } catch {
      warnings.push(
        'Die Angaben konnten nicht sicher übernommen werden. Bitte prüfe sie manuell.',
      )
    }
  } else if (task !== 'cutout')
    warnings.push(
      'Die KI konnte die Angaben nicht erkennen. Versuche ein Foto mit einem einzelnen, gut sichtbaren Stück.',
    )
  if (
    task !== 'attributes' &&
    typeof data.cutout === 'string' &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.cutout)
  ) {
    try {
      const bytes = Uint8Array.from(atob(data.cutout.split(',')[1]), (c) =>
        c.charCodeAt(0),
      )
      if (
        bytes.length > 6 * 1024 * 1024 ||
        ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
      )
        throw new Error()
      cutout = new Blob([bytes], { type: 'image/png' })
      await validateBackupPhotos([{ cutout }])
    } catch {
      cutout = undefined
    }
  }
  if (task !== 'attributes' && !cutout)
    warnings.push(
      'Der Hintergrund konnte nicht entfernt werden. Dein Original bleibt erhalten.',
    )
  if (!attributes && !cutout) throw new Error(warnings.join(' '))
  return { attributes, cutout, warnings }
}
