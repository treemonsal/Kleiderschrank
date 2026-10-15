import Dexie, { type Table } from 'dexie'
import type { Garment, GarmentDraft } from './model'

export class WardrobeDatabase extends Dexie {
  garments!: Table<Garment, string>
  constructor(name = 'mystyle-private-wardrobe') {
    super(name)
    this.version(1).stores({ garments: 'id, category, updatedAt' })
  }
}
export const db = new WardrobeDatabase()
export async function saveGarment(draft: GarmentDraft, existing?: Garment): Promise<string> {
  const now = new Date().toISOString()
  const garment: Garment = { ...draft, name: draft.name.trim(), brand: draft.brand.trim(),
    notes: draft.notes.trim(), id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now, updatedAt: now }
  if (!garment.name || garment.name.length > 100) throw new Error('Bitte gib einen Namen mit höchstens 100 Zeichen ein.')
  await db.garments.put(garment)
  return garment.id
}
export async function toggleFavorite(item: Garment): Promise<void> {
  await db.garments.update(item.id, { favorite: !item.favorite, updatedAt: new Date().toISOString() })
}
export function storageError(error: unknown): string {
  if (error instanceof Error && /quota/i.test(error.name + error.message)) {
    return 'Der Gerätespeicher ist voll. Sichere deine Daten und schaffe Platz, bevor du es erneut versuchst.'
  }
  return 'Die Daten konnten nicht lokal gespeichert werden. Bitte versuche es erneut. Prüfe, ob dein Browser lokale Speicherung erlaubt.'
}
