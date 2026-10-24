import { generateOutfits } from './generator'
import type { Garment } from './model'
import { CATEGORIES, type Category } from './model'
import type { OutfitFeedback, OutfitOptions, Preferences } from './outfit-model'
import type { WeatherDay } from './weather'

export interface PackingPlan {
  looks: string[][]
  pieces: Garment[]
}

/**
 * Plans one look per travel day and prefers looks that reuse already packed
 * pieces, so the suitcase stays small. Looks repeat only when nothing else fits.
 */
export function packingPlan(
  items: Garment[],
  options: OutfitOptions,
  preferences: Preferences,
  feedback: OutfitFeedback[],
  days: number,
  weather?: WeatherDay,
): PackingPlan {
  const looks: string[][] = []
  const packed = new Set<string>()
  const used = new Set<string>()
  for (let day = 0; day < Math.min(Math.max(days, 1), 14); day++) {
    const candidates = generateOutfits(
      items,
      options,
      preferences,
      feedback,
      day + 1,
      weather,
      undefined,
      undefined,
      used,
    )
    const fallback =
      candidates.length || !looks.length
        ? candidates
        : [
            {
              key: '',
              garmentIds: looks[day % looks.length],
              reasons: [],
              score: 0,
            },
          ]
    if (!fallback.length) break
    const best = fallback
      .map((look, index) => ({
        look,
        // Reusing packed pieces matters more than a slightly higher score.
        rank:
          look.garmentIds.filter((id) => packed.has(id)).length * 10 - index,
      }))
      .sort((a, b) => b.rank - a.rank)[0].look
    looks.push(best.garmentIds)
    if (best.key) used.add(best.key)
    for (const id of best.garmentIds) packed.add(id)
  }
  const order = (category: Category) => CATEGORIES.indexOf(category)
  return {
    looks,
    pieces: items
      .filter((item) => packed.has(item.id))
      .sort(
        (a, b) =>
          order(a.category) - order(b.category) ||
          a.name.localeCompare(b.name, 'de'),
      ),
  }
}
