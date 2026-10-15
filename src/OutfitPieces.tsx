import type { Garment } from './model'
import { GarmentPicture } from './ui'

export function OutfitPieces({
  ids,
  items,
  onOpen,
}: {
  ids: string[]
  items: Garment[]
  onOpen: (id: string) => void
}) {
  const pieces = ids.flatMap((id) => {
    const item = items.find((item) => item.id === id)
    return item ? [item] : []
  })
  return (
    <div className="outfit-pieces">
      {pieces.map((item) => (
        <button
          className="outfit-piece"
          key={item.id}
          aria-label={`${item.name} öffnen`}
          onClick={() => onOpen(item.id)}
        >
          <GarmentPicture item={item} />
          <span>{item.name}</span>
        </button>
      ))}
    </div>
  )
}
