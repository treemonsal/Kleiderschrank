import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { dueForWash, wearsSinceWash } from '../src/laundry'
import { localDay, shiftDay, type CalendarEntry } from '../src/calendar'
import { recordWornOutfit } from '../src/calendar-db'
import { setLaundry, updatePreferences, WardrobeDatabase } from '../src/db'
import type { Garment } from '../src/model'
import { DEFAULT_OUTFIT_OPTIONS, type SavedOutfit } from '../src/outfit-model'

const outfits = [{ id: 'o', garmentIds: ['shirt', 'shoe'] }] as SavedOutfit[]
const worn = (day: string, status = 'worn') =>
  ({ id: day, day, outfitId: 'o', status }) as CalendarEntry

describe('Wäsche nach Tragetagen', () => {
  it('zählt nur bestätigte Tage nach der letzten Wäsche', () => {
    const entries = [
      worn('2026-10-01'),
      worn('2026-10-05'),
      worn('2026-10-06', 'planned'),
      worn('2026-10-07'),
    ]
    expect(wearsSinceWash({ id: 'shirt' }, entries, outfits)).toBe(3)
    expect(
      wearsSinceWash(
        { id: 'shirt', washedAt: '2026-10-05T18:00:00' },
        entries,
        outfits,
      ),
    ).toBe(1)
  })

  it('legt Oberteile nach zwei, Schuhe nie automatisch in die Wäsche', () => {
    expect(dueForWash({ category: 'Oberteile' }, 2)).toBe(true)
    expect(dueForWash({ category: 'Oberteile' }, 1)).toBe(false)
    expect(dueForWash({ category: 'Hosen' }, 3)).toBe(false)
    expect(dueForWash({ category: 'Schuhe' }, 50)).toBe(false)
    expect(dueForWash({ category: 'Oberteile', inLaundry: true }, 5)).toBe(
      false,
    )
  })
})

describe('Automatische Wäsche beim Tragen', () => {
  const stamp = '2026-01-01T00:00:00.000Z'
  const piece = (id: string, category: Garment['category']): Garment => ({
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
  })
  const pieces = [
    piece('hemd', 'Oberteile'),
    piece('hose', 'Hosen'),
    piece('schuh', 'Schuhe'),
  ]
  const ids = pieces.map((item) => item.id)

  it('legt das Oberteil nach dem zweiten Tragetag in die Wäsche und startet nach dem Waschen neu', async () => {
    const db = new WardrobeDatabase(`laundry-${crypto.randomUUID()}`)
    try {
      await db.garments.bulkPut(pieces)
      const today = localDay()
      const yesterday = shiftDay(today, -1)!
      await recordWornOutfit(ids, DEFAULT_OUTFIT_OPTIONS, yesterday, null, db)
      expect(
        await recordWornOutfit(ids, DEFAULT_OUTFIT_OPTIONS, today, null, db),
      ).toEqual(['hemd'])
      expect((await db.garments.get('hemd'))?.inLaundry).toBe(true)
      expect((await db.garments.get('hose'))?.inLaundry).toBeFalsy()
      expect((await db.garments.get('schuh'))?.inLaundry).toBeFalsy()
      await setLaundry('hemd', false, db)
      const clean = await db.garments.get('hemd')
      expect(clean?.washedAt).toBeTruthy()
      expect(
        wearsSinceWash(
          clean!,
          await db.calendar.toArray(),
          await db.outfits.toArray(),
        ),
      ).toBe(0)
    } finally {
      db.close()
      await Dexie.delete(db.name)
    }
  })

  it('respektiert die ausgeschaltete Einstellung und lässt vergangene Tage unverändert', async () => {
    const db = new WardrobeDatabase(`laundry-off-${crypto.randomUUID()}`)
    try {
      await db.garments.bulkPut(pieces)
      const today = localDay()
      await recordWornOutfit(
        ids,
        DEFAULT_OUTFIT_OPTIONS,
        shiftDay(today, -2)!,
        null,
        db,
      )
      expect(
        await recordWornOutfit(
          ids,
          DEFAULT_OUTFIT_OPTIONS,
          shiftDay(today, -1)!,
          null,
          db,
        ),
      ).toEqual([])
      await updatePreferences({ autoLaundry: false }, db)
      expect(
        await recordWornOutfit(ids, DEFAULT_OUTFIT_OPTIONS, today, null, db),
      ).toEqual([])
      expect((await db.garments.get('hemd'))?.inLaundry).toBeFalsy()
    } finally {
      db.close()
      await Dexie.delete(db.name)
    }
  })
})
