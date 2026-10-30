import type { Garment } from './model'
import { isCompleteOutfit } from './outfit-model'
import { warmthProxy } from './warmth'

export const REFINEMENT_LABELS = {
  similar: 'Ähnlich, aber anders',
  warmer: 'Ähnlich, aber wärmer',
  quieter: 'Ruhiger kombinieren',
} as const
export interface OutfitRefinement {
  intent: keyof typeof REFINEMENT_LABELS
  currentIds: string[]
  lockedIds: string[]
}
const neutral = new Set(['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun'])
export function colorfulness(items: Garment[]) {
  if (items.some((item) => !item.color)) return undefined
  return [...new Set(items.map((item) => item.color))].reduce(
    (sum, color) => sum + (neutral.has(color) ? 0 : color === 'Bunt' ? 2 : 1),
    0,
  )
}
export function validRefinement(items: Garment[], request: OutfitRefinement) {
  const current = items.filter((item) => request.currentIds.includes(item.id))
  return (
    Object.hasOwn(REFINEMENT_LABELS, request.intent) &&
    new Set(request.currentIds).size === request.currentIds.length &&
    current.length === request.currentIds.length &&
    isCompleteOutfit(current) &&
    new Set(request.lockedIds).size === request.lockedIds.length &&
    request.lockedIds.every((id) => request.currentIds.includes(id))
  )
}
export function refinementChanges(items: Garment[], request: OutfitRefinement) {
  const ids = new Set(items.map((item) => item.id))
  return (
    request.currentIds.filter((id) => !ids.has(id)).length +
    items.filter((item) => !request.currentIds.includes(item.id)).length
  )
}
export function acceptsRefinement(
  original: Garment[],
  items: Garment[],
  request: OutfitRefinement,
) {
  if (
    !request.lockedIds.every((id) => items.some((item) => item.id === id)) ||
    !refinementChanges(items, request)
  )
    return false
  if (request.intent === 'warmer')
    return warmthProxy(items) > warmthProxy(original)
  if (request.intent === 'quieter') {
    const before = colorfulness(original),
      after = colorfulness(items)
    return before !== undefined && after !== undefined && after < before
  }
  return true
}
