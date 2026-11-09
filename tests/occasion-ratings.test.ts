import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  saveOutfit,
  setOutfitFeedback,
  toggleOutfitLike,
  WardrobeDatabase,
} from '../src/db'
import { markWorn, saveCalendarEntry } from '../src/calendar-db'
import { chooseDailyOutfit } from '../src/daily-outfit'
import { generateOutfits } from '../src/generator'
import { createDatabaseBackup, parseFullBackup } from '../src/backup'
import { feedbackForOccasion, ratingFor } from '../src/personalization'
import { rekeyFeedback, syncWithDrive } from '../src/sync'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  feedbackKey,
  outfitKey,
  type OutfitFeedback,
} from '../src/outfit-model'
import type { Garment } from '../src/model'
import { localDay } from '../src/calendar'
import { FakeDrive } from './fixtures/fake-drive'

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
  piece('hose', 'Hosen', 'Grau'),
  piece('schuh', 'Schuhe', 'Schwarz'),
]
const ids = pieces.map((item) => item.id)

let open: WardrobeDatabase[] = []
async function fresh(name = `occasion-${crypto.randomUUID()}`) {
  const db = new WardrobeDatabase(name)
  open.push(db)
  await db.garments.bulkPut(pieces)
  return db
}
afterEach(async () => {
  vi.unstubAllGlobals()
  for (const db of open) {
    db.close()
    await Dexie.delete(db.name)
  }
  open = []
})

describe('Bewertungen gelten pro Anlass', () => {
  it('überschreiben sich zwischen Alltag und Büro nicht', async () => {
    const db = await fresh()
    await setOutfitFeedback(ids, 'liked', db, { occasion: 'Alltag' })
    await setOutfitFeedback(ids, 'rejected', db, {
      occasion: 'Büro',
      reason: 'occasion',
    })
    const all = await db.feedback.toArray()
    expect(all).toHaveLength(2)
    expect(ratingFor(all, ids, 'Alltag')?.verdict).toBe('liked')
    expect(ratingFor(all, ids, 'Büro')?.verdict).toBe('rejected')
    expect(ratingFor(all, ids, 'Abend')).toBeUndefined()
    // Taking back the Alltag like leaves the Büro verdict alone.
    expect(await toggleOutfitLike(ids, db, 'Alltag')).toBe(false)
    expect(
      (await db.feedback.toArray()).map((entry) => entry.occasion),
    ).toEqual(['Büro'])
  })

  it('eine ältere Bewertung ohne Anlass gilt überall, bis der Anlass eine eigene hat', async () => {
    const db = await fresh()
    await db.feedback.put({
      id: outfitKey(ids),
      garmentIds: ids,
      verdict: 'liked',
      updatedAt: stamp,
    })
    await setOutfitFeedback(ids, 'rejected', db, { occasion: 'Büro' })
    const all = await db.feedback.toArray()
    expect(ratingFor(all, ids, 'Büro')?.verdict).toBe('rejected')
    expect(ratingFor(all, ids, 'Alltag')?.verdict).toBe('liked')
    expect(feedbackForOccasion(all, 'Büro')).toHaveLength(1)
    // The like shown for Alltag can be taken back there.
    expect(await toggleOutfitLike(ids, db, 'Alltag')).toBe(false)
    expect(await db.feedback.get(outfitKey(ids))).toBeUndefined()
    expect(await db.feedback.get(feedbackKey(ids, 'Büro'))).toBeDefined()
  })
})

describe('Vorschläge respektieren Bewertungen pro Anlass', () => {
  it('schlägt einen fürs Büro abgelehnten Look dort nicht vor, im Alltag schon', async () => {
    const db = await fresh()
    await setOutfitFeedback(ids, 'rejected', db, { occasion: 'Büro' })
    const feedback = await db.feedback.toArray()
    const keys = (occasion: 'Alltag' | 'Büro') =>
      generateOutfits(
        pieces,
        { ...DEFAULT_OUTFIT_OPTIONS, occasion },
        DEFAULT_PREFERENCES,
        feedback,
      ).map((look) => outfitKey(look.garmentIds))
    expect(keys('Büro')).not.toContain(outfitKey(ids))
    expect(keys('Alltag')).toContain(outfitKey(ids))
  })
})

