import { MAX_PHOTO_BYTES } from './photos'

/** Images dragged in from another window or app, or pasted. */
export const MAX_DROPPED_IMAGES = 30

const BLOCKED =
  'Diese Webseite gibt ihr Bild nicht zum Ziehen frei. Kopiere es stattdessen (Rechtsklick oder lange drücken → Bild kopieren) und setze es hier ein.'

function imageFiles(files: Iterable<File>): File[] {
  return [...files].filter((file) => file.type.startsWith('image/'))
}

/**
 * Finds the image address in dragged text: a plain link list (one URL per
 * line, comments start with #) or the <img src> of dragged HTML.
 */
export function imageUrlFromTransfer(
  getData: (type: string) => string,
): string | undefined {
  const html = getData('text/html')
  const fromHtml = /<img\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i
    .exec(html)?.[1]
    ?.replace(/&amp;/g, '&')
  const fromList = getData('text/uri-list')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'))
  const candidate = fromHtml || fromList || getData('text/plain').trim()
  return candidate && /^(https?:|data:image\/)/i.test(candidate)
    ? candidate
    : undefined
}

/** Downloads a dragged image address in memory; nothing is saved yet. */
export async function fetchImage(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<File> {
  let response: Response
  try {
    response = await fetcher(url, { mode: 'cors', credentials: 'omit' })
  } catch {
    throw new Error(BLOCKED)
  }
  if (!response.ok) throw new Error(BLOCKED)
  const blob = await response.blob()
  if (!blob.type.startsWith('image/'))
    throw new Error('Das gezogene Element ist kein Bild.')
  if (blob.size > MAX_PHOTO_BYTES)
    throw new Error(
      'Das Foto ist grösser als 20 MB. Bitte wähle ein kleineres Bild.',
    )
  const name = url.startsWith('data:')
    ? 'bild'
    : (new URL(url).pathname.split('/').pop() ?? 'bild')
  return new File([blob], name || 'bild', { type: blob.type })
}

/** True while something droppable (files or a link) is dragged over us. */
export function carriesImage(transfer: DataTransfer | null): boolean {
  const types = [...(transfer?.types ?? [])]
  return (
    types.includes('Files') ||
    types.includes('text/uri-list') ||
    types.includes('text/html')
  )
}

/** Image files from a drop: real files first, else the dragged address. */
export async function imagesFromDrop(
  transfer: DataTransfer,
  fetcher: typeof fetch = fetch,
): Promise<File[]> {
  const files = imageFiles(transfer.files)
  if (files.length) return files.slice(0, MAX_DROPPED_IMAGES)
  if (transfer.files.length)
    throw new Error('Bitte ziehe eine Bilddatei hierher.')
  const url = imageUrlFromTransfer((type) => transfer.getData(type))
  if (!url) throw new Error('Hier lassen sich nur Bilder ablegen.')
  return [await fetchImage(url, fetcher)]
}

/** Image files from a paste event (e.g. after „Bild kopieren“). */
export function imagesFromPaste(data: DataTransfer | null): File[] {
  return imageFiles(data?.files ?? []).slice(0, MAX_DROPPED_IMAGES)
}

/** Reads images from the clipboard after a tap on „Einsetzen“. */
export async function imagesFromClipboard(): Promise<File[]> {
  if (!navigator.clipboard?.read)
    throw new Error(
      'Dieser Browser kann die Zwischenablage nicht lesen. Füge das Bild mit Cmd+V oder Strg+V ein.',
    )
  let items: ClipboardItems
  try {
    items = await navigator.clipboard.read()
  } catch {
    throw new Error(
      'Kein Zugriff auf die Zwischenablage. Erlaube das Einsetzen oder nutze Cmd+V bzw. Strg+V.',
    )
  }
  const files: File[] = []
  for (const item of items) {
    const type = item.types.find((value) => value.startsWith('image/'))
    if (!type) continue
    const blob = await item.getType(type)
    files.push(new File([blob], 'eingesetzt', { type }))
  }
  if (!files.length)
    throw new Error(
      'In der Zwischenablage ist kein Bild. Kopiere zuerst ein Bild (lange drücken oder Rechtsklick → Bild kopieren).',
    )
  return files.slice(0, MAX_DROPPED_IMAGES)
}
