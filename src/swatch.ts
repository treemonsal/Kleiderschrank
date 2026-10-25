import { COLORS, type Category } from './model'

// Pieces without a photo are shown as cloth swatches in their recorded
// colour. The weave is only a hint per category, not a recorded fabric.
const WEAVE: Record<Category, string> = {
  Oberteile:
    'repeating-linear-gradient(90deg, rgb(0 0 0 / 0.06) 0 2px, rgb(255 255 255 / 0.05) 2px 5px)',
  Hosen:
    'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.09) 0 1px, transparent 1px 4px)',
  Kleider:
    'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.045) 0 1px, transparent 1px 3px)',
  Jacken:
    'repeating-linear-gradient(0deg, rgb(0 0 0 / 0.05) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(255 255 255 / 0.06) 0 1px, transparent 1px 3px)',
  Schuhe: 'linear-gradient(140deg, rgb(255 255 255 / 0.13), rgb(0 0 0 / 0.16))',
  Accessoires:
    'linear-gradient(140deg, rgb(255 255 255 / 0.1), rgb(0 0 0 / 0.12))',
}
const UNKNOWN = '#d7d3d3'

export function colorHex(color?: string): string {
  return COLORS.find((item) => item.name === color)?.hex ?? UNKNOWN
}

/** CSS background for a cloth swatch of the given piece. */
export function swatch(item: { color?: string; category: Category }): string {
  return `${WEAVE[item.category]}, ${colorHex(item.color)}`
}

/** Relative strip widths so a look reads top to bottom like a figure. */
export const BAND_WEIGHT: Record<Category, number> = {
  Jacken: 1.25,
  Kleider: 1.6,
  Oberteile: 1.1,
  Hosen: 1.1,
  Schuhe: 0.6,
  Accessoires: 0.45,
}
const ORDER: Category[] = [
  'Jacken',
  'Kleider',
  'Oberteile',
  'Hosen',
  'Schuhe',
  'Accessoires',
]
export function figureOrder<T extends { category: Category }>(pieces: T[]) {
  return [...pieces].sort(
    (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category),
  )
}
