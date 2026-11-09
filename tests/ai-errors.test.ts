import { describe, expect, it } from 'vitest'
import {
  AIProviderError,
  providerError,
  describeAIProblem,
} from '../src/ai-errors'

describe('Anbieterfehler werden nur anhand vorhandener Hinweise benannt', () => {
  it.each([
    ['You have exceeded your GPU quota', undefined, 'limit'],
    [null, 429, 'limit'],
    [{ error: 'Queue is full' }, 503, 'busy'],
    ['Service unavailable', 503, 'unavailable'],
    [null, 403, 'access'],
    [null, undefined, 'unknown'],
    ['Something failed', undefined, 'unknown'],
  ] as const)('ordnet %j / HTTP %s korrekt ein', (value, status, kind) => {
    expect(providerError(value, status).kind).toBe(kind)
  })
  it('übernimmt nur vom Anbieter genannte, begrenzte Wartezeiten', () => {
    const now = Date.parse('2026-10-15T12:00:00Z')
    expect(providerError(null, 429, '60', now).retryAt).toBe(now + 60000)
    expect(
      providerError(null, 429, 'Thu, 15 Oct 2026 12:01:00 GMT', now).retryAt,
    ).toBe(now + 60000)
    expect(
      providerError('GPU quota. Try again in 01:23:45', undefined, null, now)
        .retryAt,
    ).toBe(now + 5025000)
    expect(
      providerError('quota. Try again in 20 minutes', undefined, null, now)
        .retryAt,
    ).toBe(now + 1200000)
    for (const value of ['0', '-1', '9999999', 'unknown'])
      expect(providerError(null, 429, value, now).retryAt).toBeUndefined()
    expect(
      providerError('quota exceeded', undefined, null, now).retryAt,
    ).toBeUndefined()
  })
  it('zeigt Dienst und Ursache ohne sensible Rohdaten oder erfundene Quoten', () => {
    const message = describeAIProblem(
      'Bilderkennung',
      providerError('[ERROR] quota exceeded: private-photo-name'),
    )
    expect(message).toContain('Nutzungslimit')
    expect(message).toContain('keine Wartezeit')
    expect(message).not.toContain('private-photo-name')
    expect(
      describeAIProblem('Bilderkennung', providerError(null)),
    ).not.toContain('Nutzungslimit')
    expect(
      describeAIProblem('Freistellung', new AIProviderError('network')),
    ).toContain('Dein Original bleibt erhalten')
    expect(
      describeAIProblem('Bilderkennung', new Error('private-data')),
    ).toContain('Antwort des Dienstes')
  })
})
