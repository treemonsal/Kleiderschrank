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
export interface Garment {
  id: string
  name: string
  category: Category
  color: string
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
