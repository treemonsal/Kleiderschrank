import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  WardrobeDatabase,
  saveStyleProfile,
  styleProfileRevision,
  setOutfitFeedback,
  toggleOutfitLike,
  removeOutfitFeedback,
  updatePreferences,
} from '../src/db'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  outfitKey,
  type OutfitFeedback,
  type Preferences,
} from '../src/outfit-model'
import {
  DEFAULT_STYLE_PROFILE,
  createPersonalizationScorer,
  feedbackForOccasion,
} from '../src/personalization'
import { generateOutfits } from '../src/generator'
import { chooseDailyOutfit } from '../src/daily-outfit'
import {
  stylistPrompt,
  stylistRevision,
  type StylistInput,
} from '../src/stylist-model'
import type { Garment } from '../src/model'
import { replacementChoices } from '../src/outfit-customization'

const stamp = '2026-01-01T00:00:00.000Z'
const make = (
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment => ({
  id,
  category,
  name: id,
  color: 'Weiss',
  brand: '',
  styles: [],
  seasons: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
  ...extra,
})
const items = [
  make('blue', 'Oberteile', { color: 'Blau', styles: ['Minimalistisch'] }),
  make('red', 'Oberteile', { color: 'Rot', styles: ['Sportlich'] }),
  make('pants', 'Hosen', { color: 'Grau' }),
  make('shoes', 'Schuhe'),
]
const ids = ['blue', 'pants', 'shoes']
const rating = (extra: Partial<OutfitFeedback> = {}): OutfitFeedback => ({
  id: outfitKey(ids),
  garmentIds: ids,
  verdict: 'liked',
  updatedAt: stamp,
  ...extra,
})
const profile = (extra: Partial<Preferences> = {}): Preferences => ({
  ...DEFAULT_PREFERENCES,
  styleProfile: { ...DEFAULT_STYLE_PROFILE },
  ...extra,
})
const databases: WardrobeDatabase[] = []
async function database() {
  const db = new WardrobeDatabase(`personal-test-${crypto.randomUUID()}`)
  databases.push(db)
  await db.garments.bulkAdd(items)
  return db
}
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})

