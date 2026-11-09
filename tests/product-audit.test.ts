import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { generateOutfits } from '../src/generator'
import { createCompatibilityScorer } from '../src/outfit-compatibility'
import { chooseLookForToday } from '../src/daily-choice'
import { chooseDailyOutfit } from '../src/daily-outfit'
import { localDay } from '../src/calendar'
import { WardrobeDatabase, toggleOutfitLike } from '../src/db'
import { createDatabaseBackup, parseFullBackup } from '../src/backup'
import {
  DEFAULT_OUTFIT_OPTIONS as options,
  DEFAULT_PREFERENCES as preferences,
  outfitKey,
  type OutfitFeedback,
} from '../src/outfit-model'
import type { Garment } from '../src/model'
const stamp = '2026-01-01T00:00:00.000Z'
function item(
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment {
  return {
    id,
    name: id,
    category,
    color: 'Weiss',
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
    ...extra,
  }
}
const base = [
  item('top', 'Oberteile'),
  item('pants', 'Hosen'),
  item('shoes', 'Schuhe'),
]
const ids = base.map((item) => item.id)
const like = (ids: string[]): OutfitFeedback => ({
  id: outfitKey(ids),
  garmentIds: ids,
  verdict: 'liked',
  updatedAt: stamp,
})
const databases: WardrobeDatabase[] = []
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})
async function database(extra = true) {
  const db = new WardrobeDatabase(`audit-${crypto.randomUUID()}`)
  databases.push(db)
  await db.garments.bulkPut(
    extra ? [...base, item('alternative', 'Oberteile')] : base,
  )
  return db
}

describe('Empfehlungen mit nachvollziehbarer Gewichtung', () => {
  it('wählt eine bevorzugte Jacke bei gleichem Rest zuverlässig statt zufällig', () => {
    const items = [
      ...base,
      item('plain', 'Jacken'),
      item('favorite', 'Jacken', { favorite: true }),
    ]
    for (let seed = 0; seed < 20; seed++)
      expect(
        generateOutfits(
          items,
          { ...options, season: 'Winter' },
          preferences,
          [],
          seed,
        )[0].garmentIds,
      ).toContain('favorite')
  })
  it('bewertet Jacke und Accessoire gemeinsam mit den Farben der übrigen Stücke', () => {
    const items = [
      { ...base[0], color: 'Rot' },
      ...base.slice(1),
      item('red', 'Jacken', { color: 'Rot' }),
      item('blue', 'Jacken', { color: 'Blau' }),
      item('green', 'Accessoires', { color: 'Grün' }),
      item('white', 'Accessoires'),
    ]
    const result = generateOutfits(
      items,
      { ...options, season: 'Winter', includeAccessory: true },
      preferences,
      [],
      12,
    )[0]
    expect(result.garmentIds).toContain('red')
    expect(result.garmentIds).toContain('white')
    expect(result.garmentIds).not.toContain('blue')
    expect(result.garmentIds).not.toContain('green')
  })
  it('berücksichtigt gemeinsame erfasste Stilrichtungen ohne unbekannte Stile auszuschliessen', () => {
    const items = [
      ...base.map((item) => ({
        ...item,
        styles: ['Minimalistisch'] as Garment['styles'],
      })),
      item('matching', 'Jacken', { styles: ['Minimalistisch'] }),
      item('other', 'Jacken', { styles: ['Sportlich'] }),
    ]
    expect(
      generateOutfits(
        items,
        { ...options, season: 'Winter' },
        preferences,
        [],
        7,
      )[0].garmentIds,
    ).toContain('matching')
    expect(generateOutfits(base, options, preferences, [])).toHaveLength(1)
  })
  it('lernt positiv bewertete Stückpaare auch mit einem anderen Paar Schuhe', () => {
    const items = [
      ...base,
      item('top-b', 'Oberteile'),
      item('pants-b', 'Hosen'),
    ]
    const feedback = [
      like(['top', 'pants', 'old-shoes']),
      like(['top-b', 'pants-b', 'old-shoes']),
    ]
    for (let seed = 0; seed < 12; seed++) {
      const first = generateOutfits(
        items,
        options,
        preferences,
        feedback,
        seed,
      )[0]
      expect(
        (first.garmentIds.includes('top') &&
          first.garmentIds.includes('pants')) ||
          (first.garmentIds.includes('top-b') &&
            first.garmentIds.includes('pants-b')),
      ).toBe(true)
      expect(first.reasons).toContain(
        'Einige dieser Stücke hast du bereits zusammen positiv bewertet.',
      )
    }
  })
  it('findet bei Ablehnung eines Looks eine andere Jacke für dieselbe vollständige Basis', () => {
    const items = [
      ...base,
      item('jacket-a', 'Jacken'),
      item('jacket-b', 'Jacken'),
    ]
    const winter = { ...options, season: 'Winter' as const }
    const first = generateOutfits(items, winter, preferences, [], 3)[0]
    const next = generateOutfits(
      items,
      winter,
      preferences,
      [{ ...like(first.garmentIds), verdict: 'rejected' }],
      3,
    )[0]
    expect(next).toBeDefined()
    expect(next.key).not.toBe(first.key)
    expect(next.garmentIds.filter((id) => ids.includes(id))).toEqual(ids)
  })
  it('behandelt unbekannte Farben nicht als bestätigte neutrale Harmonie', () => {
    const score = createCompatibilityScorer([])
    expect(score(base.map((item) => ({ ...item, color: '' }))).score).toBe(0)
    expect(score(base).score).toBeGreaterThan(0)
  })
  it('bleibt bei 1000 Stücken mit Jacken und Accessoires begrenzt und liefert nur echte Referenzen', () => {
    const categories = [
      'Oberteile',
      'Hosen',
      'Schuhe',
      'Jacken',
      'Accessoires',
    ] as const
    const items = Array.from({ length: 1000 }, (_, i) =>
      item(`large-${i}`, categories[i % categories.length]),
    )
    const start = performance.now()
    const result = generateOutfits(
      items,
      { ...options, season: 'Winter', includeAccessory: true },
      preferences,
      [],
      42,
    )
    expect(result).toHaveLength(3)
    expect(
      result.every(
        (look) =>
          look.garmentIds.length === 5 &&
          look.garmentIds.every((id) => items.some((item) => item.id === id)),
      ),
    ).toBe(true)
    expect(performance.now() - start).toBeLessThan(5000)
  })
})

