import { localDay, shiftDay, type CalendarEntry } from './calendar'
import type { Garment } from './model'
import type { SavedOutfit } from './outfit-model'
import { costPerWear, wearStats, type WearStats } from './wear-stats'

export interface RankedPiece {
  item: Garment
  value: number
}
export interface WardrobeInsights {
  count: number
  value: number
  priced: number
  wornLast30: number
  mostWorn: RankedPiece[]
  bestValue: RankedPiece[]
  neverWorn: Garment[]
  idle: Garment[]
  colors: { color: string; count: number }[]
  allrounders: RankedPiece[]
  loners: Garment[]
  hints: string[]
}

/**
 * Number of complete base looks (shoes plus dress, or top, bottom and shoes)
 * a piece can take part in. Layers and accessories fit every base.
 */
export function combinations(items: Garment[]): Map<string, number> {
  const count = (category: string) =>
    items.filter((item) => item.category === category).length
  const tops = count('Oberteile'),
    bottoms = count('Hosen'),
    dresses = count('Kleider'),
    shoes = count('Schuhe')
  const bases = (tops * bottoms + dresses) * shoes
  const result = new Map<string, number>()
  for (const item of items)
    result.set(
      item.id,
      item.category === 'Oberteile'
        ? bottoms * shoes
        : item.category === 'Hosen'
          ? tops * shoes
          : item.category === 'Kleider'
            ? shoes
            : item.category === 'Schuhe'
              ? tops * bottoms + dresses
              : bases,
    )
  return result
}

export function wardrobeInsights(
  items: Garment[],
  entries: CalendarEntry[],
  outfits: SavedOutfit[],
  today = localDay(),
): WardrobeInsights {
  const wear = wearStats(entries, outfits, today)
  const stats = (item: Garment): WearStats => wear.get(item.id) ?? { count: 0 }
  const monthAgo = shiftDay(today, -30) ?? today
  const idleSince = shiftDay(today, -90) ?? today
  const priced = items.filter((item) => item.price !== undefined)
  const combos = combinations(items)
  const colorCounts = new Map<string, number>()
  for (const item of items)
    if (item.color)
      colorCounts.set(item.color, (colorCounts.get(item.color) ?? 0) + 1)
  const byCategory = (category: string) =>
    items.filter((item) => item.category === category).length
  const tops = byCategory('Oberteile'),
    bottoms = byCategory('Hosen'),
    shoes = byCategory('Schuhe')
  const hints: string[] = []
  if (items.length && !shoes)
    hints.push('Ohne Schuhe entsteht kein vollständiger Look.')
  if (tops && bottoms && tops / bottoms > 3)
    hints.push(
      `Viele Oberteile, wenig Hosen: ${tops} zu ${bottoms}. Eine weitere Hose ergibt die meisten neuen Looks.`,
    )
  if (tops && bottoms && bottoms / tops > 2)
    hints.push(
      `Mehr Hosen als Oberteile: ${bottoms} zu ${tops}. Ein weiteres Oberteil bringt am meisten Abwechslung.`,
    )
  const neutral = ['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun']
  const colored = items.filter(
    (item) => item.color && !neutral.includes(item.color),
  ).length
  if (items.length >= 8 && colored === 0)
    hints.push('Alles neutral: Ein Farbakzent würde viele Looks auffrischen.')
  return {
    count: items.length,
    value: priced.reduce((sum, item) => sum + (item.price ?? 0), 0),
    priced: priced.length,
    wornLast30: entries.filter(
      (entry) =>
        entry.status === 'worn' && entry.day > monthAgo && entry.day <= today,
    ).length,
    mostWorn: items
      .filter((item) => stats(item).count > 0)
      .map((item) => ({ item, value: stats(item).count }))
      .sort(
        (a, b) => b.value - a.value || a.item.name.localeCompare(b.item.name),
      )
      .slice(0, 3),
    bestValue: priced
      .filter((item) => stats(item).count > 0)
      .map((item) => ({
        item,
        value: costPerWear(item.price, stats(item).count)!,
      }))
      .sort(
        (a, b) => a.value - b.value || a.item.name.localeCompare(b.item.name),
      )
      .slice(0, 3),
    neverWorn: items.filter((item) => !stats(item).count),
    idle: items.filter(
      (item) => stats(item).count > 0 && stats(item).lastWorn! <= idleSince,
    ),
    colors: [...colorCounts]
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count || a.color.localeCompare(b.color)),
    allrounders: items
      .filter((item) =>
        ['Oberteile', 'Hosen', 'Kleider', 'Schuhe'].includes(item.category),
      )
      .map((item) => ({ item, value: combos.get(item.id) ?? 0 }))
      .filter((entry) => entry.value > 0)
      .sort(
        (a, b) => b.value - a.value || a.item.name.localeCompare(b.item.name),
      )
      .slice(0, 3),
    loners: items.filter(
      (item) =>
        ['Oberteile', 'Hosen', 'Kleider', 'Schuhe'].includes(item.category) &&
        !combos.get(item.id),
    ),
    hints,
  }
}
