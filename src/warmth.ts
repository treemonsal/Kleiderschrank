import type { Garment, Warmth } from './model'
import type { WeatherDay } from './weather'

/**
 * Optional warmth per piece (1 leicht, 2 mittel, 3 warm). It is what the
 * person (or the photo AI) recorded, not a material or insulation rating.
 * Pieces without it keep the old season-based guess.
 */
export const WARMTH_LABELS: Record<Warmth, string> = {
  1: 'Leicht',
  2: 'Mittel',
  3: 'Warm',
}
export function isWarmth(value: unknown): value is Warmth {
  return value === 1 || value === 2 || value === 3
}

const DRESSED = ['Oberteile', 'Hosen', 'Kleider', 'Jacken']

/** The warmth that suits a day, from its felt mean temperature. */
export function warmthFor(weather: WeatherDay, offset = 0): Warmth {
  const felt = (weather.min + weather.max) / 2 + offset
  return felt <= 8 ? 3 : felt <= 17 ? 2 : 1
}

/**
 * Piece-level fit to the forecast: a recorded warmth close to what the day
 * needs scores up, far off scores down. Unknown warmth stays neutral.
 */
export function warmthFit(
  item: Pick<Garment, 'warmth' | 'category'>,
  weather: WeatherDay | undefined,
  offset = 0,
): number {
  if (!weather || !item.warmth || !DRESSED.includes(item.category)) return 0
  const gap = Math.abs(item.warmth - warmthFor(weather, offset))
  return gap === 0 ? 0.8 : gap === 1 ? 0 : -1.2
}

// A deliberately coarse proxy, not a material/insulation or safety assessment.
export function warmthProxy(
  items: Pick<Garment, 'category' | 'seasons' | 'warmth'>[],
) {
  return items.reduce((sum, item) => {
    if (item.category === 'Jacken')
      // A thin jacket adds less than a thick one; unknown counts as before.
      return sum + (item.warmth ? 2 + item.warmth : 4)
    if (!['Oberteile', 'Hosen', 'Kleider'].includes(item.category)) return sum
    if (item.warmth) return sum + (item.warmth - 2) * 1.5
    return (
      sum +
      (item.seasons.includes('Winter')
        ? 1
        : item.seasons.length === 1 && item.seasons[0] === 'Sommer'
          ? -0.5
          : 0)
    )
  }, 0)
}
