import { callCommunity, VISION_HOST } from './community-ai'
import { AIProviderError, providerError } from './ai-errors'
import type { ChatContext } from './chat-model'

export const CHAT_CONSENT_KEY = 'mystyle-chat-consent'
export function chatEnabled() {
  try {
    return localStorage.getItem(CHAT_CONSENT_KEY) === 'enabled-v1'
  } catch {
    return false
  }
}
export function setChatEnabled(enabled: boolean) {
  if (enabled) localStorage.setItem(CHAT_CONSENT_KEY, 'enabled-v1')
  else localStorage.removeItem(CHAT_CONSENT_KEY)
}
export async function askChat(
  context: ChatContext,
  signal: AbortSignal,
): Promise<unknown> {
  if (!chatEnabled()) throw new Error('Aktiviere zuerst den Online-Chat.')
  // The provider requires an image even for language-only questions. This blank
  // transport image contains no wardrobe photos, metadata, or private pixels.
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const graphics = canvas.getContext('2d')
  if (!graphics) throw new Error('Der Chat konnte nicht vorbereitet werden.')
  graphics.fillStyle = '#ffffff'
  graphics.fillRect(0, 0, 32, 32)
  const placeholder = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
  signal.throwIfAborted()
  if (!chatEnabled()) throw new Error('Die Chat-Freigabe wurde zurückgezogen.')
  const value = await callCommunity(
    VISION_HOST,
    'run_router',
    [
      'Qwen3-VL-8B-Instruct',
      context.prompt,
      placeholder,
      900,
      0.1,
      0.9,
      50,
      1.05,
      60,
    ],
    signal,
  )
  signal.throwIfAborted()
  if (!chatEnabled()) throw new Error('Die Chat-Freigabe wurde zurückgezogen.')
  if (!Array.isArray(value) || typeof value[0] !== 'string')
    throw new AIProviderError('invalid')
  const text = value[0]
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
  if (/^\[ERROR\]/i.test(text)) throw providerError(text)
  try {
    return JSON.parse(text)
  } catch {
    throw new AIProviderError('invalid')
  }
}
