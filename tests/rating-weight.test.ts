import { describe, expect, it } from 'vitest'
import {
  createPersonalizationScorer,
  ratingWeight,
} from '../src/personalization'
import { createCompatibilityScorer } from '../src/outfit-compatibility'
import {
  DEFAULT_PREFERENCES,
  outfitKey,
  type OutfitFeedback,
} from '../src/outfit-model'
import type { Garment } from '../src/model'

const now = Date.parse('2026-10-29T12:00:00Z')
const daysAgo = (days: number) => new Date(now - days * 86400000).toISOString()
const piece = (id: string, category: Garment['category'], color: string) =>
  ({
    id,
    name: id,
    category,
    color,
    brand: '',
    seasons: [],
    styles: ['Casual'],
    notes: '',
    favorite: false,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
  }) as Garment
const items = [
  piece('blau', 'Oberteile', 'Blau'),
  piece('beige', 'Hosen', 'Beige'),
  piece('weiss', 'Schuhe', 'Weiss'),
]
const ids = items.map((item) => item.id)
const liked = (days: number): OutfitFeedback => ({
  id: outfitKey(ids),
  garmentIds: ids,
  verdict: 'liked',
  updatedAt: daysAgo(days),
})

describe('Ältere Bewertungen zählen etwas weniger', () => {
  it('zählt einen Monat voll und sinkt bis nach einem Jahr auf 0,8', () => {
    expect(ratingWeight(daysAgo(0), now)).toBe(1)
    expect(ratingWeight(daysAgo(30), now)).toBe(1)
    expect(ratingWeight(daysAgo(197.5), now)).toBeCloseTo(0.9, 2)
    expect(ratingWeight(daysAgo(365), now)).toBeCloseTo(0.8, 5)
    expect(ratingWeight(daysAgo(2000), now)).toBeCloseTo(0.8, 5)
    expect(ratingWeight('kein Datum', now)).toBe(1)
  })

  it('eine alte Bewertung wirkt in dieselbe Richtung, nur etwas schwächer', () => {
    const fresh = createPersonalizationScorer(
      items,
      DEFAULT_PREFERENCES,
      [liked(1)],
      now,
    )
    const old = createPersonalizationScorer(
      items,
      DEFAULT_PREFERENCES,
      [liked(500)],
      now,
    )
    const freshScore = fresh.itemScore(items[0])
    const oldScore = old.itemScore(items[0])
    expect(oldScore).toBeGreaterThan(0)
    expect(oldScore).toBeLessThan(freshScore)
    expect(oldScore / freshScore).toBeGreaterThanOrEqual(0.79)

    const freshPairs = createCompatibilityScorer([liked(1)], now)(items)
    const oldPairs = createCompatibilityScorer([liked(500)], now)(items)
    expect(oldPairs.familiar).toBe(true)
    expect(oldPairs.score).toBeLessThan(freshPairs.score)
  })
})
