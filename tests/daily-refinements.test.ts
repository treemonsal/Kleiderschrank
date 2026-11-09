import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  WardrobeDatabase,
  setLaundry,
  deleteGarment,
  saveGarment,
} from '../src/db'
import { chooseDailyOutfit } from '../src/daily-outfit'
import { generateOutfits, eligibleGarments } from '../src/generator'
import { recentWear } from '../src/wear-history'
import { swapDailyPiece, replacementChoices } from '../src/outfit-customization'
import {
  BACKUP_INTERVAL,
  backupReminderDue,
  backupRevision,
  updateBackupReminder,
} from '../src/backup-reminder'
import {
  createDatabaseBackup,
  createDatabaseBackupExport,
  parseFullBackup,
  importFullBackup,
  readBackupData,
} from '../src/backup'
import { localDay, shiftDay, type CalendarEntry } from '../src/calendar'
import { saveCalendarEntry } from '../src/calendar-db'
import {
  DEFAULT_OUTFIT_OPTIONS as options,
  DEFAULT_PREFERENCES as preferences,
  outfitKey,
  type SavedOutfit,
} from '../src/outfit-model'
import type { Garment } from '../src/model'
const stamp = '2026-01-01T00:00:00.000Z'
const today = localDay()
const pieces: Garment[] = (['Oberteile', 'Hosen', 'Schuhe'] as const).map(
  (category, i) => ({
    id: `piece-${i}`,
    name: category,
    category,
    color: 'Weiss',
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: stamp,
    updatedAt: stamp,
  }),
)
const alternative: Garment = {
  ...pieces[0],
  id: 'alternative',
  name: 'Alternative',
}
const ids = pieces.map((p) => p.id)
const look: SavedOutfit = {
  id: 'old-look',
  name: 'Original',
  garmentIds: ids,
  ...options,
  favorite: true,
  createdAt: stamp,
  updatedAt: stamp,
}
const entry = (
  day: string,
  status: CalendarEntry['status'] = 'worn',
): CalendarEntry => ({
  id: day,
  day,
  outfitId: look.id,
  status,
  note: 'Termin',
  createdAt: stamp,
  updatedAt: stamp,
})
const databases: WardrobeDatabase[] = []
afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})
async function database() {
  const db = new WardrobeDatabase(`refinements-${crypto.randomUUID()}`)
  databases.push(db)
  await db.garments.bulkPut([...pieces, alternative])
  return db
}
const swap = (extra: Partial<Parameters<typeof swapDailyPiece>[0]> = {}) => ({
  day: today,
  ids,
  targetId: ids[0],
  replacementId: alternative.id,
  options,
  expectedEntry: null,
  expectedSelection: null,
  ...extra,
})

describe('Abwechslung und Wäsche', () => {
  it('bevorzugt eine Alternative zu gestern, liefert bei kleinem Bestand trotzdem einen vollständigen Look', () => {
    const history = recentWear([entry(shiftDay(today, -1)!)], [look], today)
    const result = generateOutfits(
      [...pieces, alternative],
      options,
      preferences,
      [],
      0,
      undefined,
      new Map(),
      history,
    )
    expect(result[0].garmentIds).toContain(alternative.id)
    expect(result[0].garmentIds).not.toContain(pieces[0].id)
    expect(
      generateOutfits(
        pieces,
        options,
        preferences,
        [],
        0,
        undefined,
        new Map(),
        history,
      )[0].garmentIds,
    ).toEqual(ids)
  })
  it('zählt nur bestätigte vergangene Tage und berechnet Altersabstände über die Zeitumstellung korrekt', () => {
    const history = recentWear(
      [
        entry('2026-10-24'),
        entry('2026-10-25', 'planned'),
        entry('2026-10-27'),
        entry('2026-10-01'),
      ],
      [look],
      '2026-10-26',
      '2026-10-26',
    )
    expect(history.pieces.get(ids[0])).toBe(2)
    expect(history.combinations.size).toBe(1)
    expect(
      recentWear([entry('2026-10-27')], [look], '2026-10-28', '2026-10-26')
        .pieces.size,
    ).toBe(0)
  })
  it('schliesst schmutzige Stücke und Alternativen aus automatischen Vorschlägen aus', () => {
    const items = [...pieces, { ...alternative, inLaundry: true }]
    expect(eligibleGarments(items, options).map((p) => p.id)).not.toContain(
      alternative.id,
    )
    expect(
      replacementChoices(items, ids, ids[0], options, preferences, []),
    ).toEqual([])
    expect(
      chooseDailyOutfit(
        pieces.map((p) => ({ ...p, inLaundry: p.category === 'Schuhe' })),
        preferences,
        [],
        [],
        [],
        today,
      ).missing,
    ).toContain('Wäsche')
  })
  it('erhält Historie und Fotos, invalidiert die Tagesauswahl und macht saubere Teile wieder verfügbar', async () => {
    const db = await database()
    const photo = new Blob(['original'], { type: 'image/png' })
    await db.garments.update(alternative.id, { photo, cutout: photo })
    await swapDailyPiece(swap(), db)
    await db.outfits.put(look)
    await saveCalendarEntry(
      { day: today, outfitId: look.id, status: 'worn', note: 'Termin' },
      null,
      db,
    )
    const before = await db.calendar.get(today)
    await setLaundry(alternative.id, true, db)
    expect(
      (await db.preferences.get('personal'))?.dailySelection,
    ).toBeUndefined()
    const stored = await db.garments.get(alternative.id)
    expect(await stored?.photo?.text()).toBe('original')
    expect(await stored?.cutout?.text()).toBe('original')
    expect(await db.calendar.get(today)).toEqual(before)
    await setLaundry(alternative.id, false, db)
    expect(
      eligibleGarments(await db.garments.toArray(), options).map((p) => p.id),
    ).toContain(alternative.id)
  })
})

