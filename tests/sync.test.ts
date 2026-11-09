import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteGarment,
  saveGarment,
  saveOutfit,
  WardrobeDatabase,
} from '../src/db'
import { syncWithDrive, SYNC_FILE } from '../src/sync'
import { decide, syncPlan } from '../src/sync-model'
import { DEFAULT_OUTFIT_OPTIONS } from '../src/outfit-model'
import type { GarmentDraft } from '../src/model'
import { FakeDrive } from './fixtures/fake-drive'

// Photo decoding needs a browser; here every non-empty photo decodes.
class FakeImage {
  naturalWidth = 1
  naturalHeight = 1
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_: string) {
    queueMicrotask(() => this.onload?.())
  }
}
const jpeg = (seed: number) =>
  new Blob([new Uint8Array([255, 216, 255, 224, seed, 1, 2, 3])], {
    type: 'image/jpeg',
  })
const draft = (
  name: string,
  category: GarmentDraft['category'],
  photo?: Blob,
) =>
  ({
    name,
    category,
    color: 'Blau',
    brand: '',
    seasons: [],
    styles: [],
    notes: '',
    favorite: false,
    ...(photo ? { photo } : {}),
  }) as GarmentDraft

let devices: WardrobeDatabase[] = []
const device = () => {
  const database = new WardrobeDatabase(`sync-${crypto.randomUUID()}`)
  devices.push(database)
  return database
}
beforeEach(() => vi.stubGlobal('Image', FakeImage))
afterEach(async () => {
  vi.unstubAllGlobals()
  for (const database of devices) {
    database.close()
    await Dexie.delete(database.name)
  }
  devices = []
})

async function wardrobe(database: WardrobeDatabase) {
  const shirt = await saveGarment(
    draft('Hemd', 'Oberteile', jpeg(1)),
    undefined,
    database,
  )
  const pants = await saveGarment(draft('Hose', 'Hosen'), undefined, database)
  const shoes = await saveGarment(
    draft('Schuh', 'Schuhe', jpeg(2)),
    undefined,
    database,
  )
  const look = await saveOutfit(
    [shirt, pants, shoes],
    DEFAULT_OUTFIT_OPTIONS,
    database,
  )
  return { shirt, pants, shoes, look }
}

describe('Abgleichsregeln', () => {
  it('entscheidet pro Eintrag nach Änderungszeit und letztem Abgleich', () => {
    const at = (updatedAt: string) => ({ id: 'x', updatedAt })
    expect(decide(at('2'), at('3'), '1')).toBe('import')
    expect(decide(at('3'), at('2'), '1')).toBe('keep')
    expect(decide(at('1'), undefined, '1')).toBe('deleteLocal')
    expect(decide(at('2'), undefined, '1')).toBe('keep') // edited after sync
    expect(decide(at('2'), undefined, undefined)).toBe('keep') // new here
    expect(decide(undefined, at('1'), '1')).toBe('dropRemote')
    expect(decide(undefined, at('2'), '1')).toBe('import')
    expect(decide(undefined, at('2'), undefined)).toBe('import')
    const plan = syncPlan(
      {
        garments: [at('1')],
        outfits: [],
        feedback: [],
        calendar: [],
        weather: [],
        chat: [],
      },
      {
        garments: [],
        outfits: [],
        feedback: [],
        calendar: [],
        weather: [],
        chat: [],
      },
      { 'garments:x': '1' },
    )
    expect([...plan.deletions.garments]).toEqual(['x'])
  })
})

