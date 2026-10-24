import { describe, expect, it } from 'vitest'
import type { Garment } from '../src/model'
import { DEFAULT_PREFERENCES } from '../src/outfit-model'
import { outfitsWith } from '../src/pairing'

const piece = (
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment => ({
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
  ...extra,
})
const items = [
  piece('t1', 'Oberteile'),
  piece('t2', 'Oberteile'),
  piece('h1', 'Hosen'),
  piece('h2', 'Hosen'),
  piece('s1', 'Schuhe'),
  piece('k1', 'Kleider'),
  piece('j1', 'Jacken'),
  piece('a1', 'Accessoires'),
]

describe('Was passt dazu?', () => {
  it('baut nur Looks mit dem gewählten Oberteil', () => {
    const looks = outfitsWith('t1', items, DEFAULT_PREFERENCES, [])
    expect(looks.length).toBeGreaterThan(0)
    for (const look of looks) {
      expect(look.garmentIds).toContain('t1')
      expect(look.garmentIds).not.toContain('t2')
    }
  })

  it('ergänzt Jacken und Accessoires zu vollständigen Basis-Looks', () => {
    for (const id of ['j1', 'a1']) {
      const looks = outfitsWith(id, items, DEFAULT_PREFERENCES, [])
      expect(looks.length).toBeGreaterThan(0)
      for (const look of looks) expect(look.garmentIds).toContain(id)
    }
  })

  it('zeigt Looks auch für ein Stück in der Wäsche, aber nicht mit anderen Wäschestücken', () => {
    const laundry = items.map((item) =>
      item.id === 'k1' || item.id === 's1'
        ? { ...item, inLaundry: true }
        : item,
    )
    expect(outfitsWith('k1', laundry, DEFAULT_PREFERENCES, [])).toEqual([])
    const looks = outfitsWith(
      'k1',
      laundry.map((item) =>
        item.id === 's1' ? { ...item, inLaundry: false } : item,
      ),
      DEFAULT_PREFERENCES,
      [],
    )
    expect(looks[0].garmentIds).toEqual(expect.arrayContaining(['k1', 's1']))
  })
})
