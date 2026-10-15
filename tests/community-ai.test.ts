import { describe, expect, it, vi } from 'vitest'
import {
  completedEvent,
  cutoutAsset,
  CUTOUT_HOST,
  checkCommunity,
} from '../src/community-ai'
import { AIProviderError } from '../src/ai-errors'
import { validateConnection } from '../src/cloud-ai'

describe('Kostenlose Community-KI: echte Streaming-Verträge und feste Anbieter', () => {
  it('übernimmt nur die fertige Antwort und ignoriert Teilantworten/Herzschläge', () => {
    expect(
      completedEvent(
        'event: generating\ndata: ["partial"]\n\nevent: heartbeat\ndata: null\n\nevent: complete\ndata: ["finished"]\n\n',
      ),
    ).toEqual(['finished'])
    expect(() =>
      completedEvent('event: error\ndata: "quota exceeded"\n\n'),
    ).toThrow(AIProviderError)
    expect(() => completedEvent('event: generating\ndata: []\n\n')).toThrow(
      'ohne fertiges Ergebnis',
    )
  })
  it('lädt Freistellungen ausschliesslich vom vereinbarten Anbieter ohne fremde Redirect-Ziele', () => {
    const response = [
      [
        { url: 'https://example.org/original' },
        { url: CUTOUT_HOST + '/gradio_api/file=/tmp/gradio/result.png' },
      ],
    ]
    expect(cutoutAsset(response)).toBe(
      CUTOUT_HOST + '/gradio_api/file=/tmp/gradio/result.png',
    )
    for (const url of [
      'https://evil.example/image.png',
      CUTOUT_HOST + '/anything',
      CUTOUT_HOST + '/gradio_api/file=x?key=secret',
      'http://zhengpeng7-birefnet-demo.hf.space/gradio_api/file=x',
    ])
      expect(() => cutoutAsset([[null, { url }]])).toThrow()
  })
  it('Community-Modus benötigt keine Anbieter-Schlüssel und erlaubt keine unbekannten Dienste', () => {
    const value = {
      mode: 'community' as const,
      url: 'https://prithivmlmods-qwen3-vl-outpost.hf.space',
      code: '',
      enabled: true,
    }
    expect(validateConnection(value)).toEqual(value)
    expect(() =>
      validateConnection({ ...value, url: 'https://other.hf.space' }),
    ).toThrow()
    expect(() =>
      validateConnection({ ...value, code: 'a-provider-token' }),
    ).toThrow()
    expect(() =>
      validateConnection({
        ...value,
        enabled: undefined as unknown as boolean,
      }),
    ).toThrow()
  })
})

it('Verbindungsprüfung nennt den betroffenen Dienst und zeigt keine internen Fehlercodes', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.includes('qwen3')
        ? new Response('unavailable', { status: 503 })
        : Response.json({ named_endpoints: { '/image': {} } }),
    ),
  )
  try {
    await expect(checkCommunity(new AbortController().signal)).rejects.toThrow(
      'Bilderkennung: Dienst vorübergehend nicht verfügbar.',
    )
  } finally {
    vi.unstubAllGlobals()
  }
})
