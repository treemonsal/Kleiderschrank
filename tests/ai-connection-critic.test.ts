import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AI_CONNECTION_CHANGED,
  AI_CONNECTION_KEY,
  readAIConnection,
  saveAIConnection,
} from '../src/cloud-ai'

function storage() {
  const values = new Map<string, string>()
  const browser = new EventTarget()
  const local = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key)
    }),
  }
  vi.stubGlobal('window', browser)
  vi.stubGlobal('localStorage', local)
  return { values, browser, local }
}
afterEach(() => vi.unstubAllGlobals())

describe('Fensterübergreifende und lokale Foto-KI-Freigabe', () => {
  it('meldet nur erfolgreich gespeicherten normalisierten Zustand, ohne Zugangsdaten im Ereignis', () => {
    const { browser } = storage()
    const seen: Event[] = []
    let duringEvent: ReturnType<typeof readAIConnection>
    browser.addEventListener(AI_CONNECTION_CHANGED, (event) => {
      seen.push(event)
      duringEvent = readAIConnection()
    })
    const saved = saveAIConnection({
      url: 'https://my-stylist.hf.space/',
      code: ` ${'x'.repeat(32)} `,
      enabled: true,
    })
    expect(saved).toEqual({
      url: 'https://my-stylist.hf.space',
      code: 'x'.repeat(32),
      enabled: true,
    })
    expect(duringEvent!).toEqual(saved)
    expect(seen).toHaveLength(1)
    expect((seen[0] as CustomEvent).detail).toBeUndefined()
    expect(JSON.stringify(seen[0])).not.toContain('my-stylist')
    expect(JSON.stringify(seen[0])).not.toContain('x'.repeat(32))
  })
  it('meldet auch den erfolgreichen Widerruf ohne eine künstliche StorageEvent-Payload', () => {
    const { browser } = storage()
    const changed = vi.fn()
    browser.addEventListener(AI_CONNECTION_CHANGED, changed)
    saveAIConnection({
      url: 'https://my-stylist.hf.space',
      code: 'x'.repeat(32),
      enabled: true,
    })
    changed.mockClear()
    expect(saveAIConnection(null)).toBeNull()
    expect(readAIConnection()).toBeNull()
    expect(changed).toHaveBeenCalledTimes(1)
  })
  it('publiziert keine erfolgreiche Änderung bei einem Speicherfehler', () => {
    const { browser, local, values } = storage()
    const original = {
      url: 'https://my-stylist.hf.space',
      code: 'x'.repeat(32),
      enabled: true,
    }
    values.set(AI_CONNECTION_KEY, JSON.stringify(original))
    const changed = vi.fn()
    browser.addEventListener(AI_CONNECTION_CHANGED, changed)
    local.removeItem.mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveAIConnection(null)).toThrow('blocked')
    expect(changed).not.toHaveBeenCalled()
    expect(readAIConnection()).toEqual(original)
  })
  it('verwirft unzulässige Ziele vor Speicherung und Änderungsereignis', () => {
    const { browser, local } = storage()
    const changed = vi.fn()
    browser.addEventListener(AI_CONNECTION_CHANGED, changed)
    expect(() =>
      saveAIConnection({
        url: 'https://unapproved.example',
        code: 'x'.repeat(32),
        enabled: true,
      }),
    ).toThrow()
    expect(local.setItem).not.toHaveBeenCalled()
    expect(changed).not.toHaveBeenCalled()
  })
})