describe('Direkte Tagesauswahl und kontrollierbares Feedback', () => {
  it('wendet alte Saison- und Stilfilter ohne Auswahl nicht mehr an', () => {
    const daily = chooseDailyOutfit(
      base.map((piece) => ({ ...piece, seasons: ['Sommer'] as const })),
      {
        ...preferences,
        outfitOptions: {
          ...options,
          occasion: 'Büro',
          season: 'Winter',
          style: 'Elegant',
          includeAccessory: true,
        },
      },
      [],
      [],
      [],
      '2026-07-15',
    )
    expect(daily.garmentIds).toHaveLength(3)
    expect(daily.options).toMatchObject({
      occasion: 'Büro',
      season: 'Sommer',
      style: 'Alle',
      includeAccessory: true,
    })
  })
  it('„Für heute“ übernimmt einen Look mit eigenem Anlass dauerhaft und gesichert', async () => {
    const db = await database(),
      day = localDay(),
      chosen = ['alternative', 'pants', 'shoes'],
      lookOptions = { ...options, occasion: 'Büro' as const }
    await chooseLookForToday(
      {
        garmentIds: chosen,
        options: lookOptions,
        versions: (await db.garments.toArray()).map((piece) => ({
          id: piece.id,
          updatedAt: piece.updatedAt,
        })),
      },
      db,
    )
    const selected = (await db.preferences.get('personal'))!.dailySelection!
    expect(selected).toMatchObject({ day, garmentIds: chosen })
    expect(selected.options.occasion).toBe('Büro')
    const daily = chooseDailyOutfit(
      await db.garments.toArray(),
      (await db.preferences.get('personal'))!,
      [],
      [],
      [],
      day,
    )
    expect(outfitKey(daily.garmentIds)).toBe(outfitKey(chosen))
    expect(await db.feedback.count()).toBe(0)
    expect(await db.calendar.count()).toBe(0)
    expect(
      parseFullBackup(await createDatabaseBackup(db)).preferences
        ?.dailySelection,
    ).toEqual(selected)
  })
  it.each(['laundry', 'edited', 'deleted', 'incomplete', 'planned'] as const)(
    '„Für heute“ verweigert veraltete oder unvollständige Looks ohne Schreibvorgang: %s',
    async (change) => {
      const db = await database(),
        day = localDay()
      const versions = (await db.garments.toArray()).map((piece) => ({
        id: piece.id,
        updatedAt: piece.updatedAt,
      }))
      let chosen = ids
      if (change === 'laundry')
        await db.garments.update('top', { inLaundry: true })
      if (change === 'edited')
        await db.garments.update('top', {
          updatedAt: '2026-02-01T00:00:00.000Z',
        })
      if (change === 'deleted') await db.garments.delete('top')
      if (change === 'incomplete') chosen = ['top', 'pants']
      if (change === 'planned')
        await db.calendar.put({
          id: day,
          day,
          outfitId: 'planned',
          status: 'planned',
          note: '',
          createdAt: stamp,
          updatedAt: stamp,
        })
      await expect(
        chooseLookForToday({ garmentIds: chosen, options, versions }, db),
      ).rejects.toThrow()
      expect(await db.preferences.count()).toBe(0)
    },
  )
  it('lässt positive Bewertungen zurücknehmen ohne daraus eine Ablehnung zu machen', async () => {
    const db = await database()
    expect(await toggleOutfitLike(ids, db)).toBe(true)
    expect((await db.feedback.get(outfitKey(ids)))?.verdict).toBe('liked')
    expect(await toggleOutfitLike(ids, db)).toBe(false)
    expect(await db.feedback.count()).toBe(0)
  })
})
