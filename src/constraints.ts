import type { Garment } from './model'

export const MAX_GARMENTS = 1000
export const MAX_BACKUP_BYTES = 100 * 1024 * 1024
export const MAX_OUTFITS = 1000
export class UserFacingError extends Error {}

// Reserve 10 MB for outfits, preferences and the versioned envelope so that
// every accepted wardrobe can still be exported by this version.
export function assertWardrobeCapacity(items: Garment[]): void {
  if (items.length > MAX_GARMENTS)
    throw new UserFacingError(
      'Dein Kleiderschrank unterstützt bis zu 1000 Stücke. Es wurde nichts verändert.',
    )
  let bytes = 0
  for (const item of items) {
    const { photo, ...metadata } = item
    bytes += new Blob([JSON.stringify(metadata)]).size + 64
    if (photo) bytes += 4 * Math.ceil(photo.size / 3) + 64
  }
  if (bytes > 90 * 1024 * 1024)
    throw new UserFacingError(
      'Die Sammlung erreicht die Sicherungsgrenze. Bitte verwende kleinere Fotos oder sichere und entferne nicht mehr benötigte Stücke. Es wurde nichts verändert.',
    )
}
