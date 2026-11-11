import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { isAvatar } from '../src/avatar'
import { createDatabaseBackup, parseFullBackup } from '../src/backup'
import {
  addStarterPieces,
  saveOutfit,
  undoAddedGarment,
  updatePreferences,
  WardrobeDatabase,
} from '../src/db'
import { DEFAULT_OUTFIT_OPTIONS } from '../src/outfit-model'
import { restoreCalendarEntry } from '../src/calendar-db'
import type { GarmentDraft } from '../src/model'

const draft = (name: string, category: GarmentDraft['category']) => ({
  name,
  category,
  color: 'Schwarz',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
})
let open: WardrobeDatabase[] = []
function fresh() {
  const db = new WardrobeDatabase(`polish-${crypto.randomUUID()}`)
  open.push(db)
  return db
}
afterEach(async () => {
  for (const db of open) {
    db.close()
    await Dexie.delete(db.name)
  }
  open = []
})

async function backupWith(avatar: string) {
  const db = fresh()
  await updatePreferences({ avatar }, db)
  return createDatabaseBackup(db)
}

describe('Profilbild, Startstücke und Rückgängig', () => {
  it('nimmt nur ein kleines JPEG als Profilbild an', async () => {
    const ok = 'data:image/jpeg;base64,' + 'A'.repeat(200)
    expect(isAvatar(ok)).toBe(true)
    expect(isAvatar('data:image/png;base64,AAAA')).toBe(false)
    expect(isAvatar('https://example.com/ich.jpg')).toBe(false)
    expect(isAvatar('data:image/jpeg;base64,' + 'A'.repeat(300_000))).toBe(
      false,
    )
    const json = await backupWith(ok)
    expect(parseFullBackup(json).preferences?.avatar).toBe(ok)
    expect(() =>
      parseFullBackup(json.replace(ok, 'javascript:alert(1)')),
    ).toThrow()
  })

  it('legt angetippte Startstücke alle oder keines an', async () => {
    const db = fresh()
    const ids = await addStarterPieces(
      [draft('Jeans', 'Hosen'), draft('Sneaker', 'Schuhe')],
      db,
    )
    expect(ids).toHaveLength(2)
    expect(await db.garments.count()).toBe(2)
    expect((await db.garments.get(ids[0]))!.photo).toBeUndefined()
  })

  it('macht ein frisch hinzugefügtes Stück rückgängig, ein verwendetes nicht', async () => {
    const db = fresh()
    const [shirt, pants, shoes] = await addStarterPieces(
      [
        draft('Hemd', 'Oberteile'),
        draft('Hose', 'Hosen'),
        draft('Schuh', 'Schuhe'),
      ],
      db,
    )
    const [extra] = await addStarterPieces([draft('Gürtel', 'Accessoires')], db)
    await undoAddedGarment(extra, db)
    expect(await db.garments.get(extra)).toBeUndefined()
    await saveOutfit([shirt, pants, shoes], DEFAULT_OUTFIT_OPTIONS, db)
    await expect(undoAddedGarment(shirt, db)).rejects.toThrow('Outfit')
    expect(await db.garments.get(shirt)).toBeDefined()
  })
})

describe('Geplantes Outfit zurückholen', () => {
  it('stellt den Tag nur wieder her, solange er leer ist', async () => {
    const db = fresh()
    const [a, b, c] = await addStarterPieces(
      [
        draft('Hemd', 'Oberteile'),
        draft('Hose', 'Hosen'),
        draft('Schuh', 'Schuhe'),
      ],
      db,
    )
    const outfitId = await saveOutfit([a, b, c], DEFAULT_OUTFIT_OPTIONS, db)
    const entry = {
      id: '2026-12-24',
      day: '2026-12-24',
      outfitId,
      status: 'planned' as const,
      note: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    await restoreCalendarEntry(entry, db)
    expect(await db.calendar.get(entry.day)).toEqual(entry)
    await expect(restoreCalendarEntry(entry, db)).rejects.toThrow('inzwischen')
  })
})
