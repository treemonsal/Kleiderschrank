import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { chooseDailyOutfit } from '../src/daily-outfit'
import {
  WardrobeDatabase,
  saveOutfitOptions,
  savePreferences,
  updatePreferences,
} from '../src/db'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
import type { Garment } from '../src/model'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_OUTFIT_OPTIONS,
  isCompleteOutfit,
  outfitKey,
  type SavedOutfit,
} from '../src/outfit-model'
const stamp = '2026-01-01T00:00:00.000Z'
const pieces: Garment[] = (
  ['Oberteile', 'Hosen', 'Schuhe', 'Jacken', 'Accessoires'] as const
).map((category, index) => ({
  id: `piece-${index}`,
  category,
  name: category,
  color: 'Weiss',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}))
const choose = (items = pieces) =>
  chooseDailyOutfit(items, DEFAULT_PREFERENCES, [], [], [], '2026-10-15')

describe('Automatischer Tageslook aus realem Bestand', () => {
  it('ist ohne Klick vollständig, am selben Tag stabil und erfindet keine Stücke', () => {
    const result = choose()
    expect(result).toEqual(choose())
    expect(
      isCompleteOutfit(
        pieces.filter((item) => result.garmentIds.includes(item.id)),
      ),
    ).toBe(true)
    expect(result.garmentIds).toContain('piece-3') // autumn layer
    expect(result.garmentIds).not.toContain('piece-4')
    expect(choose([]).garmentIds).toEqual([])
    expect(choose(pieces.slice(0, 2)).missing).toContain('Schuhe')
  })
  it('berücksichtigt gespeicherte Accessoire-Wahl, Wetter und Ablehnungen', () => {
    const preferences = {
      ...DEFAULT_PREFERENCES,
      outfitOptions: { ...DEFAULT_OUTFIT_OPTIONS, includeAccessory: true },
    }
    const result = chooseDailyOutfit(
      pieces,
      preferences,
      [],
      [],
      [],
      '2026-10-15',
      { day: '2026-10-15', min: 20, max: 27, rain: 0, code: 0 },
    )
    expect(result.garmentIds).toContain('piece-4')
    expect(result.garmentIds).not.toContain('piece-3')
    const feedback = [
      {
        id: outfitKey(result.garmentIds),
        garmentIds: result.garmentIds,
        verdict: 'rejected' as const,
        updatedAt: stamp,
      },
    ]
    expect(
      chooseDailyOutfit(pieces, preferences, feedback, [], [], '2026-10-15', {
        day: '2026-10-15',
        min: 20,
        max: 27,
        rain: 0,
        code: 0,
      }).garmentIds,
    ).toEqual([])
  })
  it('zeigt einen ausdrücklich geplanten vollständigen Look zuerst; veraltete Referenzen werden nicht angezeigt', () => {
    const saved: SavedOutfit = {
      id: 'planned',
      name: 'Mein Termin',
      garmentIds: ['piece-0', 'piece-1', 'piece-2'],
      ...DEFAULT_OUTFIT_OPTIONS,
      favorite: false,
      createdAt: stamp,
      updatedAt: stamp,
    }
    const calendar = [
      {
        id: '2026-10-15',
        day: '2026-10-15',
        outfitId: saved.id,
        status: 'planned' as const,
        note: '',
        createdAt: stamp,
        updatedAt: stamp,
      },
    ]
    const result = chooseDailyOutfit(
      pieces,
      DEFAULT_PREFERENCES,
      [],
      [saved],
      calendar,
      '2026-10-15',
    )
    expect(result.planned).toBe(true)
    expect(result.name).toBe('Mein Termin')
    expect(result.garmentIds).toEqual(saved.garmentIds)
    expect(
      chooseDailyOutfit(
        pieces.slice(1),
        DEFAULT_PREFERENCES,
        [],
        [saved],
        calendar,
        '2026-10-15',
      ).planned,
    ).toBe(false)
    expect(
      chooseDailyOutfit(
        pieces,
        DEFAULT_PREFERENCES,
        [],
        [saved],
        calendar,
        '2026-10-16',
      ).planned,
    ).toBe(false)
  })
})

const databases: WardrobeDatabase[] = []
afterEach(async () => {
  for (const database of databases.splice(0)) {
    database.close()
    await Dexie.delete(database.name)
  }
})
it('speichert Einstellungen atomar nebeneinander und erhält sie bei Vorlieben, Sicherung und Wiederherstellung', async () => {
  const database = new WardrobeDatabase(`settings-${crypto.randomUUID()}`)
  databases.push(database)
  await Promise.all([
    saveOutfitOptions({ includeAccessory: true }, database),
    saveOutfitOptions({ occasion: 'Büro' }, database),
    updatePreferences({ useWeather: false }, database),
  ])
  await savePreferences(['Minimalistisch'], ['Blau'], database)
  const stored = await database.preferences.get('personal')
  expect(stored?.outfitOptions).toEqual({
    ...DEFAULT_OUTFIT_OPTIONS,
    includeAccessory: true,
    occasion: 'Büro',
  })
  expect(stored?.useWeather).toBe(false)
  expect(stored?.styles).toEqual(['Minimalistisch'])
  const json = await createDatabaseBackup(database)
  const parsed = parseFullBackup(json)
  await database.preferences.clear()
  await importFullBackup(parsed, 'replace', database)
  expect(await database.preferences.get('personal')).toEqual(stored)
  const raw = JSON.parse(json)
  raw.preferences.outfitOptions.includeAccessory = 'true'
  expect(() => parseFullBackup(JSON.stringify(raw))).toThrow('keine gültige')
  raw.preferences = stored
  raw.preferences.useWeather = 'true'
  expect(() => parseFullBackup(JSON.stringify(raw))).toThrow('keine gültige')
})
