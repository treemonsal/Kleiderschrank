import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  saveOutfit,
  setArchived,
  setOutfitFeedback,
  WardrobeDatabase,
} from '../src/db'
import { markWorn } from '../src/calendar-db'
import { localDay } from '../src/calendar'
import { eligibleGarments, generateOutfits } from '../src/generator'
import { createDatabaseBackup, parseFullBackup } from '../src/backup'
import { shoppingPieces } from '../src/shopping-model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../src/outfit-model'
import type { Garment } from '../src/model'

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
  piece('hemd', 'Oberteile', 'Weiss'),
  piece('shirt', 'Oberteile', 'Blau'),
  piece('hose', 'Hosen', 'Grau'),
  piece('schuh', 'Schuhe', 'Schwarz'),
]
const ids = ['hemd', 'hose', 'schuh']

let open: WardrobeDatabase[] = []
async function fresh() {
  const db = new WardrobeDatabase(`archive-${crypto.randomUUID()}`)
  open.push(db)
  await db.garments.bulkPut(pieces)
  return db
}
afterEach(async () => {
  for (const db of open) {
    db.close()
    await Dexie.delete(db.name)
  }
  open = []
})

describe('Aussortieren statt löschen', () => {
  it('behält Tragetage, Looks und Bewertungen und nimmt das Stück aus Vorschlägen', async () => {
    const db = await fresh()
    const day = localDay()
    await markWorn(ids, DEFAULT_OUTFIT_OPTIONS, day, null, db)
    await setOutfitFeedback(ids, 'liked', db, { occasion: 'Alltag' })
    await setArchived('hemd', true, db)

    const hemd = (await db.garments.get('hemd'))!
    expect(hemd.archivedAt).toBeDefined()
    expect(await db.calendar.get(day)).toBeDefined()
    expect(await db.outfits.count()).toBe(1)
    expect(await db.feedback.count()).toBe(1)

    const items = await db.garments.toArray()
    expect(
      eligibleGarments(items, DEFAULT_OUTFIT_OPTIONS).map((item) => item.id),
    ).not.toContain('hemd')
    const looks = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
    )
    expect(looks.length).toBeGreaterThan(0)
    expect(looks.every((look) => !look.garmentIds.includes('hemd'))).toBe(true)
    expect(
      shoppingPieces({
        garments: items,
        preferences: DEFAULT_PREFERENCES,
        feedback: [],
        outfits: [],
        calendar: [],
      }).map((item) => item.id),
    ).not.toContain('hemd')
  })

  it('holt ein Stück zurück und entfernt es aus der Tagesauswahl, solange es aussortiert ist', async () => {
    const db = await fresh()
    await db.preferences.put({
      ...DEFAULT_PREFERENCES,
      dailySelection: {
        day: localDay(),
        garmentIds: ids,
        options: DEFAULT_OUTFIT_OPTIONS,
        updatedAt: stamp,
      },
      updatedAt: stamp,
    })
    await setArchived('hemd', true, db)
    expect(
      (await db.preferences.get('personal'))?.dailySelection,
    ).toBeUndefined()
    const first = (await db.garments.get('hemd'))!.archivedAt
    // Sorting out twice keeps the first date.
    await setArchived('hemd', true, db)
    expect((await db.garments.get('hemd'))!.archivedAt).toBe(first)
    await setArchived('hemd', false, db)
    const back = (await db.garments.get('hemd'))!
    expect(back.archivedAt).toBeUndefined()
    expect(
      eligibleGarments(await db.garments.toArray(), DEFAULT_OUTFIT_OPTIONS).map(
        (item) => item.id,
      ),
    ).toContain('hemd')
  })

  it('übernimmt den Zustand in Sicherungen und weist ungültige Daten ab', async () => {
    const db = await fresh()
    await saveOutfit(ids, DEFAULT_OUTFIT_OPTIONS, db)
    await setArchived('hemd', true, db)
    const json = await createDatabaseBackup(db)
    const parsed = parseFullBackup(json)
    expect(
      parsed.garments.find((item) => item.id === 'hemd')?.archivedAt,
    ).toBeDefined()
    expect(
      parsed.garments.find((item) => item.id === 'hose')?.archivedAt,
    ).toBeUndefined()
    const broken = JSON.parse(json)
    broken.garments[0].archivedAt = 'gestern'
    expect(() => parseFullBackup(JSON.stringify(broken))).toThrow()
  })

  it('meldet ein inzwischen gelöschtes Stück verständlich', async () => {
    const db = await fresh()
    await expect(setArchived('weg', true, db)).rejects.toThrow(
      'nicht mehr vorhanden',
    )
  })
})
