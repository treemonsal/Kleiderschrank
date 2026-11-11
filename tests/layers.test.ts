import { describe, expect, it } from 'vitest'
import { generateOutfits } from '../src/generator'
import { layerFromText, topLayer } from '../src/layers'
import type { Garment } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
} from '../src/outfit-model'
import type { WeatherDay } from '../src/weather'

const stamp = '2026-01-01T00:00:00.000Z'
const piece = (
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment => ({
  id,
  name: id,
  category,
  color: 'Grau',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})
const day = (min: number, max: number): WeatherDay => ({
  day: '2026-11-12',
  min,
  max,
  rain: 0,
  code: 1,
})
const looks = (items: Garment[], weather?: WeatherDay) =>
  generateOutfits(
    items,
    { ...DEFAULT_OUTFIT_OPTIONS, includeAccessory: false },
    DEFAULT_PREFERENCES,
    [],
    0,
    weather,
  )
const kinds = (ids: string[], items: Garment[]) =>
  ids
    .map((id) => items.find((item) => item.id === id)!)
    .filter((item) => item.category === 'Oberteile')
    .map((item) => topLayer(item))
    .sort()

describe('Shirts und Pullover', () => {
  it('erkennt Pullover am Namen oder an der eigenen Angabe', () => {
    expect(topLayer(piece('Grauer Hoodie', 'Oberteile'))).toBe('mid')
    expect(topLayer(piece('Strickpullover', 'Oberteile'))).toBe('mid')
    expect(topLayer(piece('Weisses T-Shirt', 'Oberteile'))).toBe('base')
    expect(topLayer(piece('Blaues Hemd', 'Oberteile'))).toBe('base')
    expect(
      topLayer(piece('Lieblingsteil', 'Oberteile', { layer: 'mid' })),
    ).toBe('mid')
    expect(topLayer(piece('Jeans', 'Hosen'))).toBeUndefined()
    expect(layerFromText('Carhartt Sweatshirt Grau')).toBe('mid')
  })

  it('erlaubt ein Shirt mit Pullover, aber keine zwei Shirts oder zwei Pullover', () => {
    const shirt = piece('Shirt', 'Oberteile'),
      shirt2 = piece('Hemd', 'Oberteile'),
      pulli = piece('Pullover', 'Oberteile'),
      hoodie = piece('Hoodie', 'Oberteile'),
      pants = piece('Hose', 'Hosen'),
      shoes = piece('Schuh', 'Schuhe')
    expect(isCompleteOutfit([shirt, pulli, pants, shoes])).toBe(true)
    expect(isCompleteOutfit([shirt, shirt2, pants, shoes])).toBe(false)
    expect(isCompleteOutfit([pulli, hoodie, pants, shoes])).toBe(false)
    expect(isCompleteOutfit([pulli, pants, shoes])).toBe(true)
  })

  it('legt bei kühlem Wetter einen Pullover über ein Shirt', () => {
    const items = [
      piece('T-Shirt', 'Oberteile'),
      piece('Pullover', 'Oberteile'),
      piece('Hose', 'Hosen'),
      piece('Schuh', 'Schuhe'),
    ]
    const [cold] = looks(items, day(4, 10))
    expect(kinds(cold.garmentIds, items)).toEqual(['base', 'mid'])
    expect(cold.reasons.join(' ')).toContain('Shirt passt auch allein')
    const [warm] = looks(items, day(20, 28))
    expect(kinds(warm.garmentIds, items)).toEqual(['base'])
  })

  it('trägt einen Pullover nie ohne Shirt darunter, wenn eines da ist', () => {
    const items = [
      piece('T-Shirt', 'Oberteile'),
      piece('Hoodie', 'Oberteile', { favorite: true, styles: ['Sportlich'] }),
      piece('Hose', 'Hosen'),
      piece('Schuh', 'Schuhe'),
    ]
    for (const look of looks(items)) {
      const layers = kinds(look.garmentIds, items)
      if (layers.includes('mid')) expect(layers).toEqual(['base', 'mid'])
    }
  })

  it('wählt darunter das Shirt, das auch allein zur Hose passt', () => {
    // Pink shirt clashes with the red trousers once the pullover is off.
    const items = [
      piece('Rosa Shirt', 'Oberteile', { color: 'Rosa' }),
      piece('Weisses Shirt', 'Oberteile', { color: 'Weiss' }),
      piece('Pullover', 'Oberteile', { color: 'Schwarz', favorite: true }),
      piece('Hose', 'Hosen', { color: 'Rot' }),
      piece('Schuh', 'Schuhe', { color: 'Weiss' }),
    ]
    const [look] = looks(items, day(2, 8))
    expect(look.garmentIds).toContain('Pullover')
    expect(look.garmentIds).toContain('Weisses Shirt')
  })
})
