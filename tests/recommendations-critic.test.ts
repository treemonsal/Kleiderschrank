import { describe, expect, it } from 'vitest'
import { generateOutfits } from '../src/generator'
import { chooseDailyOutfit } from '../src/daily-outfit'
import { buildChatContext } from '../src/chat-model'
import type { ChatData, ChatSession } from '../src/chat-model'
import type { Garment } from '../src/model'
import { CATEGORIES } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  outfitKey,
  type OutfitFeedback,
  type OutfitOptions,
  type SavedOutfit,
} from '../src/outfit-model'
import type { CalendarEntry } from '../src/calendar'

const stamp = '2026-10-20T00:00:00.000Z'
function garment(
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment {
  return {
    id,
    name: id,
    category,
    color: 'Schwarz',
    brand: '',
    styles: [],
    seasons: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}
const pants = garment('pants', 'Hosen'),
  shoes = garment('shoes', 'Schuhe')
const reject = (ids: string[]): OutfitFeedback => ({
  id: outfitKey(ids),
  garmentIds: ids,
  verdict: 'rejected',
  updatedAt: stamp,
})
const saved = (
  ids: string[],
  options: Partial<OutfitOptions> = {},
): SavedOutfit => ({
  id: 'today',
  name: 'Mein Termin',
  garmentIds: ids,
  ...DEFAULT_OUTFIT_OPTIONS,
  ...options,
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
})
const planned: CalendarEntry = {
  id: '2026-10-20',
  day: '2026-10-20',
  outfitId: 'today',
  status: 'planned',
  note: '',
  createdAt: stamp,
  updatedAt: stamp,
}

// These cases failed in the previous implementation despite valid wardrobe data.
describe('Vorschläge nach ausgeschöpften bevorzugten Suchfenstern', () => {
  it('findet das neunzehnte Oberteil, wenn alle bevorzugten 18 Kombinationen abgelehnt sind', () => {
    const tops = Array.from({ length: 19 }, (_, i) =>
      garment(`top-${i}`, 'Oberteile', { favorite: i < 18 }),
    )
    const feedback = tops
      .slice(0, 18)
      .map((top) => reject([top.id, pants.id, shoes.id]))
    const results = generateOutfits(
      [...tops, pants, shoes],
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(results).toHaveLength(1)
    expect(results[0].garmentIds).toEqual(['top-18', pants.id, shoes.id])
    expect(feedback.some((entry) => entry.id === results[0].key)).toBe(false)
  })
  it('füllt zwei übrig gebliebene Vorschläge mit einer gültigen Basis ausserhalb des ersten Fensters auf', () => {
    const tops = Array.from({ length: 19 }, (_, i) =>
      garment(`top-${i}`, 'Oberteile', { favorite: i < 18 }),
    )
    const feedback = tops
      .slice(2, 18)
      .map((top) => reject([top.id, pants.id, shoes.id]))
    const results = generateOutfits(
      [...tops, pants, shoes],
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(results).toHaveLength(3)
    expect(results.some((result) => result.garmentIds.includes('top-18'))).toBe(
      true,
    )
    expect(
      results.every(
        (result) => !feedback.some((entry) => entry.id === result.key),
      ),
    ).toBe(true)
  })
  it('respektiert auch im erweiterten Suchfenster Wäsche und ausdrücklich ausgeschlossene Looks', () => {
    const tops = Array.from({ length: 19 }, (_, i) =>
      garment(`top-${i}`, 'Oberteile', { favorite: i < 18 }),
    )
    const feedback = tops
      .slice(0, 18)
      .map((top) => reject([top.id, pants.id, shoes.id]))
    const excluded = new Set([outfitKey(['top-18', pants.id, shoes.id])])
    expect(
      generateOutfits(
        [...tops, pants, shoes],
        DEFAULT_OUTFIT_OPTIONS,
        DEFAULT_PREFERENCES,
        feedback,
        0,
        undefined,
        undefined,
        undefined,
        excluded,
      ),
    ).toEqual([])
    tops[18].inLaundry = true
    expect(
      generateOutfits(
        [...tops, pants, shoes],
        DEFAULT_OUTFIT_OPTIONS,
        DEFAULT_PREFERENCES,
        feedback,
      ),
    ).toEqual([])
  })
  it('berücksichtigt eine fünfte Jacke statt einen vorhandenen vollständigen Winterlook zu übersehen', () => {
    const top = garment('top', 'Oberteile')
    const jackets = Array.from({ length: 5 }, (_, i) =>
      garment(`jacket-${i}`, 'Jacken', { favorite: i < 4 }),
    )
    const feedback = jackets
      .slice(0, 4)
      .map((jacket) => reject([top.id, pants.id, shoes.id, jacket.id]))
    const results = generateOutfits(
      [top, pants, shoes, ...jackets],
      { ...DEFAULT_OUTFIT_OPTIONS, season: 'Winter' },
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(results).toHaveLength(1)
    expect(results[0].garmentIds).toContain('jacket-4')
  })
  it('berücksichtigt ein viertes Accessoire, ohne die gespeicherte Accessoire-Auswahl zu umgehen', () => {
    const top = garment('top', 'Oberteile')
    const accessories = Array.from({ length: 4 }, (_, i) =>
      garment(`extra-${i}`, 'Accessoires', { favorite: i < 3 }),
    )
    const feedback = accessories
      .slice(0, 3)
      .map((extra) => reject([top.id, pants.id, shoes.id, extra.id]))
    const wardrobe = [top, pants, shoes, ...accessories]
    const withAccessory = generateOutfits(
      wardrobe,
      { ...DEFAULT_OUTFIT_OPTIONS, includeAccessory: true },
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(withAccessory).toHaveLength(1)
    expect(withAccessory[0].garmentIds).toContain('extra-3')
    expect(
      generateOutfits(
        wardrobe,
        DEFAULT_OUTFIT_OPTIONS,
        DEFAULT_PREFERENCES,
        feedback,
      )[0].garmentIds,
    ).toHaveLength(3)
  })
  it('findet bei 1000 Stücken auch hinter 997 Ablehnungen das verbleibende Oberteil', () => {
    const tops = Array.from({ length: 998 }, (_, i) =>
      garment(`top-${i}`, 'Oberteile', { favorite: i < 18 }),
    )
    const feedback = tops
      .slice(0, 997)
      .map((top) => reject([top.id, pants.id, shoes.id]))
    const results = generateOutfits(
      [...tops, pants, shoes],
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(results).toHaveLength(1)
    expect(results[0].garmentIds).toContain('top-997')
  })
})

describe('Vollständiger und zutreffender Tageskontext für den Chat', () => {
  it('übernimmt Anlass, Saison, Stil und Accessoire aus dem eingeplanten Look statt aus globalen Filtern', () => {
    const garments = [
      garment('top', 'Oberteile'),
      pants,
      shoes,
      garment('watch', 'Accessoires'),
    ]
    const outfit = saved(
      garments.map((item) => item.id),
      { occasion: 'Abend', season: 'Winter', style: 'Elegant' },
    )
    const result = chooseDailyOutfit(
      garments,
      DEFAULT_PREFERENCES,
      [],
      [outfit],
      [planned],
      planned.day,
    )
    expect(result.options).toEqual({
      occasion: 'Abend',
      season: 'Winter',
      style: 'Elegant',
      includeAccessory: true,
    })
    expect(result.garmentIds).toEqual(outfit.garmentIds)
    expect(DEFAULT_OUTFIT_OPTIONS).toEqual({
      occasion: 'Alltag',
      season: 'Alle',
      style: 'Alle',
      includeAccessory: false,
    })
  })
  it('erhält den heutigen Schuh trotz älterer Lookkarten und einer aktuellen Anfrage nach anderen Sneakern', () => {
    const garments = CATEGORIES.flatMap((category) =>
      Array.from({ length: 8 }, (_, i) =>
        garment(`${category}-${i}`, category, {
          name:
            category === 'Schuhe' && i < 6
              ? `Weisse Nike Air Force One Sneaker ${i}`
              : `${category} ${i}`,
        }),
      ),
    )
    const ids = ['Oberteile-7', 'Hosen-7', 'Schuhe-7']
    const chat: ChatSession = {
      id: 'stylist',
      revision: 'r',
      updatedAt: stamp,
      messages: Array.from({ length: 6 }, (_, i) => ({
        id: `m-${i}`,
        role: i % 2 ? ('assistant' as const) : ('user' as const),
        text: i % 2 ? 'Ein anderer Look.' : 'Und eine Alternative?',
        createdAt: stamp,
        ...(i % 2
          ? {
              look: {
                garmentIds: [`Oberteile-${i}`, `Hosen-${i}`, `Schuhe-${i}`],
                options: DEFAULT_OUTFIT_OPTIONS,
              },
            }
          : {}),
      })),
    }
    const context = buildChatContext(
      {
        garments,
        preferences: DEFAULT_PREFERENCES,
        feedback: [],
        outfits: [saved(ids)],
        calendar: [planned],
        chat,
      },
      'Kann ich heute stattdessen meine weissen Nike Air Force One Sneaker tragen?',
      Date.parse('2026-10-20T12:00:00Z'),
    )
    const reference = JSON.parse(context.prompt.split('REFERENCE DATA:\n')[1])
    expect(context.items).toHaveLength(40)
    expect(new Set(context.items.map((item) => item.id)).size).toBe(40)
    expect(reference.today.garments).toHaveLength(3)
    expect(
      ids.every((id) => context.items.some((item) => item.id === id)),
    ).toBe(true)
    expect(new Set(context.items.map((item) => item.category)).size).toBe(6)
  })
  it('hält auch bei vielen ausdrücklich genannten Farben das 40er-Limit und die Kategorien ein', () => {
    const tops = Array.from({ length: 100 }, (_, i) =>
      garment(`blue-${i}`, 'Oberteile', { color: 'Blau' }),
    )
    const garments = [
      ...tops,
      pants,
      shoes,
      garment('dress', 'Kleider'),
      garment('jacket', 'Jacken'),
      garment('watch', 'Accessoires'),
    ]
    const data: ChatData = {
      garments,
      preferences: DEFAULT_PREFERENCES,
      feedback: [],
      outfits: [],
      calendar: [],
    }
    const context = buildChatContext(
      data,
      'Was passt zu Blau?',
      Date.parse('2026-10-20T12:00:00Z'),
    )
    expect(context.items).toHaveLength(40)
    expect(new Set(context.items.map((item) => item.category)).size).toBe(6)
    expect(context.prompt).not.toContain('latitude')
  })
})
