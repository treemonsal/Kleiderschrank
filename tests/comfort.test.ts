import { describe, expect, it } from 'vitest'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../src/outfit-model'
import type { WeatherDay } from '../src/weather'

const piece = (id: string, category: Garment['category']): Garment => ({
  id,
  name: id,
  category,
  color: 'Weiss',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})
const items = [
  piece('top', 'Oberteile'),
  piece('pants', 'Hosen'),
  piece('shoes', 'Schuhe'),
  piece('jacket', 'Jacken'),
]
const mild = {
  day: '2026-10-24',
  min: 16,
  max: 21,
  code: 1,
  rain: 0,
} as WeatherDay

describe('Temperaturempfinden', () => {
  it('ergänzt bei 16 °C nur für Frierende eine Jacke', () => {
    const normal = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
      0,
      mild,
    )
    const cold = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      { ...DEFAULT_PREFERENCES, comfort: 'cold' },
      [],
      0,
      mild,
    )
    expect(normal[0].garmentIds).not.toContain('jacket')
    expect(cold[0].garmentIds).toContain('jacket')
    expect(cold[0].reasons.join(' ')).toMatch(/frierst schnell/)
  })
})
