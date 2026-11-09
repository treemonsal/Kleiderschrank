import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  MODEL_SIZE,
  maskFromPrediction,
  normalizeModelPixels,
  verifyAsset,
} from '../src/background-model'
import { importFullBackup, parseFullBackup } from '../src/backup'
import { WardrobeDatabase } from '../src/db'
import { assertWardrobeCapacity } from '../src/constraints'
import type { Garment } from '../src/model'

describe('Echte lokale Freistellung – Daten und Fehlerfälle', () => {
  let db: WardrobeDatabase | undefined
  afterEach(async () => {
    await db?.delete()
    db = undefined
  })
  it('normalisiert RGB in die vorgegebene Kanalreihenfolge und erhält die Eingabepixel', () => {
    const data = new Uint8ClampedArray(MODEL_SIZE * MODEL_SIZE * 4).fill(255)
    data[0] = 0
    data[1] = 128
    const input = normalizeModelPixels(data)
    expect(input.length).toBe(3 * MODEL_SIZE * MODEL_SIZE)
    expect(input[0]).toBeCloseTo(-0.485 / 0.229)
    expect(input[MODEL_SIZE * MODEL_SIZE]).toBeCloseTo(
      (128 / 255 - 0.456) / 0.224,
    )
    expect(input[2 * MODEL_SIZE * MODEL_SIZE]).toBeCloseTo((1 - 0.406) / 0.225)
    expect(data[0]).toBe(0)
    expect(() => normalizeModelPixels(new Uint8ClampedArray(4))).toThrow()
  })
  it('bildet die echte Modellmaske ab und lehnt konstante oder ungültige Ausgaben ab', () => {
    const prediction = new Float32Array(MODEL_SIZE * MODEL_SIZE).fill(0.5)
    expect(() => maskFromPrediction(prediction)).toThrow('keinen Vordergrund')
    prediction[0] = 0
    prediction[1] = 1
    const mask = maskFromPrediction(prediction)
    expect([mask[0], mask[1], mask[2]]).toEqual([0, 255, 128])
    prediction[0] = NaN
    expect(() => maskFromPrediction(prediction)).toThrow('kein verwendbares')
    expect(() => maskFromPrediction(new Float32Array(1))).toThrow()
  })
  it('prüft Größe und SHA-256 statt beschädigte Modellbytes auszuführen', async () => {
    const data = new TextEncoder().encode('abc').buffer
    await expect(
      verifyAsset(
        data,
        3,
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    ).resolves.toBeUndefined()
    await expect(verifyAsset(data, 4, '')).rejects.toThrow('unvollständig')
    await expect(verifyAsset(data, 3, '0'.repeat(64))).rejects.toThrow(
      'sicher überprüft',
    )
  })
  it('sichert Original und PNG-Freistellung vollständig und importiert sie gemeinsam', async () => {
    const item: Garment = {
      id: 'photo-test',
      name: 'Hemd',
      category: 'Oberteile',
      color: 'Blau',
      brand: '',
      seasons: [],
      styles: [],
      notes: '',
      favorite: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      photo: new Blob([new Uint8Array([255, 216, 255, 1])], {
        type: 'image/jpeg',
      }),
      cutout: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1])], {
        type: 'image/png',
      }),
    }
    const json = JSON.stringify({
      app: 'MyStyle',
      version: 4,
      garments: [
        {
          ...item,
          photo: `data:image/jpeg;base64,${Buffer.from(await item.photo!.arrayBuffer()).toString('base64')}`,
          cutout: `data:image/png;base64,${Buffer.from(await item.cutout!.arrayBuffer()).toString('base64')}`,
        },
      ],
      outfits: [],
      feedback: [],
      preferences: null,
      calendar: [],
      weather: null,
    })
    expect(JSON.parse(json).version).toBe(4)
    const parsed = parseFullBackup(json)
    expect(await parsed.garments[0].photo!.arrayBuffer()).toEqual(
      await item.photo!.arrayBuffer(),
    )
    expect(await parsed.garments[0].cutout!.arrayBuffer()).toEqual(
      await item.cutout!.arrayBuffer(),
    )
    db = new WardrobeDatabase(`ai-backup-${crypto.randomUUID()}`)
    await importFullBackup(parsed, 'merge', db)
    expect((await db.garments.get(item.id))?.cutout?.size).toBe(
      item.cutout!.size,
    )
    const oversized = {
      ...item,
      cutout: new Blob([new Uint8Array(70 * 1024 * 1024)]),
    }
    expect(() => assertWardrobeCapacity([oversized])).toThrow(
      'Sicherungsgrenze',
    )
    const invalid = JSON.parse(json)
    delete invalid.garments[0].photo
    expect(() => parseFullBackup(JSON.stringify(invalid))).toThrow(
      'keine gültige',
    )
    invalid.garments[0].photo = JSON.parse(json).garments[0].photo
    invalid.garments[0].cutout = 'data:image/png;base64,YmFk'
    expect(() => parseFullBackup(JSON.stringify(invalid))).toThrow(
      'keine gültige',
    )
    for (const version of [1, 2, 3]) {
      const legacy = JSON.parse(json)
      legacy.version = version
      delete legacy.garments[0].cutout
      expect(
        parseFullBackup(JSON.stringify(legacy)).garments[0].cutout,
      ).toBeUndefined()
    }
  })
})
