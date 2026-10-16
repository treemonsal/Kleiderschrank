import { stylistEnabled } from './cloud-ai'
import { callCommunity, VISION_HOST } from './community-ai'
import { AIProviderError, providerError } from './ai-errors'
import {
  parseStylistAdvice,
  stylistLooks,
  stylistPieces,
  stylistPrompt,
  type StylistInput,
} from './stylist-model'

export async function stylistImage(
  input: StylistInput,
  signal: AbortSignal,
): Promise<string> {
  const pieces = stylistPieces(input)
  if (!pieces.length)
    throw new Error('Für die Beratung fehlt ein vollständiger Look.')
  const columns = Math.min(4, pieces.length),
    cell = 256,
    height = 272
  const canvas = document.createElement('canvas')
  canvas.width = columns * cell
  canvas.height = Math.ceil(pieces.length / columns) * height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('Die Outfit-Fotos konnten nicht vorbereitet werden.')
  context.fillStyle = '#f1f1f3'
  context.fillRect(0, 0, canvas.width, canvas.height)
  for (const [index, item] of pieces.entries()) {
    signal.throwIfAborted()
    const x = (index % columns) * cell,
      y = Math.floor(index / columns) * height
    const photo = item.cutout || item.photo
    if (photo) {
      const url = URL.createObjectURL(photo)
      try {
        const image = new Image()
        image.src = url
        await image.decode()
        signal.throwIfAborted()
        const scale = Math.min(
          (cell - 24) / image.naturalWidth,
          (height - 68) / image.naturalHeight,
        )
        context.drawImage(
          image,
          x + (cell - image.naturalWidth * scale) / 2,
          y + 8 + (height - 68 - image.naturalHeight * scale) / 2,
          image.naturalWidth * scale,
          image.naturalHeight * scale,
        )
      } finally {
        URL.revokeObjectURL(url)
      }
    } else {
      context.fillStyle = '#55555a'
      context.font = '18px sans-serif'
      context.fillText('Kein Foto', x + 16, y + 110)
    }
    context.fillStyle = '#111113'
    context.font = 'bold 20px sans-serif'
    context.fillText(
      `G${index + 1} · ${item.category}`,
      x + 12,
      y + height - 36,
      cell - 24,
    )
    context.font = '16px sans-serif'
    context.fillText(item.name.slice(0, 30), x + 12, y + height - 12, cell - 24)
  }
  signal.throwIfAborted()
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
}

export async function askStylist(
  input: StylistInput,
  wish: string,
  signal: AbortSignal,
) {
  if (!stylistEnabled())
    throw new Error(
      'Aktiviere zuerst die kostenlose Community-KI unter Mehr → Online-Foto-KI.',
    )
  const candidates = stylistLooks(input)
  if (!candidates.length)
    throw new Error('Für die Beratung fehlt ein vollständiger Look.')
  const image = await stylistImage(input, signal)
  // Recheck after image preparation: a revoked grant must stop the upload.
  if (!stylistEnabled())
    throw new Error('Die Community-Freigabe wurde zurückgezogen.')
  signal.throwIfAborted()
  const value = await callCommunity(
    VISION_HOST,
    'run_router',
    [
      'Qwen3-VL-8B-Instruct',
      stylistPrompt(input, wish),
      image,
      700,
      0.1,
      0.9,
      50,
      1.05,
      60,
    ],
    signal,
  )
  signal.throwIfAborted()
  if (!Array.isArray(value) || typeof value[0] !== 'string')
    throw new AIProviderError('invalid')
  const text = value[0]
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
  if (/^\[ERROR\]/i.test(text)) throw providerError(text)
  try {
    return parseStylistAdvice(JSON.parse(text), candidates)
  } catch {
    throw new AIProviderError('invalid')
  }
}
