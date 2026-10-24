import { localDay, type CalendarEntry } from './calendar'
import type { Category, Garment } from './model'
import type { SavedOutfit } from './outfit-model'

/** Typical wears before washing; null means the category is never washed automatically. */
export const WASH_AFTER: Record<Category, number | null> = {
  Oberteile: 2,
  Hosen: 4,
  Kleider: 2,
  Jacken: 12,
  Schuhe: null,
  Accessoires: null,
}

/** Confirmed wear days after the last wash (the wash day itself does not count). */
export function wearsSinceWash(
  garment: Pick<Garment, 'id' | 'washedAt'>,
  entries: CalendarEntry[],
  outfits: SavedOutfit[],
): number {
  const washedDay = garment.washedAt ? localDay(new Date(garment.washedAt)) : ''
  const byId = new Map(outfits.map((outfit) => [outfit.id, outfit]))
  return entries.filter(
    (entry) =>
      entry.status === 'worn' &&
      entry.day > washedDay &&
      !!byId.get(entry.outfitId)?.garmentIds.includes(garment.id),
  ).length
}

export function dueForWash(
  garment: Pick<Garment, 'category' | 'inLaundry'>,
  wears: number,
): boolean {
  const limit = WASH_AFTER[garment.category]
  return !garment.inLaundry && limit !== null && wears >= limit
}
