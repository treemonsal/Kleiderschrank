import type { Garment } from './model'
import { isCompleteOutfit } from './outfit-model'

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
// A deliberately coarse proxy, not a material/insulation or safety assessment.
export function warmthProxy(items: Garment[]) {
  return items.reduce((sum, item) => {
    if (item.category === 'Jacken') return sum + 4
    if (!['Oberteile', 'Hosen', 'Kleider'].includes(item.category)) return sum
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
