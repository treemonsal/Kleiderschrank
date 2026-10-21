import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { refinementFixture } from './fixtures/refinement'
import {
  refinementChoices,
  applyDailyRefinement,
} from '../src/daily-refinement'
import {
  colorfulness,
  refinementChanges,
  type OutfitRefinement,
} from '../src/refinement-model'
import { WardrobeDatabase, setOutfitFeedback, saveOutfit } from '../src/db'
import { saveCalendarEntry } from '../src/calendar-db'
import {
  createDatabaseBackup,
  importFullBackup,
  readBackupData,
  parseFullBackup,
} from '../src/backup'
import { createPersonalizationScorer } from '../src/personalization'
import { chooseDailyOutfit } from '../src/daily-outfit'
import { outfitKey } from '../src/outfit-model'

const databases: WardrobeDatabase[] = []
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})
async function setup() {
  const data = refinementFixture(),
    db = new WardrobeDatabase(`refinement-${crypto.randomUUID()}`)
  databases.push(db)
  await db.garments.bulkPut(data.garments)
  await db.preferences.put(data.preferences)
  return { data, db }
}
function request(
  data: ReturnType<typeof refinementFixture>,
  intent: OutfitRefinement['intent'] = 'warmer',
  lockedIds = ['shoes'],
): OutfitRefinement {
  return {
    intent,
    currentIds: data.preferences.dailySelection.garmentIds,
    lockedIds,
  }
}
function choices(
  data: ReturnType<typeof refinementFixture>,
  input = request(data),
) {
  return refinementChoices(
    data.garments,
    data.preferences.dailySelection.options,
    data.preferences,
    data.feedback,
    input,
    data.outfits,
    data.calendar,
    data.preferences.dailySelection.day,
  )
}
function applyInput(
  data: ReturnType<typeof refinementFixture>,
  input = request(data),
) {
  return {
    day: data.preferences.dailySelection.day,
    options: data.preferences.dailySelection.options,
    expectedPreferences: data.preferences.updatedAt,
    expectedEntry: null as string | null,
    expectedSelection: data.preferences.dailySelection.updatedAt,
    request: input,
    garmentIds: choices(data, input)[0].garmentIds,
    versions: data.garments.map((item) => ({
      id: item.id,
      updatedAt: item.updatedAt,
    })),
  }
}

