import { AIProviderError, providerError } from './ai-errors'
import { callCommunity, VISION_HOST } from './community-ai'
import { shoppingEnabled } from './shopping-consent'
import {
  parseShoppingIdeas,
  shoppingEvidence,
  shoppingPrompt,
  type ShoppingData,
} from './shopping-model'
export async function requestShopping(data: ShoppingData, signal: AbortSignal) {
  signal.throwIfAborted()
  if (!shoppingEnabled() || !shoppingEvidence(data).ready)
    throw new Error(
      'Für Kaufideen braucht es die Shopping-Freigabe und ausreichend Stilhinweise.',
    )
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 32
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Die Beratung konnte nicht vorbereitet werden.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, 32, 32)
  const result = await callCommunity(
    VISION_HOST,
    'run_router',
    [
      'Qwen3-VL-8B-Instruct',
      shoppingPrompt(data),
      canvas.toDataURL('image/jpeg', 0.8).split(',')[1],
      1400,
      0.1,
      0.9,
      50,
      1.05,
      60,
    ],
    signal,
  )
  signal.throwIfAborted()
  if (!shoppingEnabled())
    throw new Error('Die Shopping-Freigabe wurde zurückgezogen.')
  if (!Array.isArray(result) || typeof result[0] !== 'string')
    throw new AIProviderError('invalid')
  const text = result[0]
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
  if (/^\[ERROR\]/i.test(text)) throw providerError(text)
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new AIProviderError('invalid')
  }
  return parseShoppingIdeas(value, data)
}