describe('Abgleich über Google Drive', () => {
  it('bringt Stücke mit identischen Fotos und Looks auf ein zweites Gerät, Fotos nur einmal', async () => {
    const drive = new FakeDrive()
    const a = device(),
      b = device()
    const { shirt, look } = await wardrobe(a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    expect(drive.byName(SYNC_FILE)).toBeDefined()
    const photos = [...drive.files.values()].filter((file) =>
      file.name.startsWith('photo-'),
    )
    expect(photos).toHaveLength(2)
    const result = await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    expect(result.imported).toBe(4)
    const copy = await b.garments.get(shirt)
    expect(copy?.name).toBe('Hemd')
    expect(new Uint8Array(await copy!.photo!.arrayBuffer())).toEqual(
      new Uint8Array(await jpeg(1).arrayBuffer()),
    )
    expect(await b.outfits.get(look)).toBeDefined()
    // A second sync without changes uploads nothing new.
    const uploads = drive.requests.filter((request) =>
      request.startsWith('POST'),
    ).length
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    expect(
      drive.requests.filter((request) => request.startsWith('POST')).length,
    ).toBe(uploads)
  })

  it('übernimmt Änderungen und Löschungen anderer Geräte, ohne Gelöschtes zurückzuholen', async () => {
    const drive = new FakeDrive()
    const a = device(),
      b = device()
    const { shirt, pants, look } = await wardrobe(a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    await saveGarment(
      { ...(await b.garments.get(pants))!, name: 'Dunkle Hose' },
      await b.garments.get(pants),
      b,
    )
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    await deleteGarment(shirt, a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    expect((await a.garments.get(pants))?.name).toBe('Dunkle Hose')
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    expect(await b.garments.get(shirt)).toBeUndefined()
    expect(await b.outfits.get(look)).toBeUndefined()
    // Syncing again in either order keeps the deletion.
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    expect(await a.garments.get(shirt)).toBeUndefined()
  })

  it('verliert keine Änderung, die nach einer Löschung auf einem anderen Gerät gemacht wurde', async () => {
    const drive = new FakeDrive()
    const a = device(),
      b = device()
    const { shirt } = await wardrobe(a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    await deleteGarment(shirt, b)
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    // Meanwhile A renamed the shirt without having synced the deletion.
    const current = (await a.garments.get(shirt))!
    await saveGarment({ ...current, name: 'Lieblingshemd' }, current, a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    expect((await a.garments.get(shirt))?.name).toBe('Lieblingshemd')
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    expect((await b.garments.get(shirt))?.name).toBe('Lieblingshemd')
  })

  it('wartet auf fehlende Fotos, statt das Stück zu verlieren', async () => {
    const drive = new FakeDrive()
    const a = device(),
      b = device()
    const { shirt } = await wardrobe(a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    const photo = [...drive.files.values()].find((file) =>
      file.name.startsWith('photo-'),
    )!
    const saved = photo.bytes
    drive.files.delete(photo.id)
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    const waiting = (await b.garments.toArray()).map((item) => item.name)
    expect(waiting).toHaveLength(2)
    // The Drive copy still lists all three pieces after B's upload.
    const document = JSON.parse(
      new TextDecoder().decode(drive.byName(SYNC_FILE)!.bytes),
    )
    expect(document.garments).toHaveLength(3)
    drive.files.set(photo.id, { ...photo, bytes: saved })
    await syncWithDrive(drive.token, 'acc', b, drive.fetch)
    expect(await b.garments.get(shirt)).toBeDefined()
    expect(await a.garments.count()).toBe(3)
  })

  it('verändert bei beschädigten Drive-Daten oder abgelaufener Anmeldung nichts', async () => {
    const drive = new FakeDrive()
    const a = device()
    await wardrobe(a)
    await syncWithDrive(drive.token, 'acc', a, drive.fetch)
    const before = await a.garments.count()
    drive.byName(SYNC_FILE)!.bytes = new TextEncoder().encode('{kaputt')
    await expect(
      syncWithDrive(drive.token, 'acc', a, drive.fetch),
    ).rejects.toThrow('beschädigt')
    expect(await a.garments.count()).toBe(before)
    await expect(
      syncWithDrive('abgelaufen', 'acc', a, drive.fetch),
    ).rejects.toThrow('abgelaufen')
  })
})
