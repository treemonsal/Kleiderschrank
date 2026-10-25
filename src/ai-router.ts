import { AIProviderError, providerError } from './ai-errors'
import { callCommunity, VISION_HOST } from './community-ai'

/** Second Qwen3-VL space (same model family, separate server). */
export const BACKUP_VISION_HOST =
  'https://prithivmlmods-qwen3-vl-hf-demo.hf.space'
/** Keyless text model without GPU quota, used when both vision spaces fail. */
export const TEXT_FALLBACK_URL = 'https://text.pollinations.ai/openai'

export type AIProvider = 'primary' | 'backup' | 'text'
export interface AIAnswer {
  text: string
  provider: AIProvider
}
export const PROVIDER_LABELS: Record<AIProvider, string> = {
  primary: 'Qwen3-VL',
  backup: 'Ersatz-KI Qwen3-VL',
  text: 'Ersatz-KI ohne Bild',
}

const clean = (text: string) =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')

/** Browser tests that simulate one provider switch the backups off. */
export function fallbackDisabled() {
  return (
    typeof window !== 'undefined' &&
    (window as unknown as Record<string, unknown>)
      .__MYSTYLE_NO_AI_FALLBACK__ === true
  )
}
/** Limits, outages and network trouble switch providers; aborts never do. */
export function shouldFallBack(error: unknown, signal: AbortSignal) {
  if (signal.aborted || fallbackDisabled()) return false
  if (error instanceof DOMException && error.name === 'AbortError') return false
  return !(error instanceof AIProviderError && error.kind === 'access')
}

async function primary(
  model: string,
  prompt: string,
  image: string,
  maxTokens: number,
  signal: AbortSignal,
) {
  const value = await callCommunity(
    VISION_HOST,
    'run_router',
    [model, prompt, image, maxTokens, 0.1, 0.9, 50, 1.05, 60],
    signal,
  )
  if (!Array.isArray(value) || typeof value[0] !== 'string')
    throw new AIProviderError('invalid')
  const text = clean(value[0])
  if (/^\[ERROR\]/i.test(text)) throw providerError(text)
  return text
}

async function backup(
  prompt: string,
  image: string,
  maxTokens: number,
  signal: AbortSignal,
) {
  const value = await callCommunity(
    BACKUP_VISION_HOST,
    'run_understanding',
    ['Query', prompt, image, maxTokens, 60],
    signal,
  )
  if (!Array.isArray(value) || typeof value[0] !== 'string')
    throw new AIProviderError('invalid')
  let result: unknown
  try {
    result = JSON.parse(value[0])
  } catch {
    throw new AIProviderError('invalid')
  }
  const { status, text } = (result ?? {}) as {
    status?: unknown
    text?: unknown
  }
  if (status !== 'done' || typeof text !== 'string') throw providerError(result)
  return clean(text)
}

async function textOnly(
  prompt: string,
  maxTokens: number,
  signal: AbortSignal,
) {
  let response: Response
  try {
    response = await fetch(TEXT_FALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
      signal,
      body: JSON.stringify({
        model: 'openai-fast',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'No image is attached to this request. Ignore any mention of attached photos and rely only on the text data.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    })
  } catch (error) {
    if (signal.aborted) throw error
    throw new AIProviderError('network')
  }
  if (!response.ok)
    throw providerError(
      await response.text().catch(() => ''),
      response.status,
      response.headers.get('Retry-After'),
    )
  const data = (await response.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[]
  } | null
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new AIProviderError('invalid')
  return clean(text)
}

/**
 * Asks the main vision model and automatically switches to the backup space
 * and, if allowed, to a text-only model when a provider is limited or down.
 */
export async function askVision(
  request: {
    model: string
    prompt: string
    image: string
    maxTokens: number
    /** Text-only fallback is fine for advice, not for reading a photo. */
    allowTextOnly: boolean
  },
  signal: AbortSignal,
): Promise<AIAnswer> {
  const { model, prompt, image, maxTokens, allowTextOnly } = request
  signal.throwIfAborted()
  let failure: unknown
  try {
    return {
      text: await primary(model, prompt, image, maxTokens, signal),
      provider: 'primary',
    }
  } catch (error) {
    if (!shouldFallBack(error, signal)) throw error
    failure = error
  }
  try {
    return {
      text: await backup(prompt, image, maxTokens, signal),
      provider: 'backup',
    }
  } catch (error) {
    if (!shouldFallBack(error, signal)) throw error
    if (!allowTextOnly) throw failure
  }
  try {
    return {
      text: await textOnly(prompt, maxTokens, signal),
      provider: 'text',
    }
  } catch (error) {
    if (!shouldFallBack(error, signal)) throw error
    throw failure
  }
}
