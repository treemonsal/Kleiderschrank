import { describe, expect, it } from 'vitest'
import {
  accessoriesFit,
  accessoryKind,
  accessorySets,
} from '../src/accessories'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
} from '../src/outfit-model'

const stamp = '2026-01-01T00:00:00.000Z'
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
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})
const a = (name: string) => piece(name, 'Accessoires')

describe('Mehrere Accessoires', () => {
  it('erkennt die Art am Namen', () => {
    expect(accessoryKind(a('Silberner Ring'))).toBe('ring')
    expect(accessoryKind(a('Sonnenbrille'))).toBe('glasses')
    expect(accessoryKind(a('Halskette Gold'))).toBe('necklace')
    expect(accessoryKind(a('Ledergürtel'))).toBe('belt')
    expect(accessoryKind(a('Armbanduhr'))).toBe('watch')
    expect(accessoryKind(a('Lieblingsding'))).toBe('other')
  })

  it('mischt sinnvoll: Brille und zwei Ringe ja, zwei Gürtel nein', () => {
    expect(accessoriesFit([a('Brille'), a('Ring 1'), a('Ring 2')])).toBe(true)
    expect(accessoriesFit([a('Halskette'), a('Gürtel'), a('Ring')])).toBe(true)
    expect(accessoriesFit([a('Gürtel braun'), a('Gürtel schwarz')])).toBe(false)
    expect(accessoriesFit([a('Ring 1'), a('Ring 2'), a('Ring 3')])).toBe(false)
    expect(accessoriesFit([a('Brille'), a('Kette'), a('Ring'), a('Uhr')])).toBe(
      false,
    )
  })

  it('bildet Sets aus den besten Stücken', () => {
    const sets = accessorySets([
      a('Brille'),
      a('Sonnenbrille'),
      a('Ring 1'),
      a('Ring 2'),
    ])
    expect(sets.every((set) => accessoriesFit(set))).toBe(true)
    expect(sets.some((set) => set.length === 3)).toBe(true)
  })

  it('schlägt mehrere passende Accessoires zusammen vor', () => {
    const items = [
      piece('Hemd', 'Oberteile'),
      piece('Hose', 'Hosen'),
      piece('Schuh', 'Schuhe'),
      a('Brille'),
      a('Ring 1'),
      a('Ring 2'),
      a('Gürtel'),
    ]
    const [look] = generateOutfits(
      items,
      { ...DEFAULT_OUTFIT_OPTIONS, includeAccessory: true },
      DEFAULT_PREFERENCES,
      [],
    )
    const extras = look.garmentIds.filter((id) =>
      ['Brille', 'Ring 1', 'Ring 2', 'Gürtel'].includes(id),
    )
    expect(extras.length).toBeGreaterThan(1)
    expect(
      isCompleteOutfit(
        look.garmentIds.map((id) => items.find((item) => item.id === id)!),
      ),
    ).toBe(true)
  })
})
