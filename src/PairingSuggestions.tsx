import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Garment } from './model'
import { DEFAULT_PREFERENCES } from './outfit-model'
import { outfitsWith } from './pairing'
import { GarmentPicture } from './ui'

/**
 * „Passt gut zu“: up to three real pieces taken from complete looks built
 * around this one. Nothing is shown when no complete look exists.
 */
export function PairingSuggestions({
  item,
  items,
  onOpen,
}: {
  item: Garment
  items: Garment[]
  onOpen: (id: string) => void
}) {
  const state = useLiveQuery(async () => ({
    preferences: (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
    feedback: await db.feedback.toArray(),
  }))
  if (!state) return null
  const ids = [
    ...new Set(
      outfitsWith(item.id, items, state.preferences, state.feedback).flatMap(
        (look) => look.garmentIds.filter((id) => id !== item.id),
      ),
    ),
  ].slice(0, 3)
  const pieces = ids.flatMap(
    (id) => items.find((piece) => piece.id === id) ?? [],
  )
  if (!pieces.length) return null
  return (
    <section className="detail-pairs" aria-label="Passt gut zu">
      <p>Passt gut zu</p>
      <div>
        {pieces.map((piece) => (
          <button
            key={piece.id}
            className="detail-pair"
            aria-label={`${piece.name} öffnen`}
            onClick={() => onOpen(piece.id)}
          >
            <GarmentPicture item={piece} />
            <span>{piece.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