describe('Persönliche Auswahl statt rein dekorativem Fragebogen', () => {
  it('bevorzugt je nach Abwechslungswunsch einen vertrauten bewerteten Look oder eine ungetragene Alternative', () => {
    const history = {
      pieces: new Map(ids.map((id) => [id, 1])),
      combinations: new Map([[outfitKey(ids), 1]]),
    }
    const first = (variety: 'familiar' | 'explore') =>
      generateOutfits(
        items,
        DEFAULT_OUTFIT_OPTIONS,
        profile({ styleProfile: { ...DEFAULT_STYLE_PROFILE, variety } }),
        [rating()],
        0,
        undefined,
        new Map(),
        history,
      )[0]
    expect(first('familiar').garmentIds).toContain('blue')
    expect(first('explore').garmentIds).toContain('red')
  })
  it('ändert Vorschläge schon vor der ersten Bewertung anhand ausdrücklicher Vorlieben', () => {
    const preferences = profile({
      styles: ['Minimalistisch'],
      colors: ['Blau'],
    })
    const first = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      preferences,
      [],
      0,
    )[0]
    expect(first.garmentIds).toContain('blue')
    const changed = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      profile({ styles: ['Sportlich'], colors: ['Rot'] }),
      [],
      0,
    )[0]
    expect(changed.garmentIds).toContain('red')
  })
  it('gewichtet unerwünschte Farben schwächer, ohne bei kleiner Garderobe komplette Looks zu verbieten', () => {
    const preferences = profile({
      styleProfile: { ...DEFAULT_STYLE_PROFILE, avoidColors: ['Blau'] },
    })
    expect(
      generateOutfits(items, DEFAULT_OUTFIT_OPTIONS, preferences, [], 0)[0]
        .garmentIds,
    ).toContain('red')
    const remaining = items.filter((item) => item.id !== 'red')
    expect(
      generateOutfits(remaining, DEFAULT_OUTFIT_OPTIONS, preferences, [], 0)[0]
        .garmentIds,
    ).toContain('blue')
  })
  it('überträgt positives Feedback auf neue passende Stücke statt nur denselben Look zu merken', () => {
    const old = [
      make('old1', 'Oberteile', {
        color: 'Blau',
        styles: ['Minimalistisch'],
        inLaundry: true,
      }),
      make('old2', 'Oberteile', {
        color: 'Blau',
        styles: ['Minimalistisch'],
        inLaundry: true,
      }),
    ]
    const feedback = old.map((item) =>
      rating({
        id: outfitKey([item.id, 'pants', 'shoes']),
        garmentIds: [item.id, 'pants', 'shoes'],
      }),
    )
    const first = generateOutfits(
      [...items, ...old],
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      feedback,
      0,
    )[0]
    expect(first.garmentIds).toContain('blue')
    expect(first.garmentIds).not.toContain('old1')
    expect(first.garmentIds).not.toContain('old2')
    const learned = createPersonalizationScorer(
      [...items, ...old],
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(learned.itemScore(items[0])).toBeGreaterThan(
      learned.itemScore(items[1]),
    )
  })
  it('lernt aus einem Farbgrund Farbpaarungen, ohne alle einzelnen Farben oder Stile abzulehnen', () => {
    const feedback = [rating({ verdict: 'rejected', reason: 'colors' })]
    const personal = createPersonalizationScorer(
      items,
      DEFAULT_PREFERENCES,
      feedback,
    )
    expect(
      personal.lookScore(items.filter((item) => ids.includes(item.id))),
    ).toBeLessThan(0)
    expect(personal.itemScore(items[0])).toBe(0)
    expect(personal.summary.styles).toEqual([])
  })
  it('leitet aus Kombination und Anlass keine allgemeine Stilabneigung ab', () => {
    for (const reason of ['combination', 'occasion'] as const) {
      const personal = createPersonalizationScorer(items, DEFAULT_PREFERENCES, [
        rating({ verdict: 'rejected', reason }),
      ])
      expect(personal.itemScore(items[0])).toBe(0)
      expect(personal.summary.styles).toEqual([])
    }
  })
  it('begrenzt gelernte Hinweise auch nach vielen Bewertungen', () => {
    const votes = Array.from({ length: 1000 }, (_, i) =>
      rating({ id: `vote-${i}`, verdict: 'rejected', reason: 'style' }),
    )
    const personal = createPersonalizationScorer(
      items,
      DEFAULT_PREFERENCES,
      votes,
    )
    expect(personal.itemScore(items[0])).toBeGreaterThanOrEqual(-1)
    expect(personal.summary.styles).toHaveLength(1)
    expect(personal.summary.styles[0].strength).toBe(-1)
  })
  it('beachtet den Anlass bei Auswahl, Tagesauswahl und Tauschteilen; alte Bewertungen bleiben gültig', () => {
    const office = rating({
      verdict: 'rejected',
      reason: 'occasion',
      occasion: 'Büro',
    })
    expect(feedbackForOccasion([office, rating()], 'Alltag')).toHaveLength(1)
    expect(
      generateOutfits(items, DEFAULT_OUTFIT_OPTIONS, DEFAULT_PREFERENCES, [
        office,
      ]).some((c) => c.key === office.id),
    ).toBe(true)
    expect(
      generateOutfits(
        items,
        { ...DEFAULT_OUTFIT_OPTIONS, occasion: 'Büro' },
        DEFAULT_PREFERENCES,
        [office],
      ).some((c) => c.key === office.id),
    ).toBe(false)
    const preferences = profile({
      dailySelection: {
        day: '2026-10-19',
        garmentIds: ids,
        options: DEFAULT_OUTFIT_OPTIONS,
        updatedAt: stamp,
      },
    })
    expect(
      chooseDailyOutfit(items, preferences, [office], [], [], '2026-10-19')
        .garmentIds,
    ).toEqual(ids)
    expect(
      replacementChoices(
        items,
        ['red', 'pants', 'shoes'],
        'red',
        DEFAULT_OUTFIT_OPTIONS,
        preferences,
        [office],
      ).map((i) => i.id),
    ).toContain('blue')
  })
  it('bewertet Abwechslung unterschiedlich, hält aber Wäsche und Saison weiterhin aus der Auswahl heraus', () => {
    const dirty = items.map((item) =>
      item.id === 'red' ? { ...item, inLaundry: true } : item,
    )
    const winter = make('summer', 'Oberteile', { seasons: ['Sommer'] })
    for (const variety of ['familiar', 'balanced', 'explore'] as const) {
      const results = generateOutfits(
        [...dirty, winter],
        { ...DEFAULT_OUTFIT_OPTIONS, season: 'Winter' },
        profile({ styleProfile: { ...DEFAULT_STYLE_PROFILE, variety } }),
        [],
      )
      expect(results.length).toBeGreaterThan(0)
      for (const result of results)
        expect(result.garmentIds).not.toEqual(expect.arrayContaining(['red']))
      for (const result of results)
        expect(result.garmentIds).not.toContain('summer')
    }
  })
})

