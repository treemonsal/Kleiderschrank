import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  stylistLooks,
  stylistPieces,
  stylistPrompt,
  stylistRevision,
  parseStylistAdvice,
  type StylistInput,
} from '../src/stylist-model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  outfitKey,
} from '../src/outfit-model'
import type { Garment } from '../src/model'
import { WardrobeDatabase } from '../src/db'
import { chooseDailyOutfit } from '../src/daily-outfit'
import { applyStylistLook } from '../src/daily-choice'
import { localDay } from '../src/calendar'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'

const stamp = '2026-01-01T00:00:00.000Z'
const items: Garment[] = (
  ['Oberteile', 'Hosen', 'Schuhe', 'Oberteile', 'Accessoires'] as const
).map((category, index) => ({
  id: `g-${index}`,
  name: `Stück ${index}`,
  category,
  color: 'Weiss',
  brand: '',
  styles: [],
  seasons: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}))
const candidate = (ids: string[]) => ({
  key: outfitKey(ids),
  garmentIds: ids,
  reasons: [],
  score: 1,
})
const input: StylistInput = {
  items,
  candidates: [
    candidate(['g-0', 'g-1', 'g-2']),
    candidate(['g-3', 'g-1', 'g-2']),
  ],
  options: DEFAULT_OUTFIT_OPTIONS,
  preferences: DEFAULT_PREFERENCES,
}
const answer = {
  choice: 'L2',
  reason: 'Die ruhigen Farben passen zusammen.',
  tips: ['Das Oberteil leicht einstecken.'],
  caveat: 'Die Passform am Körper ist nicht sichtbar.',
}

describe('Online-Stylist: begrenzte Auswahl und echte Zuordnung', () => {
  it('sendet nur vorhandene vollständige Looks, ohne doppelte oder schmutzige Teile', () => {
    const looks = stylistLooks({
      ...input,
      candidates: [
        ...input.candidates,
        input.candidates[0],
        candidate(['unknown', 'g-1', 'g-2']),
        candidate(['g-0', 'g-1']),
        candidate(['g-0', 'g-0', 'g-2']),
      ],
    })
    expect(looks).toHaveLength(2)
    expect(stylistPieces(input).map((item) => item.id)).not.toContain('g-4')
    expect(
      stylistLooks({
        ...input,
        items: items.map((item) =>
          item.id === 'g-3' ? { ...item, inLaundry: true } : item,
        ),
      }),
    ).toHaveLength(1)
  })
  it('begrenzt Kontext und überträgt weder die ganze Sammlung noch Standortkoordinaten', () => {
    const prompt = stylistPrompt(
      {
        ...input,
        items: [
          ...items,
          {
            ...items[4],
            name: 'Nicht ausgewählt',
            notes: 'Private zusätzliche Notiz',
          },
        ],
        weather: { day: localDay(), min: 5, max: 13, rain: 80, code: 61 },
      },
      'Fürs Büro',
    )
    const data = JSON.parse(prompt.split('REFERENCE DATA:\n')[1])
    expect(data.request).toBe('Fürs Büro')
    expect(data.weather).toEqual({ minC: 5, maxC: 13, rainPercent: 80 })
    expect(data.garments).toHaveLength(4)
    expect(prompt).not.toContain('Private zusätzliche Notiz')
    expect(prompt).not.toContain('latitude')
    expect(data.looks[1]).toEqual({
      choice: 'L2',
      garments: ['G4', 'G2', 'G3'],
    })
  })
  it('verknüpft die Antwort nur mit einem tatsächlich angebotenen Look', () => {
    const result = parseStylistAdvice(answer, input.candidates)
    expect(result.candidate).toBe(input.candidates[1])
    expect(result.reason).toBe(answer.reason)
  })
  it.each([
    null,
    [],
    { ...answer, choice: 'L9' },
    { ...answer, choice: 'g-0' },
    { ...answer, tips: [] },
    { ...answer, reason: 'x'.repeat(701) },
    { ...answer, tips: ['x'.repeat(201)] },
  ])('verwirft unbrauchbare oder erfundene Antworten %j', (value) => {
    expect(() => parseStylistAdvice(value, input.candidates)).toThrow()
  })
  it('erkennt Kontextänderungen, ohne unbeteiligte Kleidungsstücke zu berücksichtigen', () => {
    const revision = stylistRevision(input)
    expect(
      stylistRevision({
        ...input,
        items: items.map((item) =>
          item.id === 'g-0'
            ? { ...item, updatedAt: '2026-02-01T00:00:00Z' }
            : item,
        ),
      }),
    ).not.toBe(revision)
    expect(
      stylistRevision({
        ...input,
        items: items.map((item) =>
          item.id === 'g-4'
            ? { ...item, updatedAt: '2026-02-01T00:00:00Z' }
            : item,
        ),
      }),
    ).toBe(revision)
  })
})

