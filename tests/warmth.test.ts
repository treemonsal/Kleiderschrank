import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { warmthFit, warmthFor, warmthProxy } from '../src/warmth'
import { acceptsRefinement } from '../src/refinement-model'
import { generateOutfits } from '../src/generator'
import { parseAttributes } from '../src/cloud-ai'
import { saveGarment, WardrobeDatabase } from '../src/db'
import { createDatabaseBackup, parseFullBackup } from '../src/backup'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
} from '../src/outfit-model'
import type { Garment, GarmentDraft, Warmth } from '../src/model'
import type { WeatherDay } from '../src/weather'

const stamp = '2026-01-01T00:00:00.000Z'
const piece = (
  id: string,
  category: Garment['category'],
  warmth?: Warmth,
): Garment => ({
  id,
  name: id,
  category,
  color: 'Grau',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
  ...(warmth ? { warmth } : {}),
})
const day = (min: number, max: number): WeatherDay => ({
  day: '2026-01-15',
  min,
  max,
  rain: 0,
  code: 0,
})

describe('Wärmegrad', () => {
  it('leitet den passenden Wärmegrad aus der gefühlten Temperatur ab', () => {
    expect(warmthFor(day(-2, 4))).toBe(3)
    expect(warmthFor(day(8, 16))).toBe(2)
    expect(warmthFor(day(18, 28))).toBe(1)
    // Feeling cold shifts the day colder.
    expect(warmthFor(day(8, 16), -4)).toBe(3)
  })

  it('bewertet nur erfasste Wärme und nur bei Kleidung, die wärmt', () => {
    const cold = day(-2, 4)
    expect(warmthFit(piece('pulli', 'Oberteile', 3), cold)).toBeGreaterThan(0)
    expect(warmthFit(piece('top', 'Oberteile', 1), cold)).toBeLessThan(0)
    expect(warmthFit(piece('shirt', 'Oberteile'), cold)).toBe(0)
    expect(warmthFit(piece('schuh', 'Schuhe', 1), cold)).toBe(0)
    expect(warmthFit(piece('pulli', 'Oberteile', 3), undefined)).toBe(0)
  })

  it('„Wärmer“ erkennt eine dicke statt einer dünnen Jacke', () => {
    const base = [piece('shirt', 'Oberteile'), piece('hose', 'Hosen')]
    const thin = [...base, piece('windjacke', 'Jacken', 1)]
    const thick = [...base, piece('wintermantel', 'Jacken', 3)]
    expect(warmthProxy(thick)).toBeGreaterThan(warmthProxy(thin))
    // Before, every jacket counted the same; an unknown one still does.
    expect(warmthProxy([...base, piece('jacke', 'Jacken')])).toBe(4)
    expect(
      acceptsRefinement(thin, thick, {
        intent: 'warmer',
        currentIds: thin.map((item) => item.id),
        lockedIds: [],
      }),
    ).toBe(true)
  })

  it('schlägt an einem kalten Tag den warmen Pullover vor dem leichten Shirt vor', () => {
    const items = [
      piece('leinenshirt', 'Oberteile', 1),
      piece('strickpulli', 'Oberteile', 3),
      piece('hose', 'Hosen', 2),
      piece('schuh', 'Schuhe'),
    ]
    const [best] = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
      0,
      day(-3, 3),
    )
    expect(best.garmentIds).toContain('strickpulli')
    const [summer] = generateOutfits(
      items,
      DEFAULT_OUTFIT_OPTIONS,
      DEFAULT_PREFERENCES,
      [],
      0,
      day(20, 30),
    )
    expect(summer.garmentIds).toContain('leinenshirt')
  })

  it('übernimmt eine gültige Wärme aus der Fotoerkennung und ignoriert alles andere', () => {
    const base = {
      name: 'Pulli',
      category: 'Oberteile',
      color: 'Grau',
      brand: '',
      seasons: [],
      styles: [],
      notes: '',
    }
    expect(parseAttributes({ ...base, warmth: 3 }).warmth).toBe(3)
    expect(parseAttributes({ ...base, warmth: 7 }).warmth).toBeUndefined()
    expect(parseAttributes({ ...base, warmth: null }).warmth).toBeUndefined()
    expect(parseAttributes(base).warmth).toBeUndefined()
  })
})

describe('Wärmegrad wird gespeichert und gesichert', () => {
  let db: WardrobeDatabase | undefined
  afterEach(async () => {
    if (!db) return
    db.close()
    await Dexie.delete(db.name)
    db = undefined
  })

  it('speichert gültige Werte, verwirft ungültige und sichert sie', async () => {
    db = new WardrobeDatabase(`warmth-${crypto.randomUUID()}`)
    const draft = (warmth: unknown) =>
      ({
        name: 'Stück',
        category: 'Oberteile',
        color: 'Grau',
        brand: '',
        seasons: [],
        styles: [],
        notes: '',
        favorite: false,
        warmth,
      }) as GarmentDraft
    const warm = await saveGarment(draft(3), undefined, db)
    const odd = await saveGarment(draft(9), undefined, db)
    expect((await db.garments.get(warm))?.warmth).toBe(3)
    expect((await db.garments.get(odd))?.warmth).toBeUndefined()
    const json = await createDatabaseBackup(db)
    expect(
      parseFullBackup(json).garments.find((item) => item.id === warm)?.warmth,
    ).toBe(3)
    const broken = JSON.parse(json)
    broken.garments[0].warmth = 'warm'
    expect(() => parseFullBackup(JSON.stringify(broken))).toThrow()
  })
})
