import type { Garment, Season, Style } from './model'

export const OCCASIONS = ['Alltag', 'Büro', 'Abend', 'Freizeit'] as const
export type Occasion = (typeof OCCASIONS)[number]
export interface OutfitOptions {
  occasion: Occasion
  season: Season | 'Alle'
  style: Style | 'Alle'
  includeAccessory: boolean
}
export interface SavedOutfit {
  id: string
  name: string
  garmentIds: string[]
  occasion: Occasion
  season: Season | 'Alle'
  style: Style | 'Alle'
  favorite: boolean
  createdAt: string
  updatedAt: string
}
export interface OutfitFeedback {
  id: string
  garmentIds: string[]
  verdict: 'liked' | 'rejected'
  updatedAt: string
}
export interface Preferences {
  id: 'personal'
  styles: Style[]
  colors: string[]
  updatedAt: string
}
export const DEFAULT_PREFERENCES: Preferences = {
  id: 'personal',
  styles: [],
  colors: [],
  updatedAt: '1970-01-01T00:00:00.000Z',
}
export interface OutfitCandidate {
  key: string
  garmentIds: string[]
  reasons: string[]
  score: number
}
export function outfitKey(ids: string[]): string {
  return JSON.stringify([...ids].sort())
}
export function isCompleteOutfit(items: Garment[]): boolean {
  const count = (category: string) =>
    items.filter((item) => item.category === category).length
  return (
    items.length >= 2 &&
    items.length <= 5 &&
    new Set(items.map((item) => item.id)).size === items.length &&
    count('Schuhe') === 1 &&
    count('Jacken') <= 1 &&
    count('Accessoires') <= 1 &&
    ((count('Kleider') === 1 &&
      count('Oberteile') === 0 &&
      count('Hosen') === 0) ||
      (count('Kleider') === 0 &&
        count('Oberteile') === 1 &&
        count('Hosen') === 1))
  )
}
