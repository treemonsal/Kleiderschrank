import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { shiftDay, weekDays, type CalendarEntry } from '../src/calendar'
import { dayColors, paletteGradient } from '../src/calendar-colors'
import { recordWornOutfit, saveCalendarEntry } from '../src/calendar-db'
import { WardrobeDatabase } from '../src/db'
import {
  createDatabaseBackup,
  parseFullBackup,
  importFullBackup,
} from '../src/backup'
import { DEFAULT_OUTFIT_OPTIONS, type SavedOutfit } from '../src/outfit-model'
import type { Garment } from '../src/model'
const stamp = '2026-01-01T00:00:00.000Z'
const pieces: Garment[] = (['Oberteile', 'Hosen', 'Schuhe'] as const).map(
  (category, index) => ({
    id: `history-${index}`,
    name: category,
    category,
    color: ['Blau', 'Weiss', 'Schwarz'][index],
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }),
)

describe('Tage und Farbringe', () => {
  it('blättert durch Monats-/Jahresgrenzen und Schaltjahre ohne UTC-Abkürzung', () => {
    expect(shiftDay('2024-03-01', -1)).toBe('2024-02-29')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDay('2026-03-29', 1)).toBe('2026-03-30')
    expect(shiftDay('2026-10-25', -1)).toBe('2026-10-24')
    expect(shiftDay('1900-01-01', -1)).toBeNull()
    expect(shiftDay('2200-12-31', 1)).toBeNull()
    expect(shiftDay('invalid', 1)).toBeNull()
    expect(weekDays('2026-10-15')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
  })
  it('verwendet bestätigte Farbfamilien, schliesst Pläne/Zukunft aus und erfindet keine unbekannten Farben', () => {
    const outfit = {
      id: 'look',
      garmentIds: pieces.map((item) => item.id),
    } as SavedOutfit
    const entry = {
      day: '2026-10-14',
      outfitId: 'look',
      status: 'worn',
    } as CalendarEntry
    expect(dayColors(entry, [outfit], pieces, '2026-10-15')).toEqual([
      'Blau',
      'Weiss',
      'Schwarz',
    ])
    expect(
      dayColors(
        { ...entry, wornColors: ['Rot', 'Rot', ''] },
        [outfit],
        pieces,
        '2026-10-15',
      ),
    ).toEqual(['Rot'])
    expect(
      dayColors(
        { ...entry, status: 'planned' },
        [outfit],
        pieces,
        '2026-10-15',
      ),
    ).toEqual([])
    expect(
      dayColors(
        { ...entry, day: '2026-10-16' },
        [outfit],
        pieces,
        '2026-10-15',
      ),
    ).toEqual([])
    expect(dayColors(undefined, [outfit], pieces, '2026-10-15')).toEqual([])
    expect(paletteGradient([])).toBeUndefined()
    expect(paletteGradient(['unknown'])).toBeUndefined()
    expect(paletteGradient(['Blau', 'Bunt'])).toContain('conic-gradient(')
  })
})
it('bestätigt atomar, friert Farben ein, sichert sie und verwirft kaputte Snapshot-Daten', async () => {
  const db = new WardrobeDatabase(`history-${crypto.randomUUID()}`)
  try {
    await db.garments.bulkPut(pieces)
    await recordWornOutfit(
      pieces.map((item) => item.id),
      DEFAULT_OUTFIT_OPTIONS,
      '2020-01-02',
      null,
      db,
    )
    let entry = (await db.calendar.get('2020-01-02'))!
    expect(entry.status).toBe('worn')
    expect(entry.wornColors).toEqual(['Blau', 'Weiss', 'Schwarz'])
    await db.garments.update('history-0', { color: 'Rot' })
    await saveCalendarEntry({ ...entry, note: 'Notiz' }, entry.updatedAt, db)
    entry = (await db.calendar.get(entry.id))!
    expect(entry.wornColors).toEqual(['Blau', 'Weiss', 'Schwarz'])
    const json = await createDatabaseBackup(db),
      parsed = parseFullBackup(json)
    await importFullBackup(parsed, 'replace', db)
    expect((await db.calendar.get(entry.id))?.wornColors).toEqual(
      entry.wornColors,
    )
    const raw = JSON.parse(json)
    raw.calendar[0].wornColors = ['#ffffff']
    expect(() => parseFullBackup(JSON.stringify(raw))).toThrow('keine gültige')
    raw.calendar[0].wornColors = ['Blau', 'Weiss', 'Schwarz']
    raw.calendar[0].status = 'planned'
    expect(() => parseFullBackup(JSON.stringify(raw))).toThrow('keine gültige')
    await saveCalendarEntry(
      { ...entry, status: 'planned' },
      entry.updatedAt,
      db,
    )
    entry = (await db.calendar.get(entry.id))!
    expect(entry.wornColors).toBeUndefined()
    await saveCalendarEntry({ ...entry, status: 'worn' }, entry.updatedAt, db)
    expect((await db.calendar.get(entry.id))?.wornColors).toEqual([
      'Rot',
      'Weiss',
      'Schwarz',
    ])
  } finally {
    await db.delete()
  }
})
it('ein gescheiterter oder konkurrierender Trageeintrag hinterlässt kein neu gespeichertes Outfit', async () => {
  const db = new WardrobeDatabase(`atomic-history-${crypto.randomUUID()}`)
  try {
    await db.garments.bulkPut(pieces)
    await expect(
      recordWornOutfit(
        pieces.map((item) => item.id),
        DEFAULT_OUTFIT_OPTIONS,
        '2199-01-01',
        null,
        db,
      ),
    ).rejects.toThrow('zukünftiger')
    expect(await db.outfits.count()).toBe(0)
    expect(await db.calendar.count()).toBe(0)
    await recordWornOutfit(
      pieces.map((item) => item.id),
      DEFAULT_OUTFIT_OPTIONS,
      '2020-01-02',
      null,
      db,
    )
    await expect(
      recordWornOutfit(
        pieces.map((item) => item.id),
        DEFAULT_OUTFIT_OPTIONS,
        '2020-01-02',
        null,
        db,
      ),
    ).rejects.toThrow('inzwischen')
    expect(await db.outfits.count()).toBe(1)
    expect(await db.calendar.count()).toBe(1)
  } finally {
    await db.delete()
  }
})