const databases: WardrobeDatabase[] = []
afterEach(async () => {
  for (const database of databases.splice(0)) await database.delete()
})
async function setup() {
  const database = new WardrobeDatabase(`stylist-${crypto.randomUUID()}`)
  databases.push(database)
  await database.garments.bulkPut(items)
  const current = chooseDailyOutfit(
    items,
    DEFAULT_PREFERENCES,
    [],
    [],
    [],
    localDay(),
  )
  const chosen = current.garmentIds.map((id) =>
    id === 'g-0' ? 'g-3' : id === 'g-3' ? 'g-0' : id,
  )
  return {
    database,
    request: {
      day: localDay(),
      expectedIds: current.garmentIds,
      expectedSelection: null,
      expectedPreferences: DEFAULT_PREFERENCES.updatedAt,
      garmentIds: chosen,
      versions: items.map((item) => ({
        id: item.id,
        updatedAt: item.updatedAt,
      })),
      options: current.options,
    },
  }
}

describe('KI-Auswahl: atomare Übernahme ohne alte Änderungen zu überschreiben', () => {
  it('speichert die Auswahl dauerhaft und erhält sie in Sicherung und Wiederherstellung', async () => {
    const { database, request } = await setup()
    await applyStylistLook(request, database)
    expect(
      (await database.preferences.get('personal'))?.dailySelection?.garmentIds,
    ).toEqual(request.garmentIds)
    const backup = await createDatabaseBackup(database)
    const restored = new WardrobeDatabase(
      `stylist-restore-${crypto.randomUUID()}`,
    )
    databases.push(restored)
    await importFullBackup(await parseFullBackup(backup), 'merge', restored)
    expect(
      (await restored.preferences.get('personal'))?.dailySelection?.garmentIds,
    ).toEqual(request.garmentIds)
  })
  it.each([
    'preferences',
    'laundry',
    'deleted',
    'edited',
    'rejected',
    'day',
    'planned',
  ] as const)(
    'verwirft eine veraltete Empfehlung nach Änderung: %s',
    async (change) => {
      const { database, request } = await setup()
      const chosen = request.garmentIds[0]
      if (change === 'preferences')
        await database.preferences.put({
          ...DEFAULT_PREFERENCES,
          styles: ['Elegant'],
          updatedAt: stamp,
        })
      if (change === 'laundry')
        await database.garments.update(chosen, { inLaundry: true })
      if (change === 'deleted') await database.garments.delete(chosen)
      if (change === 'edited')
        await database.garments.update(chosen, {
          updatedAt: '2026-02-01T00:00:00Z',
        })
      if (change === 'rejected')
        await database.feedback.put({
          id: outfitKey(request.garmentIds),
          garmentIds: request.garmentIds,
          verdict: 'rejected',
          updatedAt: stamp,
        })
      if (change === 'day') request.day = '2020-01-01'
      if (change === 'planned') {
        await database.outfits.put({
          id: 'planned-look',
          name: 'Schon geplant',
          garmentIds: request.expectedIds,
          occasion: request.options.occasion,
          season: request.options.season,
          style: request.options.style,
          favorite: false,
          createdAt: stamp,
          updatedAt: stamp,
        })
        await database.calendar.put({
          id: request.day,
          day: request.day,
          outfitId: 'planned-look',
          status: 'planned',
          note: '',
          createdAt: stamp,
          updatedAt: stamp,
        })
      }
      await expect(applyStylistLook(request, database)).rejects.toThrow(
        'inzwischen geändert',
      )
      expect(
        (await database.preferences.get('personal'))?.dailySelection,
      ).toBeUndefined()
    },
  )
  it('übernimmt zwei konkurrierende Bestätigungen nicht doppelt', async () => {
    const { database, request } = await setup()
    const results = await Promise.allSettled([
      applyStylistLook(request, database),
      applyStylistLook(request, database),
    ])
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(
      1,
    )
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1)
  })
})
