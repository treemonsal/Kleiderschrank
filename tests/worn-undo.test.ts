import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { localDay, shiftDay } from '../src/calendar'
import { markWorn, saveCalendarEntry, undoWorn } from '../src/calendar-db'
import { saveOutfit, WardrobeDatabase } from '../src/db'
import type { Garment } from '../src/model'
import { DEFAULT_OUTFIT_OPTIONS } from '../src/outfit-model'
import { lookTitle } from '../src/swatch'
import { lastWorn } from '../src/wear-stats'

const stamp = '2026-01-01T00:00:00.000Z'
const piece = (
  id: string,
  category: Garment['category'],
  color: string,
): Garment => ({
  id,
  name: id,
  category,
  color,
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
})
const pieces = [
  piece('jacke', 'Jacken', 'Grün'),
  piece('hemd', 'Oberteile', 'Grau'),
  piece('hose', 'Hosen', 'Beige'),
  piece('schuh', 'Schuhe', 'Weiss'),
]
const ids = pieces.map((item) => item.id)

async function withDb(run: (db: WardrobeDatabase) => Promise<void>) {
  const db = new WardrobeDatabase(`undo-${crypto.randomUUID()}`)
  try {
    await db.garments.bulkPut(pieces)
    await run(db)
  } finally {
    db.close()
    await Dexie.delete(db.name)
  }
}

describe('Looks heissen nach ihren Farben', () => {
  it('nennt die zwei führenden Farben und fällt sonst auf den Anlass zurück', async () => {
    expect(lookTitle(pieces, 'Alltag-Look')).toBe('Grün & Grau')
    expect(
      lookTitle(
        pieces.map((item) => ({ ...item, color: '' })),
        'Alltag-Look',
      ),
    ).toBe('Alltag-Look')
    await withDb(async (db) => {
      const id = await saveOutfit(ids, DEFAULT_OUTFIT_OPTIONS, db)
      expect((await db.outfits.get(id))?.name).toBe('Grün & Grau')
    })
  })

  it('beschreibt den letzten Tragetag', () => {
    expect(lastWorn('2026-10-27', '2026-10-27')).toBe('heute')
    expect(lastWorn('2026-10-26', '2026-10-27')).toBe('gestern')
    expect(lastWorn('2026-10-20', '2026-10-27')).toBe('vor 7 Tagen')
  })
})

describe('„Heute getragen“ rückgängig machen', () => {
  it('entfernt den Tag, den neu angelegten Look und holt Stücke aus der Wäsche', async () => {
    await withDb(async (db) => {
      const today = localDay()
      // A first wear two days ago makes the shirt due on the second wear.
      await saveCalendarEntry(
        {
          day: shiftDay(today, -2)!,
          outfitId: await saveOutfit(
            ['hemd', 'hose', 'schuh'],
            DEFAULT_OUTFIT_OPTIONS,
            db,
          ),
          status: 'worn',
          note: '',
        },
        null,
        db,
      )
      const before = await db.outfits.count()
      const { washed, undo } = await markWorn(
        ids,
        DEFAULT_OUTFIT_OPTIONS,
        today,
        null,
        db,
      )
      expect(washed).toEqual(['hemd'])
      expect(await db.outfits.count()).toBe(before + 1)
      await undoWorn(undo, db)
      expect(await db.calendar.get(today)).toBeUndefined()
      expect(await db.outfits.count()).toBe(before)
      expect((await db.garments.get('hemd'))?.inLaundry).toBe(false)
    })
  })

  it('stellt einen geplanten Tag mit Notiz wieder her und behält bekannte Looks', async () => {
    await withDb(async (db) => {
      const today = localDay()
      const outfitId = await saveOutfit(ids, DEFAULT_OUTFIT_OPTIONS, db)
      await saveCalendarEntry(
        { day: today, outfitId, status: 'planned', note: 'Termin' },
        null,
        db,
      )
      const planned = await db.calendar.get(today)
      const { undo } = await markWorn(
        ids,
        DEFAULT_OUTFIT_OPTIONS,
        today,
        planned!.updatedAt,
        db,
      )
      expect((await db.calendar.get(today))?.status).toBe('worn')
      await undoWorn(undo, db)
      expect(await db.calendar.get(today)).toEqual(planned)
      expect(await db.outfits.get(outfitId)).toBeDefined()
    })
  })

  it('verweigert das Zurücknehmen, wenn der Tag inzwischen geändert wurde', async () => {
    await withDb(async (db) => {
      const today = localDay()
      const { undo } = await markWorn(
        ids,
        DEFAULT_OUTFIT_OPTIONS,
        today,
        null,
        db,
      )
      const entry = await db.calendar.get(today)
      await saveCalendarEntry(
        { ...entry!, note: 'Später ergänzt' },
        entry!.updatedAt,
        db,
      )
      await expect(undoWorn(undo, db)).rejects.toThrow(
        'Der Tag wurde inzwischen geändert',
      )
      expect((await db.calendar.get(today))?.note).toBe('Später ergänzt')
    })
  })

  it('lässt ein inzwischen bearbeitetes Stück in der Wäsche', async () => {
    await withDb(async (db) => {
      const today = localDay()
      await saveCalendarEntry(
        {
          day: shiftDay(today, -1)!,
          outfitId: await saveOutfit(ids, DEFAULT_OUTFIT_OPTIONS, db),
          status: 'worn',
          note: '',
        },
        null,
        db,
      )
      const { undo } = await markWorn(
        ids,
        DEFAULT_OUTFIT_OPTIONS,
        today,
        null,
        db,
      )
      expect(undo.washed.map((item) => item.id)).toEqual(['hemd'])
      await db.garments.update('hemd', {
        notes: 'Fleck',
        updatedAt: new Date(Date.now() + 5000).toISOString(),
      })
      await undoWorn(undo, db)
      expect((await db.garments.get('hemd'))?.inLaundry).toBe(true)
    })
  })
})
