import { localDay, type CalendarEntry } from './calendar'
import type { SavedOutfit } from './outfit-model'

export interface WearStats {
  count: number
  lastWorn?: string
}

/** Confirmed wear days per piece; planned and future days never count. */
export function wearStats(
  entries: CalendarEntry[],
  outfits: SavedOutfit[],
  today = localDay(),
): Map<string, WearStats> {
  const stats = new Map<string, WearStats>()
  const byId = new Map(outfits.map((outfit) => [outfit.id, outfit]))
  for (const entry of entries) {
    if (entry.status !== 'worn' || entry.day > today) continue
    for (const id of new Set(byId.get(entry.outfitId)?.garmentIds ?? [])) {
      const current = stats.get(id) ?? { count: 0 }
      stats.set(id, {
        count: current.count + 1,
        lastWorn:
          !current.lastWorn || entry.day > current.lastWorn
            ? entry.day
            : current.lastWorn,
      })
    }
  }
  return stats
}

export function describeWear(stats: WearStats | undefined, today = localDay()) {
  if (!stats?.count) return 'Noch nie getragen'
  const days = Math.round(
    (Date.parse(`${today}T12:00:00Z`) -
      Date.parse(`${stats.lastWorn}T12:00:00Z`)) /
      86400000,
  )
  const last =
    days <= 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen`
  return `${stats.count}× getragen · zuletzt ${last}`
}

export const formatChf = (value: number) =>
  new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: value % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)

/** Price divided by confirmed wear days; undefined without a price. */
export function costPerWear(price: number | undefined, wears = 0) {
  if (price === undefined) return undefined
  return Math.round((price / Math.max(1, wears)) * 100) / 100
}
