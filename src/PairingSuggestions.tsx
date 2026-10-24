import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bookmark, Check, Shirt } from 'lucide-react'
import { db, saveOutfit, storageError } from './db'
import type { Garment } from './model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  outfitKey,
} from './outfit-model'
import { OutfitPieces } from './OutfitPieces'
import { outfitsWith } from './pairing'
import { ErrorMessage } from './ui'

/** "What goes with this?": up to three real looks built around one piece. */
export function PairingSuggestions({
  item,
  items,
  onOpen,
}: {
  item: Garment
  items: Garment[]
  onOpen: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const state = useLiveQuery(
    async () =>
      open
        ? {
            preferences:
              (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
            feedback: await db.feedback.toArray(),
            saved: new Set(
              (await db.outfits.toArray()).map((outfit) =>
                outfitKey(outfit.garmentIds),
              ),
            ),
          }
        : undefined,
    [open],
  )
  const looks = state
    ? outfitsWith(item.id, items, state.preferences, state.feedback)
    : []
  if (!open)
    return (
      <button className="button secondary full" onClick={() => setOpen(true)}>
        <Shirt size={17} /> Was passt dazu?
      </button>
    )
  return (
    <section className="pairings" aria-label="Was passt dazu?">
      <h4>Was passt dazu?</h4>
      {!state ? (
        <p role="status">Wird kombiniert …</p>
      ) : !looks.length ? (
        <p className="muted">
          Mit deinen verfügbaren Stücken entsteht noch kein vollständiger Look.
          Es fehlen Schuhe oder ein passendes Gegenstück.
        </p>
      ) : (
        looks.map((look, index) => {
          const saved = state.saved.has(outfitKey(look.garmentIds))
          return (
            <div className="pairing-look" key={look.key}>
              <p className="eyebrow">Look {index + 1}</p>
              <OutfitPieces
                ids={look.garmentIds}
                items={items.map((piece) =>
                  piece.id === item.id ? { ...piece, inLaundry: false } : piece,
                )}
                onOpen={onOpen}
              />
              <button
                className="button secondary"
                disabled={saved}
                onClick={async () => {
                  setError('')
                  try {
                    await saveOutfit(look.garmentIds, {
                      ...DEFAULT_OUTFIT_OPTIONS,
                      ...state.preferences.outfitOptions,
                      includeAccessory: look.garmentIds.some(
                        (id) =>
                          items.find((piece) => piece.id === id)?.category ===
                          'Accessoires',
                      ),
                    })
                  } catch (error) {
                    setError(storageError(error))
                  }
                }}
              >
                {saved ? <Check size={16} /> : <Bookmark size={16} />}
                {saved ? 'Gespeichert' : 'Look speichern'}
              </button>
            </div>
          )
        })
      )}
      {item.inLaundry && (
        <p className="micro-copy">
          Dieses Stück liegt in der Wäsche. Die Looks sind zum Vorplanen.
        </p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </section>
  )
}
