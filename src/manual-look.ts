import type { Category, Garment } from './model'
import { isCompleteOutfit } from './outfit-model'
import { topLayer } from './layers'

/** One swipeable row of the "Selber zusammenstellen" board. */
export interface LookRow {
  id: 'jacket' | 'sweater' | 'top' | 'bottom' | 'shoes' | 'accessory'
  label: string
  /** Optional rows start with "Ohne". */
  optional: boolean
  items: Garment[]
}

const ROWS: {
  id: LookRow['id']
  label: string
  optional: boolean
  categories: Category[]
}[] = [
  { id: 'jacket', label: 'Jacke', optional: true, categories: ['Jacken'] },
  // Over the shirt; only pullovers (layers.ts), switched on like the jacket.
  {
    id: 'sweater',
    label: 'Pullover',
    optional: true,
    categories: ['Oberteile'],
  },
  {
    id: 'top',
    label: 'Oberteil',
    optional: false,
    categories: ['Oberteile', 'Kleider'],
  },
  { id: 'bottom', label: 'Hose', optional: false, categories: ['Hosen'] },
  { id: 'shoes', label: 'Schuhe', optional: false, categories: ['Schuhe'] },
  {
    id: 'accessory',
    label: 'Accessoire',
    optional: true,
    categories: ['Accessoires'],
  },
]

/**
 * Rows of real, wearable pieces: sorted-out pieces and pieces in the laundry
 * never appear, like in every other suggestion. Favourites come first.
 */
export function lookRows(items: Garment[]): LookRow[] {
  const usable = items.filter((item) => !item.archivedAt && !item.inLaundry)
  return ROWS.map(({ categories, ...row }) => ({
    ...row,
    items: usable
      .filter(
        (item) =>
          categories.includes(item.category) &&
          (row.id !== 'sweater' || topLayer(item) === 'mid'),
      )
      .sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) ||
          a.name.localeCompare(b.name, 'de') ||
          a.id.localeCompare(b.id),
      ),
  }))
}

/** Selected piece per row: an index into its items, -1 for "Ohne". */
export type LookChoice = Partial<Record<LookRow['id'], number>>

export function chosenPiece(
  row: LookRow,
  choice: LookChoice,
): Garment | undefined {
  const index = choice[row.id] ?? (row.optional ? -1 : 0)
  return index < 0 ? undefined : row.items[index]
}

/** A pullover over a pullover or a dress makes no sense: the row steps aside. */
export function sweaterFits(rows: LookRow[], choice: LookChoice): boolean {
  const top = rows.find((row) => row.id === 'top')
  const chosen = top && chosenPiece(top, choice)
  return !!chosen && topLayer(chosen) === 'base'
}

/** A dress replaces trousers, so the trousers row steps aside. */
export function wearsDress(rows: LookRow[], choice: LookChoice): boolean {
  const top = rows.find((row) => row.id === 'top')
  return !!top && chosenPiece(top, choice)?.category === 'Kleider'
}

/** The look as garment ids, or null while it is not a complete outfit. */
export function chosenLook(
  rows: LookRow[],
  choice: LookChoice,
): string[] | null {
  const dress = wearsDress(rows, choice)
  const sweater = sweaterFits(rows, choice)
  const pieces = rows
    .filter(
      (row) =>
        !(dress && row.id === 'bottom') && !(!sweater && row.id === 'sweater'),
    )
    .flatMap((row) => chosenPiece(row, choice) ?? [])
  return isCompleteOutfit(pieces) ? pieces.map((item) => item.id) : null
}

/** Rows a complete look still needs, named for the hint. */
export function missingRows(rows: LookRow[], choice: LookChoice): string[] {
  const dress = wearsDress(rows, choice)
  return rows
    .filter(
      (row) =>
        !row.optional && !row.items.length && !(dress && row.id === 'bottom'),
    )
    .map((row) => row.label)
}
