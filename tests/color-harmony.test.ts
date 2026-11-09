import { describe, expect, it } from 'vitest'
import { colorHarmony, styleCoherence } from '../src/color-harmony'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../src/outfit-model'

const piece = (
  id: string,
  category: Garment['category'],
  color: string,
  styles: Garment['styles'] = [],
): Garment => ({
  id,
  name: id,
  category,
  color,
  brand: '',
  seasons: [],
  styles,
  notes: '',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('Farbharmonie', () => {
  it('bewertet bekannte Konflikte schlechter als stimmige Paare', () => {
    const clash = colorHarmony([
      piece('a', 'Oberteile', 'Rot'),
      piece('b', 'Hosen', 'Grün'),
    ])
    const soft = colorHarmony([
      piece('a', 'Oberteile', 'Rosa'),
      piece('b', 'Hosen', 'Grün'),
    ])
    expect(clash.score).toBeLessThan(0)
    expect(soft.score).toBeGreaterThan(clash.score)
    expect(clash.note).toMatch(/Rot und Grün/)
  })

  it('behandelt blaue Hosen als neutrale Jeansbasis', () => {
    const jeans = colorHarmony([
      piece('a', 'Oberteile', 'Bunt'),
      piece('b', 'Hosen', 'Blau'),
    ])
    const blueSkirt = colorHarmony([
      piece('a', 'Oberteile', 'Bunt'),
      piece('b', 'Jacken', 'Blau'),
    ])
    expect(jeans.score).toBeGreaterThan(0)
    expect(blueSkirt.score).toBeLessThan(0)
  })

  it('ignoriert fehlende Farbangaben statt sie zu raten', () => {
    expect(
      colorHarmony([piece('a', 'Oberteile', ''), piece('b', 'Hosen', '')]),
    ).toEqual({ score: 0 })
  })

  it('erkennt einen starken Stilbruch nur bei erfassten Stilen', () => {
    expect(
      styleCoherence([{ styles: ['Elegant'] }, { styles: ['Sportlich'] }])
        .score,
    ).toBeLessThan(0)
    expect(styleCoherence([{ styles: ['Elegant'] }, { styles: [] }])).toEqual({
      score: 0,
    })
  })
})

describe('Generator mit Farbharmonie', () => {
  it('bevorzugt die stimmigere Kombination und nennt den Grund', () => {
    const items = [
      piece('rot', 'Oberteile', 'Rot'),
      piece('rosa', 'Oberteile', 'Rosa'),
      piece('gruen', 'Hosen', 'Grün'),
      piece('schuh', 'Schuhe', 'Weiss'),
    ]
    for (let seed = 0; seed < 20; seed++) {
      const [best] = generateOutfits(
        items,
        DEFAULT_OUTFIT_OPTIONS,
        DEFAULT_PREFERENCES,
        [],
        seed,
      )
      expect(best.garmentIds).toContain('rosa')
    }
    const results = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
    )
    const clash = results.find((look) => look.garmentIds.includes('rot'))
    expect(clash?.reasons.join(' ')).toMatch(/Rot und Grün/)
  })
})