describe('Einzelnes Teil tauschen', () => {
  it('ändert nur ein Teil und stellt die Auswahl nach Datenbankneustart und Sicherungsimport wieder her', async () => {
    const db = await database()
    await swapDailyPiece(swap(), db)
    const changed = [alternative.id, ...ids.slice(1)]
    expect(
      (await db.preferences.get('personal'))?.dailySelection?.garmentIds,
    ).toEqual(changed)
    expect(await db.outfits.count()).toBe(0)
    db.close()
    await db.open()
    expect(
      chooseDailyOutfit(
        await db.garments.toArray(),
        (await db.preferences.get('personal'))!,
        [],
        [],
        [],
        today,
      ).garmentIds,
    ).toEqual(changed)
    const data = parseFullBackup(await createDatabaseBackup(db))
    const restored = await database()
    await importFullBackup(data, 'replace', restored)
    expect(
      (await restored.preferences.get('personal'))?.dailySelection,
    ).toEqual(data.preferences?.dailySelection)
    await deleteGarment(alternative.id, restored)
    expect(
      (await restored.preferences.get('personal'))?.dailySelection,
    ).toBeUndefined()
  })
  it('tauscht in einem Plan nur den heutigen Verweis, behält Notiz und andere Kalendertage', async () => {
    const db = await database()
    await db.outfits.put(look)
    const planned = entry(today, 'planned'),
      tomorrow = entry(shiftDay(today, 1)!, 'planned')
    await db.calendar.bulkPut([planned, tomorrow])
    await swapDailyPiece(swap({ expectedEntry: stamp }), db)
    const day = (await db.calendar.get(today))!
    expect(day.note).toBe('Termin')
    expect(day.status).toBe('planned')
    expect(day.outfitId).not.toBe(look.id)
    expect(await db.outfits.get(look.id)).toEqual(look)
    expect(await db.calendar.get(tomorrow.id)).toEqual(tomorrow)
    expect((await db.outfits.get(day.outfitId))?.garmentIds).toEqual([
      alternative.id,
      ...ids.slice(1),
    ])
  })
  it('weist konkurrierende Änderungen, getragene Tage und vergangene Tage ohne Teiländerung ab', async () => {
    const db = await database()
    await swapDailyPiece(swap(), db)
    const stored = await db.preferences.get('personal')
    await expect(swapDailyPiece(swap(), db)).rejects.toThrow(
      'inzwischen geändert',
    )
    expect(await db.preferences.get('personal')).toEqual(stored)
    await expect(
      swapDailyPiece(swap({ day: shiftDay(today, -1)! }), db),
    ).rejects.toThrow('heutigen')
    await db.outfits.put(look)
    await db.calendar.put(entry(today))
    await expect(
      swapDailyPiece(swap({ expectedEntry: stamp }), db),
    ).rejects.toThrow('inzwischen geändert')
    expect(await db.outfits.count()).toBe(1)
  })
  it('weist inzwischen schmutzige, entfernte und abgelehnte Alternativen atomar ab', async () => {
    const db = await database()
    await setLaundry(alternative.id, true, db)
    await expect(swapDailyPiece(swap(), db)).rejects.toThrow(
      'nicht mehr verfügbar',
    )
    await setLaundry(alternative.id, false, db)
    const changed = [alternative.id, ...ids.slice(1)]
    await db.feedback.put({
      id: outfitKey(changed),
      garmentIds: changed,
      verdict: 'rejected',
      updatedAt: stamp,
    })
    await expect(swapDailyPiece(swap(), db)).rejects.toThrow(
      'nicht mehr verfügbar',
    )
    await db.feedback.clear()
    await db.garments.delete(ids[1])
    await expect(swapDailyPiece(swap(), db)).rejects.toThrow('Stück fehlt')
    expect(await db.preferences.count()).toBe(0)
    expect(await db.outfits.count()).toBe(0)
  })
  it('rollt einen neu gespeicherten Look bei einem Schreibfehler im Kalender zurück', async () => {
    const db = await database()
    await db.outfits.put(look)
    await db.calendar.put(entry(today, 'planned'))
    db.calendar.hook('updating', () => {
      throw new Error('Speicherfehler')
    })
    await expect(
      swapDailyPiece(swap({ expectedEntry: stamp }), db),
    ).rejects.toThrow('Speicherfehler')
    expect(await db.outfits.count()).toBe(1)
    expect((await db.calendar.get(today))?.outfitId).toBe(look.id)
    expect(await db.preferences.count()).toBe(0)
  })
  it('invalidiert einen angepassten Tageslook auch beim Wäsche-Häkchen im Editor', async () => {
    const db = await database()
    await swapDailyPiece(swap(), db)
    const current = (await db.garments.get(alternative.id))!
    await saveGarment({ ...current, inLaundry: true }, current, db)
    expect(
      (await db.preferences.get('personal'))?.dailySelection,
    ).toBeUndefined()
  })
  it('ignoriert eine gespeicherte Tagesauswahl sobald ihre Kombination abgelehnt wurde', () => {
    const changed = [alternative.id, ...ids.slice(1)]
    const result = chooseDailyOutfit(
      [...pieces, alternative],
      {
        ...preferences,
        dailySelection: {
          day: today,
          garmentIds: changed,
          options,
          updatedAt: stamp,
        },
      },
      [
        {
          id: outfitKey(changed),
          garmentIds: changed,
          verdict: 'rejected',
          updatedAt: stamp,
        },
      ],
      [],
      [],
      today,
    )
    expect(result.garmentIds).not.toEqual(changed)
  })
})

