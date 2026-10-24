import { askVision } from './ai-router'
import { stylistEnabled } from './cloud-ai'
import { garmentCollage } from './collage'
import { AIProviderError } from './ai-errors'
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
  const answer = await askVision(
    {
      model: 'Qwen3-VL-8B-Instruct',
      prompt: stylistPrompt(input, wish),
      image: image,
      maxTokens: 700,
      allowTextOnly: true,
    },
    signal,
  )
  signal.throwIfAborted()
  const text = answer.text
  try {
    return parseStylistAdvice(JSON.parse(text), candidates)
  } catch {
    throw new AIProviderError('invalid')
  }
}
