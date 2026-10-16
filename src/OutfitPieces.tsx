import { RefreshCw } from 'lucide-react'
import type { Garment } from './model'
import { GarmentPicture } from './ui'

export function OutfitPieces({
  ids,
  items,
  onOpen,
  onSwap,
}: {
  ids: string[]
  items: Garment[]
  onSwap?: (id: string) => void
  onOpen: (id: string) => void
}) {
  const pieces = ids.flatMap((id) => {
    const item = items.find((item) => item.id === id)
    return item ? [item] : []
  })
  return (
    <div className="outfit-pieces">
      {pieces.map((item) => (
        <div className="outfit-piece-slot" key={item.id}>
          <button
            className="outfit-piece"
            aria-label={`${item.name} öffnen`}
            onClick={() => onOpen(item.id)}
          >
            <GarmentPicture item={item} />
            <span>{item.name}</span>
            {item.inLaundry && (
              <span className="laundry-badge">In der Wäsche</span>
            )}
          </button>
          {onSwap && (
            <button
              className="piece-swap"
              data-motion="turn"
              aria-label={`${item.name} austauschen`}
              onClick={() => onSwap(item.id)}
            >
              <RefreshCw size={14} />
              Austauschen
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