describe('Dauerhafte, kontrollierbare Stilprofile und Rückmeldungen', () => {
  it('ändert beim neuen Stilprofil keine geplanten oder bestätigten Kalenderlooks', async () => {
    const db = await database()
    await db.outfits.put({
      id: 'planned-look',
      name: 'Mein Look',
      garmentIds: ids,
      ...DEFAULT_OUTFIT_OPTIONS,
      favorite: false,
      createdAt: stamp,
      updatedAt: stamp,
    })
    await db.calendar.bulkPut([
      {
        id: '2026-10-18',
        day: '2026-10-18',
        outfitId: 'planned-look',
        status: 'worn',
        wornColors: ['Blau', 'Grau', 'Weiss'],
        note: '',
        createdAt: stamp,
        updatedAt: stamp,
      },
      {
        id: '2026-10-19',
        day: '2026-10-19',
        outfitId: 'planned-look',
        status: 'planned',
        note: '',
        createdAt: stamp,
        updatedAt: stamp,
      },
    ])
    const before = await db.calendar.toArray()
    await saveStyleProfile(
      { ...DEFAULT_STYLE_PROFILE, usualOccasion: 'Abend' },
      ['Elegant'],
      [],
      styleProfileRevision(DEFAULT_PREFERENCES),
      db,
    )
    expect(await db.calendar.toArray()).toEqual(before)
    expect((await db.outfits.get('planned-look'))?.garmentIds).toEqual(ids)
  })
  it('speichert das Profil atomar, erhält Wetter/Accessoire/Erinnerung und erneuert nur unbestätigte Tagesauswahl', async () => {
    const db = await database()
    const preferences = profile({
      styleProfile: undefined,
      useWeather: false,
      outfitOptions: { ...DEFAULT_OUTFIT_OPTIONS, includeAccessory: true },
      backupReminder: { firstSeenAt: stamp },
      dailySelection: {
        day: '2026-10-19',
        garmentIds: ids,
        options: DEFAULT_OUTFIT_OPTIONS,
        updatedAt: stamp,
      },
    })
    await db.preferences.put(preferences)
    await saveStyleProfile(
      { ...DEFAULT_STYLE_PROFILE, usualOccasion: 'Büro', variety: 'explore' },
      ['Elegant'],
      ['Blau'],
      styleProfileRevision(preferences),
      db,
    )
    const saved = await db.preferences.get('personal')
    expect(saved?.outfitOptions).toMatchObject({
      occasion: 'Büro',
      includeAccessory: true,
    })
    expect(saved?.useWeather).toBe(false)
    expect(saved?.backupReminder).toEqual(preferences.backupReminder)
    expect(saved?.dailySelection).toBeUndefined()
    expect(saved?.styles).toEqual(['Elegant'])
  })
  it('verhindert veraltete Profiländerungen, lässt unabhängige Wetteränderungen aber zu', async () => {
    const db = await database()
    await db.preferences.put(DEFAULT_PREFERENCES)
    await updatePreferences({ useWeather: false }, db)
    await saveStyleProfile(
      DEFAULT_STYLE_PROFILE,
      ['Elegant'],
      [],
      styleProfileRevision(DEFAULT_PREFERENCES),
      db,
    )
    await expect(
      saveStyleProfile(
        DEFAULT_STYLE_PROFILE,
        ['Casual'],
        [],
        styleProfileRevision(DEFAULT_PREFERENCES),
        db,
      ),
    ).rejects.toThrow('inzwischen')
    expect((await db.preferences.get('personal'))?.styles).toEqual(['Elegant'])
  })
  it('überspringt dauerhaft ohne bisherige Vorlieben oder Tagesauswahl zu löschen', async () => {
    const db = await database()
    const preferences = {
      ...DEFAULT_PREFERENCES,
      styles: ['Casual'] as Preferences['styles'],
      dailySelection: {
        day: '2026-10-19',
        garmentIds: ids,
        options: DEFAULT_OUTFIT_OPTIONS,
        updatedAt: stamp,
      },
    }
    await db.preferences.put(preferences)
    await saveStyleProfile(
      { ...DEFAULT_STYLE_PROFILE, status: 'skipped' },
      [],
      [],
      styleProfileRevision(preferences),
      db,
    )
    expect(await db.preferences.get('personal')).toMatchObject({
      styles: ['Casual'],
      dailySelection: preferences.dailySelection,
      styleProfile: { status: 'skipped' },
    })
  })
  it('zählt wiederholte Bewertungen nur einmal, erlaubt Umentscheiden und schützt neue Rückmeldungen vor altem Undo', async () => {
    const db = await database()
    await setOutfitFeedback(ids, 'liked', db, { occasion: 'Alltag' })
    const first = (await db.feedback.get(outfitKey(ids)))!
    await setOutfitFeedback(ids, 'rejected', db, {
      reason: 'colors',
      occasion: 'Alltag',
    })
    expect(await db.feedback.count()).toBe(1)
    await expect(
      removeOutfitFeedback(first.id, first.updatedAt, db),
    ).rejects.toThrow('inzwischen')
    await toggleOutfitLike(ids, db, 'Alltag')
    expect((await db.feedback.get(first.id))?.reason).toBeUndefined()
    expect(await toggleOutfitLike(ids, db, 'Alltag')).toBe(false)
    expect(await db.feedback.count()).toBe(0)
  })
  it('sichert Profil und kontextbezogene Bewertungen und stellt sie ohne Verlust wieder her', async () => {
    const db = await database()
    await db.preferences.put(
      profile({
        styles: ['Minimalistisch'],
        colors: ['Blau'],
        styleProfile: { ...DEFAULT_STYLE_PROFILE, avoidColors: ['Rot'] },
      }),
    )
    await setOutfitFeedback(ids, 'rejected', db, {
      reason: 'colors',
      occasion: 'Alltag',
    })
    const backup = parseFullBackup(await createDatabaseBackup(db))
    const destination = await database()
    await importFullBackup(backup, 'replace', destination)
    expect(await destination.preferences.get('personal')).toEqual(
      await db.preferences.get('personal'),
    )
    expect(await destination.feedback.toArray()).toEqual(
      await db.feedback.toArray(),
    )
    const old = JSON.parse(await createDatabaseBackup(db))
    delete old.preferences.styleProfile
    delete old.feedback[0].occasion
    delete old.feedback[0].reason
    expect(
      parseFullBackup(JSON.stringify(old)).feedback[0].reason,
    ).toBeUndefined()
  })
  it('verwirft fehlerhafte Profil-/Feedbackwerte vor jedem Import und verändert den Bestand nicht', async () => {
    const db = await database()
    await db.preferences.put(profile())
    await setOutfitFeedback(ids, 'rejected', db, { reason: 'colors' })
    const json = await createDatabaseBackup(db)
    for (const mutate of [
      (data: {
        preferences: {
          styleProfile: { variety: string; avoidColors: string[] }
        }
        feedback: { reason: string; occasion: string }[]
      }) => {
        data.preferences.styleProfile.variety = 'bad'
      },
      (data: {
        preferences: {
          styleProfile: { variety: string; avoidColors: string[] }
        }
        feedback: { reason: string; occasion: string }[]
      }) => {
        data.preferences.styleProfile.avoidColors = ['unknown']
      },
      (data: {
        preferences: {
          styleProfile: { variety: string; avoidColors: string[] }
        }
        feedback: { reason: string; occasion: string }[]
      }) => {
        data.feedback[0].reason = 'unknown'
      },
      (data: {
        preferences: {
          styleProfile: { variety: string; avoidColors: string[] }
        }
        feedback: { reason: string; occasion: string }[]
      }) => {
        data.feedback[0].occasion = 'unknown'
      },
    ]) {
      const invalid = JSON.parse(json)
      mutate(invalid)
      expect(() => parseFullBackup(JSON.stringify(invalid))).toThrow()
      expect(await createDatabaseBackup(db)).toContain('"blue"')
      expect(await db.feedback.count()).toBe(1)
    }
  })
  it('gibt ausdrücklich gewählte Vorlieben und passende gelernte Hinweise auch an den Online-Stylisten', () => {
    const input: StylistInput = {
      items,
      options: DEFAULT_OUTFIT_OPTIONS,
      preferences: profile({ styles: ['Minimalistisch'] }),
      candidates: [
        { key: outfitKey(ids), garmentIds: ids, score: 1, reasons: [] },
      ],
      feedback: [rating()],
    }
    const prompt = stylistPrompt(input, '')
    expect(prompt).toContain('styleProfile')
    expect(prompt).toContain('Minimalistisch')
    expect(prompt).toContain('"observations":1')
    expect(prompt).toContain('weak, bounded hints')
    expect(stylistRevision(input)).not.toEqual(
      stylistRevision({ ...input, feedback: [] }),
    )
  })
})
