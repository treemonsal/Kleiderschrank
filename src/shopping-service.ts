import { AIProviderError } from './ai-errors'
import { askVision } from './ai-router'
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
  const answer = await askVision(
    {
      model: 'Qwen3-VL-8B-Instruct',
      prompt: shoppingPrompt(data),
      image: canvas.toDataURL('image/jpeg', 0.8).split(',')[1],
      maxTokens: 1400,
      allowTextOnly: true,
    },
    signal,
  )
  signal.throwIfAborted()
  if (!shoppingEnabled())
    throw new Error('Die Shopping-Freigabe wurde zurückgezogen.')
  const text = answer.text
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new AIProviderError('invalid')
  }
  return parseShoppingIdeas(value, data)
}
