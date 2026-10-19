import type { Category } from './model'

/** Category drawings for missing photos; never presented as a user's garment. */
export function GarmentSketch({ category }: { category: Category }) {
  const outlines: Record<Category, string> = {
    Oberteile:
      'M35 22 22 29 12 47 26 55 32 44 32 83 68 83 68 44 74 55 88 47 78 29 65 22 Q50 33 35 22Z',
    Hosen:
      'M32 17 68 17 73 84 54 84 50 43 46 84 27 84Z M32 25 68 25 M50 25 50 40',
    Kleider:
      'M38 16 31 32 41 44 24 85 Q50 92 76 85 L59 44 69 32 62 16 56 16 Q50 29 44 16Z M41 44 59 44',
    Jacken:
      'M38 18 25 25 12 62 25 67 32 48 30 86 70 86 68 48 75 67 88 62 75 25 62 18 50 27Z M38 18 44 43 50 34 56 43 62 18 M50 34 50 86 M35 64 44 64 M56 64 65 64',
    Schuhe:
      'M22 39 Q29 49 40 43 L45 36 62 56 79 61 Q88 63 88 73 L14 73 14 62Z M14 73 14 79 88 79 88 73 M47 46 57 43 M53 53 63 50 M59 60 69 57',
    Accessoires:
      'M25 42 75 42 81 83 19 83Z M36 42 36 30 Q36 15 50 15 Q64 15 64 30 L64 42 M25 52 75 52 M46 48 54 48 54 58 46 58Z',
  }
  return (
    <svg
      className="garment-sketch"
      viewBox="0 0 100 100"
      fill="currentColor"
      fillOpacity="0.07"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={outlines[category]} />
    </svg>
  )
}