describe('Tageslook gezielt verfeinern', () => {
  it('fügt für wärmer nur eine Jacke hinzu und hält alle gewünschten Teile fest', () => {
    const data = refinementFixture(),
      input = request(
        data,
        'warmer',
        data.preferences.dailySelection.garmentIds,
      )
    const result = choices(data, input)[0]
    expect(result.garmentIds).toEqual(
      expect.arrayContaining([...input.currentIds, 'jacket']),
    )
    expect(result.garmentIds).toHaveLength(4)
    expect(
      refinementChanges(
        data.garments.filter((item) => result.garmentIds.includes(item.id)),
        input,
      ),
    ).toBe(1)
  })
  it('sucht ruhigere Farben auch jenseits der ersten 18 Kandidaten, ohne Schuhe zu tauschen', () => {
    const data = refinementFixture()
    const top = data.garments[0]
    data.garments.push(
      ...Array.from({ length: 30 }, (_, index) => ({
        ...top,
        id: `loud-${index}`,
        favorite: true,
      })),
    )
    const result = choices(data, request(data, 'quieter'))[0]
    expect(result.garmentIds).toEqual(
      expect.arrayContaining(['top-beige', 'pants', 'shoes']),
    )
    expect(result.garmentIds).toHaveLength(3)
    expect(
      colorfulness(
        data.garments.filter((item) => result.garmentIds.includes(item.id)),
      ),
    ).toBe(0)
  })
  it('erfindet bei fehlenden Angaben, Wäsche oder unmöglichen Festlegungen keine Variante', () => {
    const data = refinementFixture()
    expect(choices(data, request(data, 'similar', ['missing']))).toEqual([])
    data.garments.find((item) => item.id === 'shoes')!.inLaundry = true
    expect(choices(data)).toEqual([])
    data.garments.find((item) => item.id === 'shoes')!.inLaundry = false
    data.garments.find((item) => item.id === 'top-red')!.color = ''
    expect(choices(data, request(data, 'quieter'))).toEqual([])
    data.garments = data.garments.filter((item) => item.id !== 'jacket')
    expect(choices(data)).toEqual([])
  })
  it('speichert erst nach Übernahme; Tagesauswahl bleibt nach Sicherung/Import erhalten', async () => {
    const { data, db } = await setup(),
      before = await readBackupData(db)
    const input = applyInput(data)
    expect(await readBackupData(db)).toEqual(before)
    await applyDailyRefinement(input, db)
    expect(
      (await db.preferences.get('personal'))?.dailySelection?.garmentIds,
    ).toEqual(expect.arrayContaining(input.garmentIds))
    expect(await db.feedback.count()).toBe(0)
    const destination = (await setup()).db
    await importFullBackup(
      parseFullBackup(await createDatabaseBackup(db)),
      'replace',
      destination,
    )
    expect(
      (await destination.preferences.get('personal'))?.dailySelection
        ?.garmentIds,
    ).toEqual(expect.arrayContaining(input.garmentIds))
  })
  it.each([
    'preferences',
    'laundry',
    'rejection',
    'worn',
    'selection',
    'day',
    'options',
  ] as const)('verwirft veraltete Vorschauen bei %s atomar', async (change) => {
    const { data, db } = await setup(),
      input = applyInput(data)
    const stamp = new Date(Date.now() + 1000).toISOString()
    if (change === 'day') input.day = '2020-01-01'
    if (change === 'options') {
      const outfitId = await saveOutfit(
        input.request.currentIds,
        data.preferences.dailySelection.options,
        db,
      )
      await saveCalendarEntry(
        { day: input.day, outfitId, status: 'planned', note: '' },
        null,
        db,
      )
      input.expectedEntry = (await db.calendar.get(input.day))!.updatedAt
      await db.outfits.update(outfitId, { occasion: 'Büro', updatedAt: stamp })
    }
    if (change === 'preferences')
      await db.preferences.update('personal', { updatedAt: stamp })
    if (change === 'selection')
      await db.preferences.update('personal', {
        dailySelection: {
          ...data.preferences.dailySelection,
          updatedAt: stamp,
        },
      })
    if (change === 'laundry')
      await db.garments.update('jacket', { inLaundry: true, updatedAt: stamp })
    if (change === 'rejection')
      await setOutfitFeedback(input.garmentIds, 'rejected', db)
    if (change === 'worn') {
      const outfitId = await saveOutfit(
        input.request.currentIds,
        data.preferences.dailySelection.options,
        db,
      )
      await saveCalendarEntry(
        { day: input.day, outfitId, status: 'worn', note: '' },
        null,
        db,
      )
    }
    const before = await readBackupData(db)
    await expect(applyDailyRefinement(input, db)).rejects.toThrow()
    expect(await readBackupData(db)).toEqual(before)
  })
  it('ändert nur den heutigen Plan, behält dessen Notiz und den alten gespeicherten Look', async () => {
    const { data, db } = await setup(),
      input = applyInput(data)
    const outfitId = await saveOutfit(
      input.request.currentIds,
      data.preferences.dailySelection.options,
      db,
    )
    await saveCalendarEntry(
      { day: input.day, outfitId, status: 'planned', note: 'Mein Termin' },
      null,
      db,
    )
    input.expectedEntry = (await db.calendar.get(input.day))!.updatedAt
    await applyDailyRefinement(input, db)
    const entry = (await db.calendar.get(input.day))!
    expect(entry.note).toBe('Mein Termin')
    expect(entry.outfitId).not.toBe(outfitId)
    expect((await db.outfits.get(outfitId))!.garmentIds).toEqual(
      input.request.currentIds,
    )
  })
})

describe('Optionales und gezieltes Outfitfeedback', () => {
  it('lernt aus zu auffällig nur weniger Farbakzente, keine Abneigung gegen einzelne Teile oder Stile', () => {
    const data = refinementFixture(),
      ids = data.preferences.dailySelection.garmentIds
    const personal = createPersonalizationScorer(
      data.garments,
      data.preferences,
      [
        {
          id: outfitKey(ids),
          garmentIds: ids,
          verdict: 'rejected',
          reason: 'bold',
          updatedAt: data.preferences.updatedAt,
        },
      ],
    )
    const original = data.garments.filter((item) => ids.includes(item.id))
    const quiet = data.garments.filter((item) =>
      ['top-beige', 'pants', 'shoes'].includes(item.id),
    )
    expect(personal.lookScore(quiet)).toBeGreaterThan(
      personal.lookScore(original),
    )
    expect(personal.summary.styles).toEqual([])
    expect(personal.summary.colorPairs).toEqual([])
    expect(personal.itemScore(data.garments[0])).toBe(0)
    expect(personal.summary.colorfulness?.preference).toBe('quieter')
  })
  it('sichert neue Gründe in Format 8 und importiert sie ohne Verlust', async () => {
    const { data, db } = await setup(),
      ids = data.preferences.dailySelection.garmentIds
    await setOutfitFeedback(ids, 'rejected', db, {
      reason: 'bold',
      occasion: 'Alltag',
    })
    const json = await createDatabaseBackup(db)
    expect(JSON.parse(json).version).toBe(8)
    expect(parseFullBackup(json).feedback[0].reason).toBe('bold')
    const destination = (await setup()).db
    await importFullBackup(parseFullBackup(json), 'replace', destination)
    expect((await destination.feedback.get(outfitKey(ids)))?.reason).toBe(
      'bold',
    )
    await setOutfitFeedback(ids, 'rejected', db)
    expect((await db.feedback.get(outfitKey(ids)))?.reason).toBeUndefined()
    const selected = chooseDailyOutfit(
      data.garments,
      data.preferences,
      await db.feedback.toArray(),
      [],
      [],
      data.preferences.dailySelection.day,
    )
    expect(outfitKey(selected.garmentIds)).not.toBe(outfitKey(ids))
  })
})
