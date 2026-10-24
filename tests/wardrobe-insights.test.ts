import { describe, expect, it } from 'vitest'
import type { CalendarEntry } from '../src/calendar'
import type { Garment } from '../src/model'
import type { SavedOutfit } from '../src/outfit-model'
import { combinations, wardrobeInsights } from '../src/wardrobe-insights'

const piece = (
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment => ({
  id,
  name: id,
  category,
  color: 'Schwarz',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...extra,
})
const worn = (day: string, outfitId: string) =>
  ({ id: day, day, outfitId, status: 'worn' }) as CalendarEntry

describe('Auswertung', () => {
  const items = [
    piece('t1', 'Oberteile', { price: 40, color: 'Blau' }),
    piece('t2', 'Oberteile', { price: 20 }),
    piece('h1', 'Hosen', { price: 90 }),
    piece('s1', 'Schuhe'),
    piece('k1', 'Kleider'),
  ]
  const outfits = [
    { id: 'a', garmentIds: ['t1', 'h1', 's1'] },
    { id: 'b', garmentIds: ['t2', 'h1', 's1'] },
  ] as SavedOutfit[]
  const entries = [
    worn('2026-10-20', 'a'),
    worn('2026-10-21', 'a'),
    worn('2026-10-22', 'b'),
    worn('2026-05-01', 'b'),
  ]

  it('berechnet Wert, Rangfolgen, ungetragene und lange nicht getragene Stücke', () => {
    const result = wardrobeInsights(items, entries, outfits, '2026-10-24')
    expect(result.count).toBe(5)
    expect(result.value).toBe(150)
    expect(result.priced).toBe(3)
    expect(result.wornLast30).toBe(3)
    expect(
      result.mostWorn.map((entry) => [entry.item.id, entry.value]),
    ).toEqual([
      ['h1', 4],
      ['s1', 4],
      ['t1', 2],
    ])
    expect(result.bestValue[0]).toMatchObject({ value: 10 })
    expect(result.neverWorn.map((item) => item.id)).toEqual(['k1'])
    expect(result.idle).toEqual([])
    expect(result.colors[0]).toEqual({ color: 'Schwarz', count: 4 })
  })

  it('zählt Kombinationen je Stück und findet Einzelgänger', () => {
    const combos = combinations(items)
    expect(combos.get('t1')).toBe(1)
    expect(combos.get('s1')).toBe(3)
    expect(combos.get('k1')).toBe(1)
    const lonely = wardrobeInsights(
      [piece('t', 'Oberteile'), piece('s', 'Schuhe')],
      [],
      [],
      '2026-10-24',
    )
    expect(lonely.loners.map((item) => item.id)).toEqual(['t', 's'])
  })

  it('gibt verständliche Hinweise zur Balance', () => {
    const many = [
      ...['a', 'b', 'c', 'd'].map((id) => piece(id, 'Oberteile')),
      piece('h', 'Hosen'),
    ]
    const result = wardrobeInsights(many, [], [], '2026-10-24')
    expect(result.hints.join(' ')).toMatch(/Ohne Schuhe/)
    expect(result.hints.join(' ')).toMatch(/4 zu 1/)
  })
})
