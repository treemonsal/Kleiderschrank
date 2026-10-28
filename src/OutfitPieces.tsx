import { RefreshCw } from 'lucide-react'
import type { Category, Garment } from './model'
import { GarmentPicture } from './ui'
import { figureOrder } from './swatch'

const SINGULAR: Record<Category, string> = {
  Oberteile: 'Oberteil',
  Hosen: 'Hose',
  Kleider: 'Kleid',
  Jacken: 'Jacke',
  Schuhe: 'Schuhe',
  Accessoires: 'Accessoire',
}

export function OutfitPieces({
  ids,
  items,
  onOpen,
  onSwap,
  figure = false,
  changedIds = [],
  worn = false,
}: {
  ids: string[]
  items: Garment[]
  onSwap?: (id: string) => void
  onOpen: (id: string) => void
  /** Lay the look out as a numbered book plate (Abb. 1–n). */
  figure?: boolean
  /** Pieces a refinement preview would add; marked „neu“ on the plate. */
  changedIds?: string[]
  /** Worn looks hide laundry badges: the pieces went there afterwards. */
  worn?: boolean
}) {
  const found = ids.flatMap((id) => {
    const item = items.find((item) => item.id === id)
    return item ? [item] : []
  })
  if (figure) {
    const pieces = figureOrder(found)
    return (
      <figure className="figure-plate-wrap">
        <div className={`figure-plate pieces-${pieces.length}`}>
          {pieces.map((item, index) => (
            <div
              className={`figure-tile${changedIds.includes(item.id) ? ' is-new' : ''}${
                // An even count leaves the last piece alone in its row.
                pieces.length >= 4 &&
                pieces.length % 2 === 0 &&
                index === pieces.length - 1
                  ? ' is-wide'
                  : ''
              }`}
              key={item.id}
            >
              <button
                className="outfit-piece"
                aria-label={`${item.name} öffnen`}
                onClick={() => onOpen(item.id)}
              >
                <GarmentPicture item={item} />
                <span className="figure-caption">
                  <small>
                    Abb. {index + 1} · {SINGULAR[item.category]}
                  </small>
                  <span>{item.name}</span>
                </span>
                {item.inLaundry && !worn && (
                  <span className="laundry-badge">In der Wäsche</span>
                )}
                {changedIds.includes(item.id) && (
                  <span className="new-badge">neu</span>
                )}
              </button>
              {onSwap && !changedIds.length && (
                <button
                  className="piece-swap"
                  data-motion="turn"
                  aria-label={`${item.name} austauschen`}
                  onClick={() => onSwap(item.id)}
                >
                  <RefreshCw size={15} strokeWidth={1.6} />
                </button>
              )}
            </div>
          ))}
        </div>
        <figcaption>
          Abb. 1–{pieces.length}.{' '}
          {onSwap
            ? 'Antippen öffnet ein Teil, der Pfeil tauscht es.'
            : 'Aus dem Journal.'}
        </figcaption>
      </figure>
    )
  }
  const pieces = found
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
              <RefreshCw size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
