import type { Garment } from './model'
import { BAND_WEIGHT, figureOrder, swatch } from './swatch'

/** A saved or worn look as a strip of cloth colours, read like a palette. */
export function LookBands({
  ids,
  items,
  height = 72,
}: {
  ids: string[]
  items: Garment[]
  height?: number
}) {
  const pieces = figureOrder(
    ids.flatMap((id) => items.find((item) => item.id === id) ?? []),
  )
  if (!pieces.length) return null
  return (
    <div className="look-bands" style={{ height }} aria-hidden="true">
      {pieces.map((item) => (
        <span
          key={item.id}
          style={{ flex: BAND_WEIGHT[item.category], background: swatch(item) }}
        />
      ))}
    </div>
  )
}
