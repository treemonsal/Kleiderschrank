export const CATEGORIES = [
  'Oberteile',
  'Hosen',
  'Kleider',
  'Jacken',
  'Schuhe',
  'Accessoires',
] as const
export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'] as const
export const STYLES = [
  'Casual',
  'Minimalistisch',
  'Elegant',
  'Sportlich',
  'Streetwear',
  'Vintage',
] as const
export const COLORS = [
  { name: 'Schwarz', hex: '#29282a' },
  { name: 'Weiss', hex: '#faf9f6' },
  { name: 'Grau', hex: '#9a999b' },
  { name: 'Beige', hex: '#d6c4ac' },
  { name: 'Braun', hex: '#8c6550' },
  { name: 'Blau', hex: '#718ba8' },
  { name: 'Grün', hex: '#778a73' },
  { name: 'Rot', hex: '#b45d57' },
  { name: 'Rosa', hex: '#d5a7b5' },
  { name: 'Gelb', hex: '#dec17b' },
  { name: 'Violett', hex: '#a491b3' },
  { name: 'Bunt', hex: 'conic-gradient(#d5a7b5,#dec17b,#718ba8,#d5a7b5)' },
] as const
export type Category = (typeof CATEGORIES)[number]
export type Season = (typeof SEASONS)[number]
export type Style = (typeof STYLES)[number]
export type Warmth = 1 | 2 | 3
export interface Garment {
  id: string
  name: string
  category: Category
  color: string
  /** Further colours beside the main one, at most three. */
  secondaryColors?: string[]
  brand: string
  seasons: Season[]
  styles: Style[]
  notes: string
  favorite: boolean
  inLaundry?: boolean
  /** Purchase price in CHF, used for cost per wear. */
  price?: number
  /** Last time the piece was marked clean; wears after it count towards the next wash. */
  washedAt?: string
  /** How warm the piece is, if recorded: 1 leicht, 2 mittel, 3 warm. */
  warmth?: Warmth
  /**
   * Sorted out: no longer suggested or listed in the wardrobe, but kept so
   * worn days, looks and ratings stay complete.
   */
  archivedAt?: string
  photo?: Blob
  cutout?: Blob
  createdAt: string
  updatedAt: string
}
export type GarmentDraft = Omit<Garment, 'id' | 'createdAt' | 'updatedAt'>
export function filterGarments(
  items: Garment[],
  query: string,
  category: string,
  favorites: boolean,
): Garment[] {
  const search = query.trim().toLocaleLowerCase('de')
  return items.filter(
    (item) =>
      (category === 'Alle' || item.category === category) &&
      (!favorites || item.favorite) &&
      (!search ||
        [
          item.name,
          item.brand,
          item.color,
          item.category,
          ...item.styles,
          ...item.seasons,
        ]
          .join(' ')
          .toLocaleLowerCase('de')
          .includes(search)),
  )
}

export const MAX_SECONDARY_COLORS = 3
/** Valid, distinct further colours without the main colour. */
export function cleanSecondaryColors(
  colors: readonly string[] | undefined,
  main: string,
): string[] {
  return [...new Set(colors ?? [])]
    .filter(
      (color) => color !== main && COLORS.some((item) => item.name === color),
    )
    .slice(0, MAX_SECONDARY_COLORS)
}
