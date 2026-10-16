import { localDay, type CalendarEntry } from './calendar'
import { outfitKey, type SavedOutfit } from './outfit-model'
export interface RecentWear {
  pieces: Map<string, number>
  combinations: Map<string, number>
}
export function recentWear(
  entries: CalendarEntry[],
  outfits: SavedOutfit[],
  day: string,
  today = localDay(),
): RecentWear {
  const result: RecentWear = { pieces: new Map(), combinations: new Map() }
  const cutoff = day < today ? day : today
  for (const entry of entries) {
    if (entry.status !== 'worn' || entry.day > cutoff) continue
    const outfit = outfits.find((item) => item.id === entry.outfitId)
    if (!outfit) continue
    const age = Math.round(
      (Date.parse(`${day}T12:00:00Z`) - Date.parse(`${entry.day}T12:00:00Z`)) /
        86400000,
    )
    if (age < 0 || age > 7) continue
    const key = outfitKey(outfit.garmentIds)
    result.combinations.set(
      key,
      Math.min(result.combinations.get(key) ?? Infinity, age),
    )
    for (const id of outfit.garmentIds)
      result.pieces.set(id, Math.min(result.pieces.get(id) ?? Infinity, age))
  }
  return result
}
export function recentPiecePenalty(id: string, history?: RecentWear) {
  const age = history?.pieces.get(id)
  return age === undefined ? 0 : (Math.max(0, 7 - age) / 7) * 3
}
export function recentCombinationPenalty(key: string, history?: RecentWear) {
  const age = history?.combinations.get(key)
  return age === undefined ? 0 : (Math.max(0, 8 - age) / 8) * 12
}
