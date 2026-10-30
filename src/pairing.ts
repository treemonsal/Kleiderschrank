import { generateOutfits } from './generator'
import type { Garment } from './model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  isCompleteOutfit,
  type OutfitCandidate,
  type OutfitFeedback,
  type Preferences,
} from './outfit-model'

/**
 * Up to three complete looks that contain the given piece. The piece itself
 * may be in the laundry (planning ahead); all other pieces must be available.
 */
export function outfitsWith(
  id: string,
  items: Garment[],
  preferences: Preferences,
  feedback: OutfitFeedback[],
): OutfitCandidate[] {
  const piece = items.find((item) => item.id === id)
  if (!piece || piece.archivedAt) return []
  const anchor = { ...piece, inLaundry: false }
  const others = items.filter((item) => item.id !== id)
  const options = {
    ...DEFAULT_OUTFIT_OPTIONS,
    ...(preferences.outfitOptions?.occasion
      ? { occasion: preferences.outfitOptions.occasion }
      : {}),
  }
  const generate = (pool: Garment[], includeAccessory = false) =>
    generateOutfits(
      pool,
      { ...options, includeAccessory },
      preferences,
      feedback,
    )
  if (piece.category === 'Jacken' || piece.category === 'Accessoires') {
    // Layers and accessories complete any base look.
    const bases = generate(
      others.filter(
        (item) => item.category !== 'Jacken' && item.category !== 'Accessoires',
      ),
    )
    return bases
      .map((look) => ({
        ...look,
        key: `${look.key}+${id}`,
        garmentIds: [...look.garmentIds, id],
      }))
      .filter((look) =>
        isCompleteOutfit(
          look.garmentIds.map(
            (lookId) =>
              (lookId === id
                ? anchor
                : items.find((item) => item.id === lookId)) as Garment,
          ),
        ),
      )
  }
  // Keep only this piece in its slot; a dress replaces top and bottom.
  const pool = [
    anchor,
    ...others.filter((item) =>
      piece.category === 'Kleider'
        ? !['Kleider', 'Oberteile', 'Hosen'].includes(item.category)
        : piece.category === 'Oberteile' || piece.category === 'Hosen'
          ? item.category !== piece.category && item.category !== 'Kleider'
          : item.category !== piece.category,
    ),
  ]
  return generate(pool).filter((look) => look.garmentIds.includes(id))
}
