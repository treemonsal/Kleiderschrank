import { COLORS, type Garment } from './model'
import type { SavedOutfit } from './outfit-model'
import type { CalendarEntry } from './calendar'
export function dayColors(
  entry: CalendarEntry | undefined,
  outfits: SavedOutfit[],
  items: Garment[],
  today: string,
) {
  if (!entry || entry.status !== 'worn' || entry.day > today) return []
  const values =
    entry.wornColors ??
    outfits
      .find((outfit) => outfit.id === entry.outfitId)
      ?.garmentIds.map(
        (id) => items.find((item) => item.id === id)?.color ?? '',
      ) ??
    []
  return [
    ...new Set(
      values.filter((color) => COLORS.some((item) => item.name === color)),
    ),
  ]
}
export function paletteGradient(colors: string[]): string | undefined {
  if (!colors.length) return undefined
  const stops = colors.flatMap((color, index) => {
    const tone = COLORS.find((item) => item.name === color)
    if (!tone) return []
    const values =
      tone.name === 'Bunt' ? ['#d5a7b5', '#dec17b', '#718ba8'] : [tone.hex]
    return values.map(
      (value, part) =>
        `${value} ${((index + part / values.length) / colors.length) * 100}% ${((index + (part + 1) / values.length) / colors.length) * 100}%`,
    )
  })
  return stops.length ? `conic-gradient(${stops.join(',')})` : undefined
}
