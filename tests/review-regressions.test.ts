import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { updateOutfit, WardrobeDatabase } from '../src/db'
import type { SavedOutfit } from '../src/outfit-model'

const original: SavedOutfit = {
  id: 'saved-look',
  name: 'Mein ursprünglicher Look',
  garmentIds: ['top', 'pants', 'shoes'],
  occasion: 'Alltag',
  season: 'Alle',
  style: 'Alle',
  favorite: false,
  createdAt: '2026-10-15T12:00:00.000Z',
  updatedAt: '2026-10-15T12:00:00.000Z',
}

describe('Konfliktschutz für gespeicherte Outfit-Namen', () => {
  let database: WardrobeDatabase
  beforeEach(async () => {
    database = new WardrobeDatabase(`review-${crypto.randomUUID()}`)
    await database.outfits.put(original)
  })
  afterEach(async () => {
    vi.restoreAllMocks()
    await database.delete()
  })

  it('erhält die neuere Änderung, wenn ein zweiter offener Editor den alten Namen speichert', async () => {
    const firstEditor = (await database.outfits.get(original.id))!
    const secondEditor = (await database.outfits.get(original.id))!
    await updateOutfit(
      original.id,
      { name: 'Neuer Name', expectedUpdatedAt: secondEditor.updatedAt },
      database,
    )
    await expect(
      updateOutfit(
        original.id,
        { name: firstEditor.name, expectedUpdatedAt: firstEditor.updatedAt },
        database,
      ),
    ).rejects.toThrow('inzwischen geändert')
    expect((await database.outfits.get(original.id))?.name).toBe('Neuer Name')
  })

  it('erkennt Konflikte auch bei gleichbleibender oder zurückgestellter Gerätezeit', async () => {
    const clock = vi.spyOn(Date, 'now')
    clock.mockReturnValue(Date.parse(original.updatedAt))
    await updateOutfit(original.id, { favorite: true }, database)
    const favorite = (await database.outfits.get(original.id))!
    expect(favorite.updatedAt > original.updatedAt).toBe(true)
    clock.mockReturnValue(Date.parse(original.updatedAt) - 60000)
    await updateOutfit(
      original.id,
      { name: 'Neuer Name', expectedUpdatedAt: favorite.updatedAt },
      database,
    )
    const renamed = (await database.outfits.get(original.id))!
    expect(renamed.updatedAt > favorite.updatedAt).toBe(true)
    expect(renamed.favorite).toBe(true)
    expect(renamed.createdAt).toBe(original.createdAt)
    await expect(
      updateOutfit(
        original.id,
        { name: 'Veralteter Name', expectedUpdatedAt: favorite.updatedAt },
        database,
      ),
    ).rejects.toThrow('inzwischen geändert')
  })

  it('legt ein während der Bearbeitung gelöschtes Outfit nicht erneut an', async () => {
    await database.outfits.delete(original.id)
    await expect(
      updateOutfit(
        original.id,
        {
          name: 'Nicht wiederherstellen',
          expectedUpdatedAt: original.updatedAt,
        },
        database,
      ),
    ).rejects.toThrow('bereits entfernt')
    expect(await database.outfits.count()).toBe(0)
  })
})
