import type { Garment, Season } from './model'
import type { Occasion } from './outfit-model'
import type { WeatherDay } from './weather'
import { FORMALITY } from './color-harmony'

/**
 * Further transparent styling rules on recorded data only: dress code per
 * occasion, the current season, colours picked up from a pattern and pairs
 * that were really worn together. Shades, fabrics and fit stay unknown.
 */

const NEUTRALS = new Set(['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun'])

/**
 * Accepted dress-code range per occasion on the FORMALITY scale (−2 … 2).
 * Everyday wear allows almost anything, office and evening are stricter, so
 * explicit personal style preferences are not overruled in daily looks.
 */
export const OCCASION_RANGE: Record<Occasion, [number, number]> = {
  Büro: [0.75, 2],
  Abend: [1, 2],
  Alltag: [-2, 2],
  Freizeit: [-2, 1],
}

/**
 * Dress code read from the name when no style is recorded: a football
 * jersey or track pants are sporty whatever the user forgot to tick, a
 * blazer or a shirt is smart. Only clear words count; the rest stays open.
 */
const NAME_FORMALITY: [RegExp, number][] = [
  [
    /trikot|jersey|fussball|fußball|fan-?shirt|training|jogging|jogger|sweatpant|sporthose|laufhose|tank ?top|muscle|badehose|badeshort|bikini|flip ?flop|zehentrenner|crocs|badelatsch|laufschuh|running|turnschuh|leggings|radler/i,
    -2,
  ],
  [
    /hoodie|kapuzen|sweatshirt|cap\b|basecap|cargo|shorts\b|kurze hose|bermuda/i,
    -1,
  ],
  [
    /anzug|sakko|blazer|krawatte|fliege|abendkleid|pumps|oxford|derby|lederschuh|business|smoking/i,
    2,
  ],
  [
    /hemd|bluse|stoffhose|bügelfalte|loafer|mokassin|chelsea|rollkragen|cardigan|chino|polo/i,
    1,
  ],
]

function nameFormality(name: string): number | undefined {
  for (const [pattern, level] of NAME_FORMALITY)
    if (pattern.test(name)) return level
  return undefined
}

/** Dress code of a piece: its recorded styles, else clear words in its name. */
export function formality(
  item: Pick<Garment, 'styles'> & { name?: string },
): number | undefined {
  if (!item.styles.length)
    return item.name ? nameFormality(item.name) : undefined
  return (
    item.styles.reduce((sum, style) => sum + FORMALITY[style], 0) /
    item.styles.length
  )
}

/** Clearly sporty pieces stay out of office and evening outfits. */
export function tooCasualFor(
  item: Pick<Garment, 'styles'> & { name?: string },
  occasion: Occasion,
): boolean {
  const level = formality(item)
  return (
    (occasion === 'Büro' || occasion === 'Abend') &&
    level !== undefined &&
    level <= -1.5
  )
}

function outside(level: number, occasion: Occasion) {
  const [low, high] = OCCASION_RANGE[occasion]
  return level < low ? low - level : level > high ? level - high : 0
}

/** Piece level: pieces outside the occasion's dress code score lower. */
export function occasionItemScore(
  item: Pick<Garment, 'styles'> & { name?: string },
  occasion: Occasion,
): number {
  const level = formality(item)
  return level === undefined ? 0 : -outside(level, occasion) * 1.2
}

/** Look level: the whole outfit should meet the dress code on average. */
export function occasionLookScore(
  items: (Pick<Garment, 'styles'> & { name?: string })[],
  occasion: Occasion,
): { score: number; note?: string } {
  const levels = items.flatMap((item) => formality(item) ?? [])
  if (!levels.length) return { score: 0 }
  const mean = levels.reduce((sum, level) => sum + level, 0) / levels.length
  const strict = occasion === 'Büro' || occasion === 'Abend'
  const tooCasual =
    strict &&
    items.some(
      (item) =>
        (item.styles.length &&
          item.styles.every((style) => style === 'Sportlich')) ||
        tooCasualFor(item, occasion),
    )
  const gap = outside(mean, occasion)
  const score = -gap * 1.5 - (tooCasual ? 2 : 0)
  if (tooCasual)
    return {
      score,
      note: `Ein sportliches Stück ist für ${occasion} eher locker.`,
    }
  if (strict && !gap)
    return {
      score: score + 0.5,
      note: `Die erfassten Stile passen zum Anlass ${occasion}.`,
    }
  return { score }
}

/** Season of a day: from the forecast if there is one, else from the date. */
export function seasonFor(day: string, weather?: WeatherDay): Season {
  if (weather) {
    if (weather.max >= 22) return 'Sommer'
    if (weather.max <= 8) return 'Winter'
  }
  const month = Number(day.slice(5, 7))
  return month >= 3 && month <= 5
    ? 'Frühling'
    : month >= 6 && month <= 8
      ? 'Sommer'
      : month >= 9 && month <= 11
        ? 'Herbst'
        : 'Winter'
}

/** Pieces tagged for the season score higher; untagged pieces stay neutral. */
export function seasonScore(
  item: Pick<Garment, 'seasons'>,
  season: Season,
): number {
  if (!item.seasons.length || item.seasons.length === 4) return 0
  return item.seasons.includes(season) ? 1 : -1
}

/**
 * A plain piece that picks up a colour from a patterned one ties the look
 * together; two patterned pieces compete with each other.
 */
export function patternHarmony(
  items: Pick<Garment, 'color' | 'secondaryColors' | 'name'>[],
): { score: number; note?: string } {
  const patterned = items.filter((item) => item.secondaryColors?.length)
  let score = 0
  let note: string | undefined
  if (patterned.length >= 2) {
    score -= 1.5
    note =
      'Zwei gemusterte oder mehrfarbige Stücke konkurrieren; eines reicht meist.'
  }
  for (const piece of items.filter((item) => item.secondaryColors?.length)) {
    const echo = items.find(
      (other) =>
        other !== piece &&
        other.color &&
        !NEUTRALS.has(other.color) &&
        piece.secondaryColors!.includes(other.color),
    )
    if (echo) {
      score += 1
      note ??= `${echo.name} greift eine Farbe aus ${piece.name} auf.`
      break
    }
  }
  return { score, note }
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** How often pairs of pieces were confirmed worn together (last 180 days). */
export function wornTogether(looks: string[][]): Map<string, number> {
  const pairs = new Map<string, number>()
  for (const ids of looks)
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j])
        pairs.set(key, (pairs.get(key) ?? 0) + 1)
      }
  return pairs
}

/** Proven pairs count like a weak „gefällt mir“, capped per look. */
export function wornTogetherScore(
  items: Pick<Garment, 'id'>[],
  pairs: Map<string, number> | undefined,
): number {
  if (!pairs?.size) return 0
  let score = 0
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      score +=
        Math.min(2, pairs.get(pairKey(items[i].id, items[j].id)) ?? 0) * 0.3
  return Math.min(1.5, score)
}
