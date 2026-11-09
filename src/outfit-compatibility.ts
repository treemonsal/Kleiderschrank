import type { Garment } from './model'
import type { OutfitFeedback } from './outfit-model'
import { colorHarmony, styleCoherence } from './color-harmony'
import { ratingWeight } from './personalization'
const neutral = new Set(['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun'])
const pairKey = (a: string, b: string) => JSON.stringify([a, b].sort())
// Bounded, explicit signals from liked combinations, never inferred from a skipped look.
export function createCompatibilityScorer(
  feedback: OutfitFeedback[],
  now = Date.now(),
) {
  // Each liked pair keeps the weight of its newest rating.
  const likedPairs = new Map<string, number>()
  for (const entry of feedback) {
    if (entry.verdict !== 'liked') continue
    const weight = ratingWeight(entry.updatedAt, now)
    for (let i = 0; i < entry.garmentIds.length; i++)
      for (let j = i + 1; j < entry.garmentIds.length; j++) {
        const key = pairKey(entry.garmentIds[i], entry.garmentIds[j])
        likedPairs.set(key, Math.max(likedPairs.get(key) ?? 0, weight))
      }
  }
  return (items: Garment[]) => {
    const known = items.filter((item) => item.color)
    const accents = new Set(
      known
        .filter((item) => !neutral.has(item.color))
        .map((item) => item.color),
    )
    const color = items.length
      ? ((accents.size <= 1 ? 3 : accents.size === 2 ? 1 : -2) * known.length) /
        items.length
      : 0
    let stylePairs = 0,
      sharedStyles = 0,
      liked = 0,
      pairs = 0
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i],
          b = items[j]
        pairs++
        liked += likedPairs.get(pairKey(a.id, b.id)) ?? 0
        if (a.styles.length && b.styles.length) {
          stylePairs++
          if (a.styles.some((style) => b.styles.includes(style))) sharedStyles++
        }
      }
    const style = stylePairs ? (sharedStyles / stylePairs) * 1.5 : 0
    const familiarity = pairs ? (liked / pairs) * 2 : 0
    const harmony = colorHarmony(known)
    const coherence = styleCoherence(items)
    return {
      score: color + style + familiarity + harmony.score + coherence.score,
      familiar: liked > 0,
      sharedStyle: sharedStyles > 0,
      colorNote: harmony.note,
      styleNote: coherence.note,
    }
  }
}