describe('Unaufdringliche Sicherungserinnerung', () => {
  it('erscheint erst nach einer Woche bei neuen Daten, berücksichtigt Pause und Abschalten', () => {
    const now = Date.parse(stamp) + BACKUP_INTERVAL
    const state = { firstSeenAt: stamp }
    expect(backupReminderDue(state, 'new', true, now - 1)).toBe(false)
    expect(backupReminderDue(state, 'new', true, now)).toBe(true)
    expect(
      backupReminderDue(
        { ...state, lastExportedRevision: 'new' },
        'new',
        true,
        now,
      ),
    ).toBe(false)
    expect(
      backupReminderDue(
        { ...state, snoozedUntil: new Date(now + 1).toISOString() },
        'new',
        true,
        now,
      ),
    ).toBe(false)
    expect(
      backupReminderDue({ ...state, disabled: true }, 'new', true, now),
    ).toBe(false)
    expect(backupReminderDue(state, 'new', false, now)).toBe(false)
    expect(backupReminderDue(undefined, 'new', true, now)).toBe(false)
  })
  it('behandelt Erinnerungseinstellungen und Zeitstempel ohne Inhaltsänderung nicht als neue Daten', async () => {
    const db = await database()
    const before = backupRevision(await readBackupData(db))
    await updateBackupReminder({ firstSeenAt: stamp, disabled: true }, db)
    expect(backupRevision(await readBackupData(db))).toBe(before)
    await updateBackupReminder({ disabled: false, snoozedUntil: stamp }, db)
    expect(backupRevision(await readBackupData(db))).toBe(before)
    await setLaundry(ids[0], true, db)
    expect(backupRevision(await readBackupData(db))).not.toBe(before)
  })
  it('ignoriert routinemässige Wetteraktualisierung, erkennt aber einen anderen gespeicherten Ort', async () => {
    const db = await database()
    const weather = {
      id: 'local' as const,
      location: { name: 'Zürich', latitude: 47.38, longitude: 8.54 },
      report: {
        fetchedAt: stamp,
        timezone: 'Europe/Zurich',
        days: [{ day: today, min: 5, max: 9, rain: 10, code: 3 }],
      },
      updatedAt: stamp,
    }
    await db.weather.put(weather)
    const before = backupRevision(await readBackupData(db))
    await db.weather.put({
      ...weather,
      report: {
        ...weather.report,
        fetchedAt: new Date().toISOString(),
        days: [{ ...weather.report.days[0], max: 12 }],
      },
      updatedAt: new Date().toISOString(),
    })
    expect(backupRevision(await readBackupData(db))).toBe(before)
    await db.weather.update('local', {
      location: { ...weather.location, name: 'Bern' },
    })
    expect(backupRevision(await readBackupData(db))).not.toBe(before)
  })
  it('stellt Wäsche und Erinnerungszustand auch ohne jemals geänderte Stilvorlieben wieder her', async () => {
    const db = await database()
    await setLaundry(alternative.id, true, db)
    const exported = await createDatabaseBackupExport(db)
    const data = parseFullBackup(exported.json)
    const restored = await database()
    await importFullBackup(data, 'replace', restored)
    expect((await restored.garments.get(alternative.id))?.inLaundry).toBe(true)
    expect(
      (await restored.preferences.get('personal'))?.backupReminder
        ?.lastExportedRevision,
    ).toBe(exported.revision)
    expect(backupRevision(await readBackupData(restored))).toBe(
      exported.revision,
    )
  })
  it('führt neuere Erinnerungseinstellungen unabhängig von Stilvorlieben zusammen', async () => {
    const db = await database()
    const june = '2026-06-01T00:00:00.000Z',
      october = '2026-10-01T00:00:00.000Z',
      december = '2026-12-01T00:00:00.000Z'
    await db.preferences.put({
      ...preferences,
      styles: ['Elegant'],
      updatedAt: june,
      backupReminder: { firstSeenAt: stamp, updatedAt: june },
    })
    const data = await readBackupData(db)
    await importFullBackup(
      {
        ...data,
        preferences: {
          ...preferences,
          updatedAt: stamp,
          backupReminder: {
            firstSeenAt: stamp,
            disabled: true,
            updatedAt: october,
          },
        },
      },
      'merge',
      db,
    )
    expect((await db.preferences.get('personal'))?.styles).toEqual(['Elegant'])
    expect(
      (await db.preferences.get('personal'))?.backupReminder?.disabled,
    ).toBe(true)
    await importFullBackup(
      {
        ...data,
        preferences: {
          ...preferences,
          styles: ['Minimalistisch'],
          updatedAt: december,
        },
      },
      'merge',
      db,
    )
    expect((await db.preferences.get('personal'))?.styles).toEqual([
      'Minimalistisch',
    ])
    expect(
      (await db.preferences.get('personal'))?.backupReminder?.updatedAt,
    ).toBe(october)
  })
  it('erkennt Änderungen während eines Exports weiterhin als ungesichert', async () => {
    const db = await database()
    const exported = await createDatabaseBackupExport(db)
    await setLaundry(ids[0], true, db)
    await updateBackupReminder(
      {
        lastExportedAt: exported.exportedAt,
        lastExportedRevision: exported.revision,
      },
      db,
    )
    const data = await readBackupData(db)
    expect(backupRevision(data)).not.toBe(exported.revision)
    expect(
      backupReminderDue(
        data.preferences?.backupReminder,
        backupRevision(data),
        true,
        Date.parse(exported.exportedAt) + BACKUP_INTERVAL,
      ),
    ).toBe(true)
  })
  it.each([
    { inLaundry: 'true' },
    {
      preferences: {
        ...preferences,
        dailySelection: {
          day: today,
          garmentIds: ['missing'],
          options,
          updatedAt: stamp,
        },
      },
    },
    {
      preferences: {
        ...preferences,
        backupReminder: { firstSeenAt: stamp, disabled: 'false' },
      },
    },
  ])(
    'weist ungültige neue Felder vor dem Import zurück (%#)',
    async (patch) => {
      const db = await database()
      const data = JSON.parse(await createDatabaseBackup(db))
      if ('inLaundry' in patch) data.garments[0].inLaundry = patch.inLaundry
      else data.preferences = patch.preferences
      expect(() => parseFullBackup(JSON.stringify(data))).toThrow(
        'keine gültige',
      )
      expect(await db.garments.count()).toBe(4)
    },
  )
})
