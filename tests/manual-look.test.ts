import { describe, expect, it } from 'vitest'
import {
  chosenLook,
  lookRows,
  missingRows,
  sweaterFits,
  wearsDress,
} from '../src/manual-look'
import type { Category, Garment } from '../src/model'

const stamp = '2026-01-01T00:00:00.000Z'
const piece = (
  id: string,
  category: Category,
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
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})

describe('Selber zusammenstellen', () => {
  const items = [
    piece('Hemd', 'Oberteile'),
    piece('Shirt', 'Oberteile', { favorite: true }),
    piece('Kleid', 'Kleider'),
    piece('Jeans', 'Hosen'),
    piece('Sneaker', 'Schuhe'),
    piece('Mantel', 'Jacken'),
    piece('Alt', 'Oberteile', { archivedAt: stamp }),
    piece('Nass', 'Hosen', { inLaundry: true }),
  ]
  const rows = lookRows(items)
  const row = (id: string) => rows.find((entry) => entry.id === id)!

  it('zeigt nur tragbare Stücke, Favoriten zuerst', () => {
    expect(row('top').items.map((item) => item.id)).toEqual([
      'Shirt',
      'Hemd',
      'Kleid',
    ])
    expect(row('bottom').items.map((item) => item.id)).toEqual(['Jeans'])
  })

  it('startet mit dem ersten Stück jeder Pflichtreihe und ohne Jacke', () => {
    expect(chosenLook(rows, {})).toEqual(['Shirt', 'Jeans', 'Sneaker'])
    expect(chosenLook(rows, { jacket: 0 })).toEqual([
      'Mantel',
      'Shirt',
      'Jeans',
      'Sneaker',
    ])
  })

  it('lässt beim Kleid die Hose weg', () => {
    const choice = { top: 2 }
    expect(wearsDress(rows, choice)).toBe(true)
    expect(chosenLook(rows, choice)).toEqual(['Kleid', 'Sneaker'])
  })

  it('nennt fehlende Reihen statt einen unvollständigen Look zu bauen', () => {
    const shoeless = lookRows(
      items.filter((item) => item.category !== 'Schuhe'),
    )
    expect(chosenLook(shoeless, {})).toBeNull()
    expect(missingRows(shoeless, {})).toEqual(['Schuhe'])
    const dressOnly = lookRows([
      piece('Kleid', 'Kleider'),
      piece('S', 'Schuhe'),
    ])
    expect(missingRows(dressOnly, {})).toEqual([])
    expect(chosenLook(dressOnly, {})).toEqual(['Kleid', 'S'])
  })

  it('legt einen Pullover nur über ein Shirt', () => {
    const rows = lookRows([
      piece('T-Shirt', 'Oberteile'),
      piece('Hoodie', 'Oberteile'),
      piece('Jeans', 'Hosen'),
      piece('Sneaker', 'Schuhe'),
    ])
    const sweater = rows.find((row) => row.id === 'sweater')!
    expect(sweater.items.map((item) => item.id)).toEqual(['Hoodie'])
    // Top rows sort by name: Hoodie, T-Shirt. Shirt chosen, pullover over it.
    expect(chosenLook(rows, { top: 1, sweater: 0 })).toEqual([
      'Hoodie',
      'T-Shirt',
      'Jeans',
      'Sneaker',
    ])
    // The hoodie as the top: no second pullover.
    expect(sweaterFits(rows, { top: 0 })).toBe(false)
    expect(chosenLook(rows, { top: 0, sweater: 0 })).toEqual([
      'Hoodie',
      'Jeans',
      'Sneaker',
    ])
  })
})
