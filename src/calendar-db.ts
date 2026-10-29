import { db, saveOutfit } from './db'
import {
  isDay,
  localDay,
  MAX_CALENDAR_ENTRIES,
  type CalendarEntry,
} from './calendar'
import { UserFacingError } from './constraints'
import { isCompleteOutfit, OCCASIONS, type OutfitOptions } from './outfit-model'
import type { Garment } from './model'
import { dueForWash, wearsSinceWash } from './laundry'

export async function saveCalendarEntry(
  draft: Pick<CalendarEntry, 'day' | 'outfitId' | 'status' | 'note'> &
    Partial<Pick<CalendarEntry, 'occasion'>>,
  expectedUpdatedAt: string | null = null,
  database = db,
): Promise<void> {
  if (
    !isDay(draft.day) ||
    !['planned', 'worn'].includes(draft.status) ||
    draft.note.length > 200 ||
    (draft.occasion !== undefined && !OCCASIONS.includes(draft.occasion))
  )
    throw new UserFacingError(
      'Bitte prüfe Tag, Status und Notiz (höchstens 200 Zeichen).',
    )
  if (draft.status === 'worn' && draft.day > localDay())
    throw new UserFacingError(
      'Ein zukünftiger Look kann noch nicht als getragen markiert werden.',
    )
  await database.transaction(
    'rw',
    database.calendar,
    database.outfits,
    database.garments,
    async () => {
      const current = await database.calendar.get(draft.day)
      if ((current?.updatedAt ?? null) !== expectedUpdatedAt)
        throw new UserFacingError(
          'Der Tag wurde inzwischen geändert. Öffne ihn erneut, damit nichts überschrieben wird.',
        )
      const outfit = await database.outfits.get(draft.outfitId)
      if (!outfit)
        throw new UserFacingError(
          'Dieses Outfit ist nicht mehr vorhanden. Bitte wähle einen gespeicherten Look.',
        )
      const pieces = await database.garments.bulkGet(outfit.garmentIds)
      if (
        pieces.some((item) => !item) ||
        !isCompleteOutfit(pieces as Garment[])
      )
        throw new UserFacingError(
          'Dieser Look ist nicht mehr vollständig. Bitte prüfe seine Kleidungsstücke.',
        )
      if (!current && (await database.calendar.count()) >= MAX_CALENDAR_ENTRIES)
        throw new UserFacingError(
          'Dein Journal unterstützt bis zu 3000 Tage. Entferne zuerst einen älteren Eintrag.',
        )
      const now = new Date(
        Math.max(Date.now(), Date.parse(current?.updatedAt ?? '') + 1 || 0),
      ).toISOString()
      const wornColors =
        draft.status === 'worn'
          ? current?.status === 'worn' && current.outfitId === draft.outfitId
            ? current.wornColors
            : pieces.map((item) => item!.color)
          : undefined
      // Without a stated occasion the day keeps its own only for the same look.
      const occasion =
        draft.occasion ??
        (current?.outfitId === draft.outfitId ? current.occasion : undefined)
      await database.calendar.put({
        day: draft.day,
        outfitId: draft.outfitId,
        status: draft.status,
        ...(occasion ? { occasion } : {}),
        ...(wornColors ? { wornColors } : {}),
        id: draft.day,
        note: draft.note.trim(),
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      })
    },
  )
}
export async function deleteOutfit(id: string, database = db): Promise<void> {
  await database.transaction(
    'rw',
    database.outfits,
    database.calendar,
    async () => {
      await database.calendar.where('outfitId').equals(id).delete()
      await database.outfits.delete(id)
    },
  )
}
export async function deleteCalendarEntry(
  day: string,
  expectedUpdatedAt: string,
  database = db,
): Promise<void> {
  await database.transaction('rw', database.calendar, async () => {
    const entry = await database.calendar.get(day)
    if (entry && entry.updatedAt !== expectedUpdatedAt)
      throw new UserFacingError(
        'Der Tag wurde inzwischen geändert. Öffne ihn erneut, bevor du ihn entfernst.',
      )
    await database.calendar.delete(day)
  })
}

