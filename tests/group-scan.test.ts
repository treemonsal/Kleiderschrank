import 'fake-indexeddb/auto'
import { afterEach, expect, it } from 'vitest'
import {
  parseGroupDetection,
  saveScannedGarments,
  type ScannedGarment,
} from '../src/group-scan'
import { WardrobeDatabase } from '../src/db'
const attributes = {
  name: 'Hemd',
  category: 'Oberteile',
  color: 'Weiss',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
}
const databases: WardrobeDatabase[] = []
afterEach(async () => {
  await Promise.all(databases.splice(0).map((db) => db.delete()))
})
function database() {
  const db = new WardrobeDatabase(`group-${crypto.randomUUID()}`)
  databases.push(db)
  return db
}
function garment(name = 'Hemd', selected = true): ScannedGarment {
  return {
    id: crypto.randomUUID(),
    box: [0, 0, 500, 1000],
    attributes: { ...attributes, category: 'Oberteile', name },
    photo: new Blob(['original'], { type: 'image/jpeg' }),
    cutout: new Blob(['cutout'], { type: 'image/png' }),
    selected,
  }
}
it('validates bounded distinct boxes and model attributes', () => {
  expect(
    parseGroupDetection({
      items: [
        { box: [0, 0, 450, 1000], attributes },
        { box: [500, 0, 1000, 1000], attributes },
      ],
    }),
  ).toHaveLength(2)
  for (const box of [
    [-1, 0, 500, 1000],
    [0, 0, NaN, 1000],
    [500, 0, 100, 1000],
    [0, 0, 1, 1],
    [0, 0, 1001, 1000],
  ])
    expect(() =>
      parseGroupDetection({ items: [{ box, attributes }] }),
    ).toThrow()
  expect(() =>
    parseGroupDetection({
      items: [
        { box: [0, 0, 500, 1000], attributes },
        { box: [0, 0, 500, 1000], attributes },
      ],
    }),
  ).toThrow('mehrfach')
  expect(() =>
    parseGroupDetection({
      items: [
        {
          box: [0, 0, 500, 1000],
          attributes: { ...attributes, category: 'Invented' },
        },
      ],
    }),
  ).toThrow()
  expect(() => parseGroupDetection({ items: [] })).toThrow()
  expect(() =>
    parseGroupDetection({
      items: Array.from({ length: 7 }, () => ({
        box: [0, 0, 500, 1000],
        attributes,
      })),
    }),
  ).toThrow()
})
it('saves selected pieces with both original and cutout in one transaction', async () => {
  const db = database()
  expect(
    await saveScannedGarments(
      [garment(), garment('Hose'), garment('Nicht speichern', false)],
      db,
    ),
  ).toBe(2)
  const saved = await db.garments.toArray()
  expect(saved.map((item) => item.name).sort()).toEqual(['Hemd', 'Hose'])
  for (const item of saved) {
    expect(await item.photo?.text()).toBe('original')
    expect(await item.cutout?.text()).toBe('cutout')
  }
})
it('rolls back earlier pieces when a later piece is invalid', async () => {
  const db = database()
  await expect(
    saveScannedGarments([garment(), garment(' ')], db),
  ).rejects.toThrow()
  expect(await db.garments.count()).toBe(0)
})
it('rejects an empty selection before writing', async () => {
  const db = database()
  await expect(
    saveScannedGarments([garment('Hemd', false)], db),
  ).rejects.toThrow()
  expect(await db.garments.count()).toBe(0)
})

it('rolls back the whole batch when the wardrobe limit is reached mid-save', async () => {
  const db = database()
  const stamp = '2026-01-01T00:00:00.000Z'
  await db.garments.bulkAdd(
    Array.from({ length: 999 }, (_, i) => ({
      ...attributes,
      category: 'Oberteile' as const,
      favorite: false,
      id: `existing-${i}`,
      createdAt: stamp,
      updatedAt: stamp,
    })),
  )
  await expect(
    saveScannedGarments([garment(), garment('Hose')], db),
  ).rejects.toThrow('1000')
  expect(await db.garments.count()).toBe(999)
})