describe('Ein Tragetag behält seinen eigenen Anlass', () => {
  it('ein Büro-Tag mit einem als Alltag gespeicherten Look bleibt Büro', async () => {
    const db = await fresh()
    const day = localDay()
    const outfitId = await saveOutfit(ids, DEFAULT_OUTFIT_OPTIONS, db)
    expect((await db.outfits.get(outfitId))?.occasion).toBe('Alltag')
    await markWorn(
      ids,
      { ...DEFAULT_OUTFIT_OPTIONS, occasion: 'Büro' },
      day,
      null,
      db,
    )
    const entry = (await db.calendar.get(day))!
    expect(entry.outfitId).toBe(outfitId)
    expect(entry.occasion).toBe('Büro')
    const look = chooseDailyOutfit(
      pieces,
      DEFAULT_PREFERENCES,
      [],
      await db.outfits.toArray(),
      await db.calendar.toArray(),
      day,
    )
    expect(look?.options.occasion).toBe('Büro')
  })

  it('ein anderer Look im Plan nimmt den alten Anlass nicht mit', async () => {
    const db = await fresh()
    await db.garments.put(piece('jeans', 'Hosen', 'Blau'))
    const day = '2026-12-24'
    const first = await saveOutfit(ids, DEFAULT_OUTFIT_OPTIONS, db)
    await saveCalendarEntry(
      { day, outfitId: first, status: 'planned', note: '', occasion: 'Abend' },
      null,
      db,
    )
    let entry = (await db.calendar.get(day))!
    // Same look, only the note changes: the day stays Abend.
    await saveCalendarEntry(
      { day, outfitId: first, status: 'planned', note: 'Fest' },
      entry.updatedAt,
      db,
    )
    entry = (await db.calendar.get(day))!
    expect(entry.occasion).toBe('Abend')
    const second = await saveOutfit(
      ['hemd', 'jeans', 'schuh'],
      DEFAULT_OUTFIT_OPTIONS,
      db,
    )
    await saveCalendarEntry(
      { day, outfitId: second, status: 'planned', note: 'Fest' },
      entry.updatedAt,
      db,
    )
    expect((await db.calendar.get(day))?.occasion).toBeUndefined()
  })
})

describe('Bestehende Daten werden übernommen', () => {
  it('stellt Bewertungen mit Anlass beim Datenbank-Update auf den neuen Schlüssel um', async () => {
    const name = `occasion-migrate-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(6).stores({
      garments: 'id, category, updatedAt',
      outfits: 'id, updatedAt, *garmentIds',
      feedback: 'id, updatedAt, *garmentIds',
      preferences: 'id',
      calendar: 'id, day, outfitId, status, updatedAt',
      weather: 'id',
      chat: 'id, updatedAt',
      syncState: 'id',
    })
    await legacy.table('garments').bulkPut(pieces)
    await legacy.table('feedback').bulkPut([
      {
        id: outfitKey(ids),
        garmentIds: ids,
        verdict: 'rejected',
        occasion: 'Büro',
        updatedAt: stamp,
      },
      {
        id: outfitKey(['hemd', 'hose']),
        garmentIds: ['hemd', 'hose'],
        verdict: 'liked',
        updatedAt: stamp,
      },
    ])
    legacy.close()
    const db = new WardrobeDatabase(name)
    open.push(db)
    await db.open()
    expect(db.verno).toBe(7)
    expect(
      (await db.feedback.toArray()).map((entry) => entry.id).sort(),
    ).toEqual([feedbackKey(ids, 'Büro'), outfitKey(['hemd', 'hose'])].sort())
  })

  it('liest alte Sicherungen und gemischte Stände, aber keine doppelten Einträge', async () => {
    const db = await fresh()
    await setOutfitFeedback(ids, 'liked', db, { occasion: 'Alltag' })
    const file = JSON.parse(await createDatabaseBackup(db))
    const current = file.feedback[0] as OutfitFeedback
    expect(current.id).toBe(feedbackKey(ids, 'Alltag'))
    // A file from before 0.36: id without occasion.
    const old = { ...file, feedback: [{ ...current, id: outfitKey(ids) }] }
    expect(parseFullBackup(JSON.stringify(old)).feedback[0].id).toBe(
      feedbackKey(ids, 'Alltag'),
    )
    // Both forms of one rating: the newer one counts.
    const newer = {
      ...current,
      verdict: 'rejected',
      updatedAt: '2030-01-01T00:00:00.000Z',
    }
    const mixed = {
      ...file,
      feedback: [{ ...newer, id: outfitKey(ids) }, current],
    }
    const parsed = parseFullBackup(JSON.stringify(mixed)).feedback
    expect(parsed).toHaveLength(1)
    expect(parsed[0].verdict).toBe('rejected')
    // The very same id twice is still a broken file.
    const broken = { ...file, feedback: [current, current] }
    expect(() => parseFullBackup(JSON.stringify(broken))).toThrow(
      'keine gültige',
    )
  })

  it('der Abgleich behält Bewertungen pro Anlass und bringt sie aufs zweite Gerät', async () => {
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 1
        naturalHeight = 1
        onload: (() => void) | null = null
        set src(_: string) {
          queueMicrotask(() => this.onload?.())
        }
      },
    )
    const drive = new FakeDrive()
    const a = await fresh(),
      b = await fresh()
    await setOutfitFeedback(ids, 'liked', a, { occasion: 'Alltag' })
    await setOutfitFeedback(ids, 'rejected', a, { occasion: 'Büro' })
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    expect(await a.feedback.count()).toBe(2)
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    const copied = await b.feedback.toArray()
    expect(ratingFor(copied, ids, 'Alltag')?.verdict).toBe('liked')
    expect(ratingFor(copied, ids, 'Büro')?.verdict).toBe('rejected')
  })

  it('plant den Abgleich mit den neuen Schlüsseln und behält den neueren Eintrag', () => {
    const old = {
      id: outfitKey(ids),
      garmentIds: ids,
      verdict: 'liked',
      occasion: 'Alltag',
      updatedAt: stamp,
    }
    const newer = {
      ...old,
      id: feedbackKey(ids, 'Alltag'),
      verdict: 'rejected',
      updatedAt: '2030-01-01T00:00:00.000Z',
    }
    expect(rekeyFeedback([old, newer])).toEqual([newer])
    expect(rekeyFeedback('kaputt')).toBe('kaputt')
  })
})
