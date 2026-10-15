import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createDatabaseBackup,
  importBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
import { assertWardrobeCapacity } from '../src/constraints'
import {
  deleteGarment,
  saveGarment,
  saveOutfit,
  setOutfitFeedback,
  toggleFavorite,
  WardrobeDatabase,
} from '../src/db'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  outfitKey,
  type OutfitOptions,
} from '../src/outfit-model'

const date = '2026-01-01T12:00:00.000Z'
function garment(
  id: string,
  category: Garment['category'],
  extra: Partial<Garment> = {},
): Garment {
  return {
    id,
    category,
    name: id,
    color: 'Weiss',
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    createdAt: date,
    updatedAt: date,
    ...extra,
  }
}
const closet = [
  garment('top', 'Oberteile'),
  garment('pants', 'Hosen'),
  garment('shoe', 'Schuhe'),
]
const options: OutfitOptions = {
  occasion: 'Alltag',
  season: 'Alle',
  style: 'Alle',
  includeAccessory: false,
}

describe('Outfit-Regeln und begrenzte Suche', () => {
  it('erfindet bei leerer oder unvollständiger Garderobe keine Stücke', () => {
    expect(generateOutfits([], options, DEFAULT_PREFERENCES, [])).toEqual([])
    expect(
      generateOutfits(closet.slice(0, 2), options, DEFAULT_PREFERENCES, []),
    ).toEqual([])
  })
  it('kombiniert nur existierende eindeutige IDs zu vollständigen Looks', () => {
    const items = [
      ...closet,
      garment('dress', 'Kleider'),
      garment('top-2', 'Oberteile'),
      garment('hat', 'Accessoires'),
    ]
    const results = generateOutfits(
      items,
      { ...options, includeAccessory: true },
      DEFAULT_PREFERENCES,
      [],
      17,
    )
    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(
        isCompleteOutfit(
          result.garmentIds.map((id) => items.find((item) => item.id === id)!),
        ),
      ).toBe(true)
      expect(new Set(result.garmentIds).size).toBe(result.garmentIds.length)
      expect(result.reasons.length).toBeGreaterThan(0)
    }
    expect(new Set(results.map((item) => item.key)).size).toBe(results.length)
  })
  it('hält ausdrücklich unpassende Saisonangaben aus der Auswahl heraus', () => {
    const items = closet.map((item) =>
      item.id === 'top'
        ? { ...item, seasons: ['Sommer'] as Garment['seasons'] }
        : item,
    )
    expect(
      generateOutfits(
        items,
        { ...options, season: 'Winter' },
        DEFAULT_PREFERENCES,
        [],
      ),
    ).toEqual([])
    expect(
      generateOutfits(
        items,
        { ...options, season: 'Sommer' },
        DEFAULT_PREFERENCES,
        [],
      ),
    ).toHaveLength(1)
  })
  it('vermeidet ausschliesslich sportlich markierte Stücke für Büro und Abend', () => {
    const items = closet.map((item) =>
      item.id === 'shoe'
        ? { ...item, styles: ['Sportlich'] as Garment['styles'] }
        : item,
    )
    expect(
      generateOutfits(
        items,
        { ...options, occasion: 'Büro' },
        DEFAULT_PREFERENCES,
        [],
      ),
    ).toEqual([])
    expect(
      generateOutfits(items, options, DEFAULT_PREFERENCES, []),
    ).toHaveLength(1)
  })
  it('merkt Ablehnungen exakt, ohne andere vorhandene Kombinationen auszuschliessen', () => {
    const items = [...closet, garment('dress', 'Kleider')]
    const rejected = {
      id: outfitKey(closet.map((item) => item.id)),
      garmentIds: closet.map((item) => item.id),
      verdict: 'rejected' as const,
      updatedAt: date,
    }
    const results = generateOutfits(items, options, DEFAULT_PREFERENCES, [
      rejected,
    ])
    expect(results).toHaveLength(1)
    expect(results[0].garmentIds).toEqual(['dress', 'shoe'])
  })
  it('gewichtet explizite Farbvorlieben und positives Feedback nachvollziehbar', () => {
    const items = [...closet, garment('blue', 'Oberteile', { color: 'Blau' })]
    const prefs = { ...DEFAULT_PREFERENCES, colors: ['Blau'] }
    const first = generateOutfits(items, options, prefs, [], 4)[0]
    expect(first.garmentIds).toContain('blue')
    const liked = {
      id: first.key,
      garmentIds: first.garmentIds,
      verdict: 'liked' as const,
      updatedAt: date,
    }
    expect(
      generateOutfits(items, options, prefs, [liked], 4)[0].reasons,
    ).toContain('Diese Kombination hat dir bereits gefallen.')
  })
  it('ist mit gleichem Seed reproduzierbar und bearbeitet grosse Bestände ohne vollständiges Kreuzprodukt', () => {
    const items = Array.from({ length: 900 }, (_, index) =>
      garment(
        `item-${index}`,
        ['Oberteile', 'Hosen', 'Schuhe'][index % 3] as Garment['category'],
      ),
    )
    const results = generateOutfits(items, options, DEFAULT_PREFERENCES, [], 42)
    expect(results).toHaveLength(3)
    expect(
      generateOutfits(items, options, DEFAULT_PREFERENCES, [], 42),
    ).toEqual(results)
  })
})

