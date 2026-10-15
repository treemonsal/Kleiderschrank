import Dexie, { type Table } from 'dexie'
import type { Garment, GarmentDraft } from './model'
import {
  assertWardrobeCapacity,
  MAX_OUTFITS,
  UserFacingError,
} from './constraints'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  outfitKey,
  type OutfitFeedback,
  type OutfitOptions,
  type Preferences,
  type SavedOutfit,
} from './outfit-model'

export class WardrobeDatabase extends Dexie {
  garments!: Table<Garment, string>
  outfits!: Table<SavedOutfit, string>
  feedback!: Table<OutfitFeedback, string>
  preferences!: Table<Preferences, string>
  constructor(name = 'mystyle-private-wardrobe') {
    super(name)
    this.version(1).stores({ garments: 'id, category, updatedAt' })
    this.version(2).stores({
      outfits: 'id, updatedAt, *garmentIds',
      feedback: 'id, updatedAt, *garmentIds',
      preferences: 'id',
    })
  }
}
export async function deleteGarment(id: string, database = db): Promise<void> {
  await database.transaction(
    'rw',
    database.garments,
    database.outfits,
    database.feedback,
    async () => {
      await database.outfits.where('garmentIds').equals(id).delete()
      await database.feedback.where('garmentIds').equals(id).delete()
      await database.garments.delete(id)
    },
  )
}
export async function saveOutfit(
  ids: string[],
  options: OutfitOptions,
  database = db,
): Promise<string> {
  return database.transaction(
    'rw',
    database.garments,
    database.outfits,
    async () => {
      const garments = await database.garments.bulkGet(ids)
      if (
        ids.length < 2 ||
        ids.length > 6 ||
        new Set(ids).size !== ids.length ||
        garments.some((item) => !item)
      )
        throw new UserFacingError(
          'Ein Stück ist nicht mehr vorhanden. Bitte erstelle neue Vorschläge.',
        )
      if (!isCompleteOutfit(garments as Garment[]))
        throw new UserFacingError(
          'Die Kategorien haben sich geändert. Bitte erstelle neue Vorschläge.',
        )
      const same = (await database.outfits.toArray()).find(
        (item) => outfitKey(item.garmentIds) === outfitKey(ids),
      )
      if (same) return same.id
      if ((await database.outfits.count()) >= MAX_OUTFITS)
        throw new UserFacingError(
          'Du kannst bis zu 1000 Outfits speichern. Bitte entferne zuerst eines.',
        )
      const now = new Date().toISOString(),
        id = crypto.randomUUID()
      await database.outfits.put({
        id,
        name: `${options.occasion} · ${ids.length} Stücke`,
        garmentIds: [...ids],
        occasion: options.occasion,
        season: options.season,
        style: options.style,
        favorite: false,
        createdAt: now,
        updatedAt: now,
      })
      return id
    },
  )
}
export async function setOutfitFeedback(
  ids: string[],
  verdict: OutfitFeedback['verdict'],
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.garments,
    database.feedback,
    async () => {
      if ((await database.garments.bulkGet(ids)).some((item) => !item))
        throw new UserFacingError(
          'Ein Stück wurde entfernt. Bitte erstelle neue Vorschläge.',
        )
      await database.feedback.put({
        id: outfitKey(ids),
        garmentIds: [...ids],
        verdict,
        updatedAt: new Date().toISOString(),
      })
      const extra = (await database.feedback.count()) - 1000
      if (extra > 0)
        await database.feedback.orderBy('updatedAt').limit(extra).delete()
    },
  )
}
export async function updateOutfit(
  id: string,
  patch: { name?: string; favorite?: boolean },
  database = db,
): Promise<void> {
  await database.transaction('rw', database.outfits, async () => {
    const existing = await database.outfits.get(id)
    if (!existing)
      throw new UserFacingError('Dieses Outfit wurde bereits entfernt.')
    const name = (patch.name ?? existing.name).trim()
    if (!name || name.length > 100)
      throw new UserFacingError(
        'Bitte gib einen Outfit-Namen mit höchstens 100 Zeichen ein.',
      )
    await database.outfits.update(id, {
      ...patch,
      name,
      updatedAt: new Date().toISOString(),
    })
  })
}
export async function savePreferences(
  styles: Preferences['styles'],
  colors: string[],
  database = db,
): Promise<void> {
  await database.preferences.put({
    ...DEFAULT_PREFERENCES,
    styles: [...styles],
    colors: [...colors],
    updatedAt: new Date().toISOString(),
  })
}
export const db = new WardrobeDatabase()
export async function saveGarment(
  draft: GarmentDraft,
  existing?: Garment,
  database = db,
): Promise<string> {
  const now = new Date().toISOString()
  const garment: Garment = {
    ...draft,
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    notes: draft.notes.trim(),
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  if (!garment.name || garment.name.length > 100)
    throw new Error('Bitte gib einen Namen mit höchstens 100 Zeichen ein.')
  await database.transaction('rw', database.garments, async () => {
    const current = await database.garments.get(garment.id)
    if (existing && !current)
      throw new UserFacingError(
        'Dieses Stück wurde inzwischen gelöscht. Deine Eingaben bleiben hier sichtbar; schliesse den Dialog und lege es bei Bedarf neu an.',
      )
    if (existing && current?.updatedAt !== existing.updatedAt)
      throw new UserFacingError(
        'Dieses Stück wurde inzwischen in einer anderen Ansicht geändert. Kopiere deine Eingaben und öffne es erneut, damit keine neueren Angaben verloren gehen.',
      )
    const items = await database.garments.toArray()
    assertWardrobeCapacity([
      ...items.filter((item) => item.id !== garment.id),
      garment,
    ])
    await database.garments.put(garment)
  })
  return garment.id
}
export async function toggleFavorite(
  item: Garment,
  database = db,
): Promise<void> {
  await database.transaction('rw', database.garments, async () => {
    const current = await database.garments.get(item.id)
    if (current)
      await database.garments.update(item.id, {
        favorite: !current.favorite,
        updatedAt: new Date().toISOString(),
      })
  })
}
export function storageError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message
  if (error instanceof Error && /quota/i.test(error.name + error.message)) {
    return 'Der Gerätespeicher ist voll. Sichere deine Daten und schaffe Platz, bevor du es erneut versuchst.'
  }
  return 'Die Daten konnten nicht lokal gespeichert werden. Bitte versuche es erneut. Prüfe, ob dein Browser lokale Speicherung erlaubt.'
}
