import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  askVision,
  BACKUP_VISION_HOST,
  TEXT_FALLBACK_URL,
} from '../src/ai-router'
import { VISION_HOST } from '../src/community-ai'

const EVENT = 'a'.repeat(32)
type Behaviour = 'ok' | 'limit' | 'down'
function mockServices(primary: Behaviour, backup: Behaviour, text: Behaviour) {
  const calls: string[] = []
  const sse = (data: unknown) =>
    new Response(`event: complete\ndata: ${JSON.stringify(data)}\n\n`)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = String(input)
      calls.push(url)
      const host = url.startsWith(VISION_HOST)
        ? primary
        : url.startsWith(BACKUP_VISION_HOST)
          ? backup
          : text
      if (host === 'down') throw new TypeError('offline')
      if (host === 'limit')
        return new Response('You have exceeded your GPU quota', { status: 429 })
      if (url === TEXT_FALLBACK_URL)
        return Response.json({
          choices: [{ message: { content: '{"reply":"Text"}' } }],
        })
      if (init?.method === 'POST') return Response.json({ event_id: EVENT })
      return url.startsWith(VISION_HOST)
        ? sse(['{"reply":"Haupt"}'])
        : sse([JSON.stringify({ status: 'done', text: '{"reply":"Ersatz"}' })])
    }),
  )
  return calls
}
const request = (allowTextOnly = true) => ({
  model: 'Qwen3-VL-8B-Instruct',
  prompt: 'Frage',
  image: 'AAAA',
  maxTokens: 100,
  allowTextOnly,
})

afterEach(() => vi.unstubAllGlobals())

describe('KI-Weiche', () => {
  it('nutzt die Haupt-KI, solange sie antwortet', async () => {
    mockServices('ok', 'ok', 'ok')
    expect(await askVision(request(), new AbortController().signal)).toEqual({
      text: '{"reply":"Haupt"}',
      provider: 'primary',
    })
  })

  it('wechselt beim Limit automatisch auf den zweiten Qwen-Dienst', async () => {
    const calls = mockServices('limit', 'ok', 'ok')
    const answer = await askVision(request(), new AbortController().signal)
    expect(answer).toEqual({ text: '{"reply":"Ersatz"}', provider: 'backup' })
    expect(calls.some((url) => url.includes('run_understanding'))).toBe(true)
  })

  it('fällt für Beratung auf das Textmodell zurück, aber nie beim Fotolesen', async () => {
    mockServices('limit', 'down', 'ok')
    expect(
      (await askVision(request(), new AbortController().signal)).provider,
    ).toBe('text')
    mockServices('limit', 'down', 'ok')
    await expect(
      askVision(request(false), new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'limit' })
  })

  it('meldet den ursprünglichen Fehler, wenn alle Dienste ausfallen', async () => {
    mockServices('limit', 'limit', 'down')
    await expect(
      askVision(request(), new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'limit' })
  })

  it('wechselt nach einem Abbruch nicht weiter', async () => {
    const calls = mockServices('ok', 'ok', 'ok')
    const controller = new AbortController()
    controller.abort()
    await expect(askVision(request(), controller.signal)).rejects.toBeTruthy()
    expect(calls.some((url) => url.startsWith(BACKUP_VISION_HOST))).toBe(false)
  })
})
