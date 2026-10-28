import { describe, expect, it } from 'vitest'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../src/outfit-model'
import {
  occasionLookScore,
  patternHarmony,
  seasonFor,
  wornTogether,
  wornTogetherScore,
} from '../src/styling-rules'
import { recentWear } from '../src/wear-history'

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
const best = (
  items: Garment[],
  occasion: (typeof DEFAULT_OUTFIT_OPTIONS)['occasion'] = 'Alltag',
  day = '2026-10-28',
) =>
  generateOutfits(
    items,
    { ...DEFAULT_OUTFIT_OPTIONS, occasion, includeAccessory: false },
    DEFAULT_PREFERENCES,
    [],
    0,
    undefined,
    new Map(),
    { pieces: new Map(), combinations: new Map(), day },
  )[0].garmentIds

describe('Bessere Outfitauswahl 0.34.0', () => {
  it('wählt fürs Büro elegante statt sportliche Teile, für die Freizeit umgekehrt', () => {
    const items = [
      piece('hoodie', 'Oberteile', { styles: ['Sportlich'] }),
      piece('hemd', 'Oberteile', { styles: ['Elegant'] }),
      piece('hose', 'Hosen'),
      piece('schuh', 'Schuhe'),
    ]
    expect(best(items, 'Büro')).toContain('hemd')
    expect(best(items, 'Abend')).toContain('hemd')
    expect(best(items, 'Freizeit')).toContain('hoodie')
    expect(
      occasionLookScore([{ styles: ['Sportlich'] }], 'Büro').note,
    ).toContain('locker')
  })

  it('zieht Stücke der aktuellen Jahreszeit vor', () => {
    const items = [
      piece('sommer', 'Oberteile', { seasons: ['Sommer'] }),
      piece('winter', 'Oberteile', { seasons: ['Winter'] }),
      piece('hose', 'Hosen'),
      piece('schuh', 'Schuhe'),
    ]
    expect(best(items, 'Alltag', '2026-01-15')).toContain('winter')
    expect(best(items, 'Alltag', '2026-07-15')).toContain('sommer')
    expect(seasonFor('2026-04-10')).toBe('Frühling')
    expect(
      seasonFor('2026-04-10', {
        day: '2026-04-10',
        min: 15,
        max: 26,
        rain: 0,
        code: 0,
      }),
    ).toBe('Sommer')
  })

  it('greift eine Farbe aus dem Muster auf und vermeidet zwei Muster zusammen', () => {
    const items = [
      piece('streifen', 'Oberteile', {
        color: 'Weiss',
        secondaryColors: ['Rot'],
      }),
      piece('rot', 'Hosen', { color: 'Rot' }),
      piece('gruen', 'Hosen', { color: 'Grün' }),
      piece('schuh', 'Schuhe', { color: 'Schwarz' }),
    ]
    expect(best(items)).toContain('rot')
    expect(patternHarmony(items.slice(0, 2)).note).toContain(
      'greift eine Farbe',
    )
    const twoPatterns = patternHarmony([
      items[0],
      piece('karo', 'Hosen', { color: 'Grau', secondaryColors: ['Blau'] }),
    ])
    expect(twoPatterns.score).toBeLessThan(0)
  })

  it('bevorzugt Paare, die wirklich zusammen getragen wurden', () => {
    const items = [
      piece('a', 'Oberteile'),
      piece('b', 'Oberteile'),
      piece('hose', 'Hosen'),
      piece('schuh', 'Schuhe'),
    ]
    const outfits = [
      {
        id: 'o',
        name: 'x',
        garmentIds: ['b', 'hose', 'schuh'],
        occasion: 'Alltag' as const,
        season: 'Alle' as const,
        style: 'Alle' as const,
        favorite: false,
        createdAt: stamp,
        updatedAt: stamp,
      },
    ]
    const calendar = ['2026-09-01', '2026-09-20'].map((day) => ({
      id: day,
      day,
      outfitId: 'o',
      status: 'worn' as const,
      note: '',
      createdAt: stamp,
      updatedAt: stamp,
    }))
    const history = recentWear(calendar, outfits, '2026-10-28', '2026-10-28')
    expect(wornTogetherScore(items.slice(1), history.together)).toBeGreaterThan(
      0,
    )
    const look = generateOutfits(
      items,
      { ...DEFAULT_OUTFIT_OPTIONS, includeAccessory: false },
      DEFAULT_PREFERENCES,
      [],
      0,
      undefined,
      new Map(),
      history,
    )[0]
    expect(look.garmentIds).toContain('b')
    expect(look.reasons.join(' ')).toContain('schon zusammen getragen')
    expect(wornTogether([['x', 'y']]).get('x|y')).toBe(1)
  })
})
