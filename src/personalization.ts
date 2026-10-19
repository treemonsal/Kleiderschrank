import type { Garment } from './model'
import { COLORS } from './model'
import {
  OCCASIONS,
  type Occasion,
  type OutfitFeedback,
  type Preferences,
  type StyleProfile,
} from './outfit-model'

export const DEFAULT_STYLE_PROFILE: StyleProfile = {
  version: 1,
  status: 'completed',
  colorMood: 'balanced',
  variety: 'balanced',
  usualOccasion: 'Alltag',
  avoidColors: [],
}
export const FEEDBACK_REASONS = {
  combination: 'Die Kombination gefällt mir nicht',
  colors: 'Die Farben passen für mich nicht zusammen',
  style: 'Das ist nicht mein Stil',
  occasion: 'Das passt nicht zum Anlass',
} as const

export function parseStyleProfile(value: unknown): StyleProfile {
  const p = value as StyleProfile | null
  if (
    !p ||
    p.version !== 1 ||
    !['completed', 'skipped'].includes(p.status) ||
    !['neutral', 'balanced', 'colorful'].includes(p.colorMood) ||
    !['familiar', 'balanced', 'explore'].includes(p.variety) ||
    !OCCASIONS.includes(p.usualOccasion) ||
    !Array.isArray(p.avoidColors) ||
    p.avoidColors.length > COLORS.length ||
    p.avoidColors.some((c) => !COLORS.some((color) => color.name === c))
  )
    throw new Error('Das Stilprofil ist ungültig.')
  return {
    version: 1,
    status: p.status,
    colorMood: p.colorMood,
    variety: p.variety,
    usualOccasion: p.usualOccasion,
    avoidColors: [...new Set(p.avoidColors)],
  }
}

// Legacy feedback remains global. New feedback belongs to the occasion that was rated.
export function feedbackForOccasion(
  feedback: OutfitFeedback[],
  occasion: Occasion,
) {
  return feedback.filter(
    (entry) => !entry.occasion || entry.occasion === occasion,
  )
}

const neutral = new Set(['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun'])
const bounded = (value: number) => Math.max(-1, Math.min(1, value))
const colorPair = (a: string, b: string) => JSON.stringify([a, b].sort())
export function createPersonalizationScorer(
  items: Garment[],
  preferences: Preferences,
  feedback: OutfitFeedback[],
) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const colors = new Map<string, number>(),
    styles = new Map<string, number>(),
    pairs = new Map<string, number>()
  let observations = 0
  const add = (map: Map<string, number>, key: string, value: number) =>
    map.set(key, (map.get(key) ?? 0) + value)
  // Each outfit has one bounded vote. Repeated clicks replace a rating in the database.
  // Rejections only generalize the feature explicitly named by the person.
  for (const entry of feedback) {
    const pieces = entry.garmentIds.flatMap((id) => byId.get(id) ?? [])
    if (
      pieces.length !== entry.garmentIds.length ||
      entry.reason === 'occasion'
    )
      continue
    const positive = entry.verdict === 'liked'
    if (!positive && entry.reason !== 'colors' && entry.reason !== 'style')
      continue
    observations++
    const sign = positive ? 1 : -1
    if (positive)
      for (const piece of pieces) {
        if (piece.color)
          add(colors, `${piece.category}:${piece.color}`, 1 / pieces.length)
      }
    if (positive || entry.reason === 'style') {
      const unique = [...new Set(pieces.flatMap((piece) => piece.styles))]
      for (const style of unique)
        add(styles, style, sign / Math.max(1, unique.length))
    }
    if (positive || entry.reason === 'colors') {
      const unique = [
        ...new Set(pieces.map((piece) => piece.color).filter(Boolean)),
      ]
      const keys = []
      for (let i = 0; i < unique.length; i++)
        for (let j = i + 1; j < unique.length; j++)
          keys.push(colorPair(unique[i], unique[j]))
      for (const key of keys) add(pairs, key, sign / Math.max(1, keys.length))
    }
  }
  const profile =
    preferences.styleProfile?.status === 'completed'
      ? preferences.styleProfile
      : undefined
  const itemScore = (item: Garment) => {
    const learnedColor = bounded(
      (colors.get(`${item.category}:${item.color}`) ?? 0) / 2,
    )
    const learnedStyle = item.styles.length
      ? item.styles.reduce(
          (sum, style) => sum + bounded((styles.get(style) ?? 0) / 2),
          0,
        ) / item.styles.length
      : 0
    return (
      learnedColor +
      learnedStyle +
      (profile?.avoidColors.includes(item.color) ? -4 : 0)
    )
  }
  const lookScore = (pieces: Garment[]) => {
    const unique = [
      ...new Set(pieces.map((piece) => piece.color).filter(Boolean)),
    ]
    const accents = unique.filter((color) => !neutral.has(color)).length
    let score =
      profile?.colorMood === 'neutral'
        ? accents <= 1
          ? 1.5
          : -1.5
        : profile?.colorMood === 'colorful'
          ? accents >= 2
            ? 2
            : 0
          : 0
    let sum = 0,
      count = 0
    for (let i = 0; i < unique.length; i++)
      for (let j = i + 1; j < unique.length; j++) {
        sum += bounded((pairs.get(colorPair(unique[i], unique[j])) ?? 0) / 2)
        count++
      }
    score += count ? (sum / count) * 2 : 0
    return score
  }
  // Readable, bounded summaries also accompany a deliberately started online comparison.
  const strongest = (map: Map<string, number>) =>
    [...map.entries()]
      .filter(([, value]) => Math.abs(value) >= 0.25)
      .sort(
        (a, b) => Math.abs(b[1]) - Math.abs(a[1]) || a[0].localeCompare(b[0]),
      )
      .slice(0, 6)
      .map(([feature, value]) => ({
        feature,
        preference: value > 0 ? 'prefer' : 'avoid',
        strength: Math.round(bounded(value / 2) * 100) / 100,
      }))
  return {
    itemScore,
    lookScore,
    observations,
    summary: {
      observations,
      styles: strongest(styles),
      colorPairs: strongest(pairs),
    },
  }
}
