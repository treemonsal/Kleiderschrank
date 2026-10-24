import { describe, expect, it } from 'vitest'
import type { Garment } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../src/outfit-model'
import { packingPlan } from '../src/packing'

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

describe('Packliste', () => {
  const items = [
    ...['t1', 't2', 't3', 't4'].map((id) => piece(id, 'Oberteile')),
    ...['h1', 'h2', 'h3'].map((id) => piece(id, 'Hosen')),
    piece('s1', 'Schuhe'),
    piece('s2', 'Schuhe'),
  ]

  it('plant einen Look pro Tag, wiederholt keine Kombination und packt sparsam', () => {
    const plan = packingPlan(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
      4,
    )
    expect(plan.looks).toHaveLength(4)
    expect(
      new Set(plan.looks.map((look) => [...look].sort().join())).size,
    ).toBe(4)
    expect(plan.pieces.length).toBeLessThan(items.length)
    for (const look of plan.looks)
      for (const id of look) expect(plan.pieces.map((p) => p.id)).toContain(id)
  })

  it('wiederholt Looks nur, wenn der Schrank zu klein ist', () => {
    const small = [
      piece('t', 'Oberteile'),
      piece('h', 'Hosen'),
      piece('s', 'Schuhe'),
    ]
    const plan = packingPlan(
      small,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
      3,
    )
    expect(plan.looks).toHaveLength(3)
    expect(plan.pieces.map((p) => p.id)).toEqual(['t', 'h', 's'])
  })

  it('liefert nichts ohne vollständigen Look', () => {
    expect(
      packingPlan(
        [piece('t', 'Oberteile')],
        DEFAULT_OUTFIT_OPTIONS,
        DEFAULT_PREFERENCES,
        [],
        3,
      ),
    ).toEqual({ looks: [], pieces: [] })
  })
})
