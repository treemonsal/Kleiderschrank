import { db, saveOutfit } from './db'
import {
  isDay,
  localDay,
  MAX_CALENDAR_ENTRIES,
  type CalendarEntry,
} from './calendar'
import { UserFacingError } from './constraints'
import { isCompleteOutfit, type OutfitOptions } from './outfit-model'
import type { Garment } from './model'

export async function saveCalendarEntry(
  draft: Pick<CalendarEntry, 'day' | 'outfitId' | 'status' | 'note'>,
  expectedUpdatedAt: string | null = null,
  database = db,
): Promise<void> {
  if (
    !isDay(draft.day) ||
    !['planned', 'worn'].includes(draft.status) ||
    draft.note.length > 200
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
          'Dein Kalender unterstützt bis zu 3000 Tage. Entferne zuerst einen älteren Eintrag.',
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
      await database.calendar.put({
        day: draft.day,
        outfitId: draft.outfitId,
        status: draft.status,
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

export async function recordWornOutfit(
  ids: string[],
  options: OutfitOptions,
  day: string,
  expectedUpdatedAt: string | null = null,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.garments,
    database.outfits,
    database.calendar,
    async () => {
      const outfitId = await saveOutfit(ids, options, database)
      const current = await database.calendar.get(day)
      await saveCalendarEntry(
        { day, outfitId, status: 'worn', note: current?.note ?? '' },
        expectedUpdatedAt,
        database,
      )
    },
  )
}
