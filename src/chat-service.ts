import { askVision } from './ai-router'
import { AIProviderError } from './ai-errors'
import type { ChatContext } from './chat-model'
import { chatEnabled } from './chat-consent'
import { garmentCollage } from './collage'

export async function askChat(
  context: ChatContext,
  signal: AbortSignal,
): Promise<unknown> {
  if (!chatEnabled()) throw new Error('Aktiviere zuerst den Online-Chat.')
  // Garment photos go along as one labelled collage. Without photos the
  // provider still needs an image, so a blank placeholder is sent.
  let image: string
  if (context.photos.length)
    image = await garmentCollage(context.photos, signal)
  else {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const graphics = canvas.getContext('2d')
    if (!graphics) throw new Error('Der Chat konnte nicht vorbereitet werden.')
    graphics.fillStyle = '#ffffff'
    graphics.fillRect(0, 0, 32, 32)
    image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
  }
  signal.throwIfAborted()
  if (!chatEnabled()) throw new Error('Die Chat-Freigabe wurde zurückgezogen.')
  const answer = await askVision(
    {
      model: 'Qwen3-VL-8B-Instruct',
      prompt: context.prompt,
      image: image,
      maxTokens: 900,
      allowTextOnly: true,
    },
    signal,
  )
  signal.throwIfAborted()
  if (!chatEnabled()) throw new Error('Die Chat-Freigabe wurde zurückgezogen.')
  const text = answer.text
  try {
    return JSON.parse(text)
  } catch {
    throw new AIProviderError('invalid')
  }
}
