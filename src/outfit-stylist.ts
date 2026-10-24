import { stylistEnabled } from './cloud-ai'
import { garmentCollage } from './collage'
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
  return garmentCollage(
    pieces.map((item, index) => ({ item, label: `G${index + 1}` })),
    signal,
  )
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