/** What „Heute getragen“ changed, so the same session can undo it. */
export interface WornUndo {
  day: string
  previous?: CalendarEntry
  entryUpdatedAt: string
  createdOutfitId?: string
  washed: { id: string; updatedAt: string }[]
}

/**
 * Confirms a worn day. For today, pieces that reached their usual wear count
 * move to the laundry (unless disabled); their names are returned.
 */
export async function recordWornOutfit(
  ids: string[],
  options: OutfitOptions,
  day: string,
  expectedUpdatedAt: string | null = null,
  database = db,
): Promise<string[]> {
  return (await markWorn(ids, options, day, expectedUpdatedAt, database)).washed
}

export async function markWorn(
  ids: string[],
  options: OutfitOptions,
  day: string,
  expectedUpdatedAt: string | null = null,
  database = db,
): Promise<{ washed: string[]; undo: WornUndo }> {
  return database.transaction(
    'rw',
    [
      database.garments,
      database.outfits,
      database.calendar,
      database.preferences,
    ],
    async () => {
      const known = new Set(
        (await database.outfits.toCollection().primaryKeys()) as string[],
      )
      const outfitId = await saveOutfit(ids, options, database)
      const current = await database.calendar.get(day)
      await saveCalendarEntry(
        {
          day,
          outfitId,
          status: 'worn',
          note: current?.note ?? '',
          occasion: options.occasion,
        },
        expectedUpdatedAt,
        database,
      )
      const undo: WornUndo = {
        day,
        ...(current ? { previous: current } : {}),
        entryUpdatedAt: (await database.calendar.get(day))!.updatedAt,
        ...(known.has(outfitId) ? {} : { createdOutfitId: outfitId }),
        washed: [],
      }
      const preferences = await database.preferences.get('personal')
      if (day !== localDay() || preferences?.autoLaundry === false)
        return { washed: [], undo }
      const [entries, outfits, pieces] = await Promise.all([
        database.calendar.toArray(),
        database.outfits.toArray(),
        database.garments.bulkGet(ids),
      ])
      const washed: string[] = []
      for (const piece of pieces) {
        if (
          !piece ||
          !dueForWash(piece, wearsSinceWash(piece, entries, outfits))
        )
          continue
        const updatedAt = new Date(
          Math.max(Date.now(), Date.parse(piece.updatedAt) + 1),
        ).toISOString()
        await database.garments.update(piece.id, { inLaundry: true, updatedAt })
        washed.push(piece.name)
        undo.washed.push({ id: piece.id, updatedAt })
      }
      return { washed, undo }
    },
  )
}

/**
 * Reverts „Heute getragen“: restores the previous day entry, takes back the
 * pieces it moved to the laundry and removes a look it created on the way.
 * Anything changed since then is left alone.
 */
export async function undoWorn(undo: WornUndo, database = db): Promise<void> {
  await database.transaction(
    'rw',
    [database.garments, database.outfits, database.calendar],
    async () => {
      const entry = await database.calendar.get(undo.day)
      if (entry?.updatedAt !== undo.entryUpdatedAt)
        throw new UserFacingError(
          'Der Tag wurde inzwischen geändert. Prüfe ihn im Journal.',
        )
      if (undo.previous) await database.calendar.put(undo.previous)
      else await database.calendar.delete(undo.day)
      for (const { id, updatedAt } of undo.washed) {
        const piece = await database.garments.get(id)
        if (piece?.inLaundry && piece.updatedAt === updatedAt)
          await database.garments.update(id, {
            inLaundry: false,
            updatedAt: new Date(
              Math.max(Date.now(), Date.parse(updatedAt) + 1),
            ).toISOString(),
          })
      }
      const created = undo.createdOutfitId
        ? await database.outfits.get(undo.createdOutfitId)
        : undefined
      if (
        created &&
        created.updatedAt === created.createdAt &&
        !created.favorite &&
        !(await database.calendar
          .filter((item) => item.outfitId === created.id)
          .count())
      )
        await database.outfits.delete(created.id)
    },
  )
}
