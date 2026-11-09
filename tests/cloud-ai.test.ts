import { describe, expect, it } from 'vitest'
import { parseAttributes, validateConnection } from '../src/cloud-ai'

const attributes = {
  name: 'Blaues Hemd',
  category: 'Oberteile',
  color: 'Blau',
  brand: '',
  seasons: ['Sommer'],
  styles: ['Casual'],
  notes: 'Knöpfe und lange Ärmel.',
}
describe('Online-KI: keine ungeprüften Daten oder beliebigen Uploadziele', () => {
  it('übernimmt echte Kategorien, leere unbekannte Marke und entfernt Duplikate', () => {
    expect(
      parseAttributes({ ...attributes, styles: ['Casual', 'Casual'] }),
    ).toEqual(attributes)
  })
  it.each([
    { ...attributes, name: '' },
    { ...attributes, category: 'KI sagt Jeans' },
    { ...attributes, styles: ['Fancy'] },
    { ...attributes, seasons: 'Sommer' },
    { ...attributes, color: '<script>' },
    { ...attributes, brand: 123 },
  ])('lehnt unbrauchbare oder fremde Felddatentypen ab', (value) => {
    expect(() => parseAttributes(value)).toThrow()
  })
  it('sendet Bilder nur an bewusst konfigurierte HTTPS-Spaces', () => {
    const value = {
      url: 'https://meine-ki.hf.space',
      code: 'a'.repeat(32),
      enabled: true,
    }
    expect(validateConnection(value).url).toBe(value.url)
    for (const url of [
      'http://meine-ki.hf.space',
      'https://hf.space.evil.org',
      'https://meine-ki.hf.space/path',
      'https://a:b@meine-ki.hf.space',
      'https://meine-ki.hf.space/?secret=a',
      'https://127.0.0.1',
    ])
      expect(() => validateConnection({ ...value, url })).toThrow()
    expect(() => validateConnection({ ...value, code: 'short' })).toThrow()
  })
})
