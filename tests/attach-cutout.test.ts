import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { attachCutout, WardrobeDatabase } from '../src/db'
import type { Garment } from '../src/model'

const stamp = '2026-01-01T00:00:00.000Z'
const shoe: Garment = {
  id: 'schuh',
  name: 'Air Force 1',
  category: 'Schuhe',
  color: 'Weiss',
  brand: 'Nike',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  photo: new Blob(['foto'], { type: 'image/jpeg' }),
  createdAt: stamp,
  updatedAt: stamp,
}
const cutout = () => new Blob(['frei'], { type: 'image/png' })

let open: WardrobeDatabase[] = []
async function fresh(item: Garment = shoe) {
  const db = new WardrobeDatabase(`cutout-${crypto.randomUUID()}`)
  open.push(db)
  await db.garments.put(item)
  return db
}
afterEach(async () => {
  for (const db of open) {
    db.close()
    await Dexie.delete(db.name)
  }
  open = []
})

describe('Freistellung nachträglich anhängen', () => {
  it('hängt sie an ein unverändertes Stück und behält das Originalfoto', async () => {
    const db = await fresh()
    expect(await attachCutout('schuh', stamp, cutout(), db)).toBe(true)
    const saved = (await db.garments.get('schuh'))!
    expect(saved.cutout?.type).toBe('image/png')
    expect(saved.photo?.type).toBe('image/jpeg')
    expect(saved.updatedAt > stamp).toBe(true)
  })

  it('lässt ein inzwischen bearbeitetes, gelöschtes oder schon freigestelltes Stück unverändert', async () => {
    const edited = await fresh({
      ...shoe,
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(await attachCutout('schuh', stamp, cutout(), edited)).toBe(false)
    expect((await edited.garments.get('schuh'))!.cutout).toBeUndefined()

    const gone = await fresh()
    await gone.garments.delete('schuh')
    expect(await attachCutout('schuh', stamp, cutout(), gone)).toBe(false)

    const done = await fresh({ ...shoe, cutout: new Blob(['alt']) })
    expect(await attachCutout('schuh', stamp, cutout(), done)).toBe(false)
    expect(await (await done.garments.get('schuh'))!.cutout!.text()).toBe('alt')
  })
})