describe('Migration und Datenintegrität', () => {
  let db: WardrobeDatabase
  beforeEach(() => {
    db = new WardrobeDatabase(`review-${crypto.randomUUID()}`)
  })
  afterEach(async () => {
    await db.delete()
  })
  it('migriert die erste Datenbankversion ohne Verlust der Kleidung', async () => {
    const legacy = new Dexie(db.name)
    legacy.version(1).stores({ garments: 'id, category, updatedAt' })
    await legacy.table('garments').put(closet[0])
    legacy.close()
    await db.open()
    expect(await db.garments.toArray()).toEqual([closet[0]])
    expect(await db.outfits.count()).toBe(0)
    expect(db.verno).toBe(2)
  })
  it('verliert bei zwei gleichzeitigen Favoritenwechseln keine Aktion', async () => {
    await db.garments.put(closet[0])
    await Promise.all([
      toggleFavorite(closet[0], db),
      toggleFavorite(closet[0], db),
    ])
    expect((await db.garments.get('top'))?.favorite).toBe(false)
  })
  it('verhindert das Wiederbeleben eines zwischenzeitlich gelöschten Stücks', async () => {
    await expect(saveGarment(closet[0], closet[0], db)).rejects.toThrow(
      'inzwischen gelöscht',
    )
    expect(await db.garments.count()).toBe(0)
  })
  it('überschreibt keine zwischenzeitlich geänderten Angaben', async () => {
    await db.garments.put({
      ...closet[0],
      brand: 'Neue Marke',
      updatedAt: '2026-02-01T00:00:00.000Z',
    })
    await expect(saveGarment(closet[0], closet[0], db)).rejects.toThrow(
      'inzwischen',
    )
    expect((await db.garments.get('top'))?.brand).toBe('Neue Marke')
  })
  it('speichert vollständige Looks ohne Duplikate und verwirft fehlende oder falsche Referenzen', async () => {
    await db.garments.bulkPut(closet)
    const id = await saveOutfit(
      closet.map((item) => item.id),
      options,
      db,
    )
    expect(await saveOutfit(['shoe', 'pants', 'top'], options, db)).toBe(id)
    await expect(
      saveOutfit(['top', 'not-owned'], options, db),
    ).rejects.toThrow()
    await expect(saveOutfit(['top', 'shoe'], options, db)).rejects.toThrow(
      'Kategorien',
    )
    expect(await db.outfits.count()).toBe(1)
  })
  it('entfernt abhängige Outfits und Feedback atomar beim Löschen eines Kleidungsstücks', async () => {
    await db.garments.bulkPut(closet)
    await saveOutfit(
      closet.map((item) => item.id),
      options,
      db,
    )
    await setOutfitFeedback(
      closet.map((item) => item.id),
      'liked',
      db,
    )
    await deleteGarment('top', db)
    expect(await db.garments.count()).toBe(2)
    expect(await db.outfits.count()).toBe(0)
    expect(await db.feedback.count()).toBe(0)
  })
  it('stellt Kleidung, Outfits, Feedback und Vorlieben vollständig wieder her', async () => {
    await db.garments.bulkPut(closet)
    await saveOutfit(
      closet.map((item) => item.id),
      options,
      db,
    )
    await setOutfitFeedback(
      closet.map((item) => item.id),
      'liked',
      db,
    )
    await db.preferences.put({
      ...DEFAULT_PREFERENCES,
      colors: ['Blau'],
      updatedAt: date,
    })
    const data = parseFullBackup(await createDatabaseBackup(db))
    expect(data.outfits).toHaveLength(1)
    await importFullBackup(
      { garments: [], outfits: [], feedback: [], preferences: null },
      'replace',
      db,
    )
    expect(await importFullBackup(data, 'replace', db)).toBe(3)
    expect(await db.outfits.toArray()).toEqual(data.outfits)
    expect(await db.feedback.toArray()).toEqual(data.feedback)
    expect((await db.preferences.get('personal'))?.colors).toEqual(['Blau'])
  })
  it('bricht den gesamten Import bei einem Outfit-Schreibfehler ab', async () => {
    await db.garments.bulkPut(closet)
    await saveOutfit(
      closet.map((item) => item.id),
      options,
      db,
    )
    const data = parseFullBackup(await createDatabaseBackup(db))
    await db.outfits.clear()
    db.outfits.hook('creating', () => {
      throw new Error('Outfit-Schreibfehler')
    })
    await expect(
      importFullBackup(
        {
          ...data,
          garments: data.garments.map((item) => ({
            ...item,
            name: 'Importiert',
          })),
        },
        'replace',
        db,
      ),
    ).rejects.toThrow('Outfit-Schreibfehler')
    expect(await db.garments.toArray()).toEqual(
      [...closet].sort((a, b) => a.id.localeCompare(b.id)),
    )
  })
  it('weist unbekannte Referenzen in einer v2-Sicherung zurück', async () => {
    await db.garments.bulkPut(closet)
    await saveOutfit(
      closet.map((item) => item.id),
      options,
      db,
    )
    const data = JSON.parse(await createDatabaseBackup(db))
    data.outfits[0].garmentIds = ['top', 'phantom']
    expect(() => parseFullBackup(JSON.stringify(data))).toThrow('keine gültige')
  })
  it('überschreitet auch beim Zusammenführen die sicherbare Bestandsgrenze nicht', async () => {
    const existing = Array.from({ length: 800 }, (_, index) =>
      garment(`old-${index}`, 'Oberteile'),
    )
    await db.garments.bulkPut(existing)
    const incoming = Array.from({ length: 300 }, (_, index) =>
      garment(`new-${index}`, 'Hosen'),
    )
    await expect(importBackup(incoming, 'merge', db)).rejects.toThrow(
      '1000 Stücke',
    )
    expect(await db.garments.count()).toBe(800)
    expect(await db.garments.get('new-0')).toBeUndefined()
  })
  it('verhindert eine Sammlung, deren Fotos die Sicherungsgrenze überschreiten', () => {
    const photo = new Blob([new Uint8Array(70 * 1024 * 1024)])
    expect(() =>
      assertWardrobeCapacity([garment('large', 'Oberteile', { photo })]),
    ).toThrow('Sicherungsgrenze')
  })
})
