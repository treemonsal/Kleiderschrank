import { describe, expect, it } from 'vitest'
import { keepPhotoIdentity, sameBlob } from '../src/photo-identity'
import type { Garment } from '../src/model'

const bytes = (size: number, fill = 7, last = fill) => {
  const data = new Uint8Array(size).fill(fill)
  data[size - 1] = last
  return new Blob([data], { type: 'image/png' })
}
const garment = (photo?: Blob, cutout?: Blob): Garment => ({
  id: 'a',
  name: 'Hemd',
  category: 'Oberteile',
  color: 'Blau',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  photo,
  cutout,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('photo identity', () => {
  it('treats equal bytes as the same photo, also for large photos', async () => {
    expect(await sameBlob(bytes(10), bytes(10))).toBe(true)
    expect(await sameBlob(bytes(20000), bytes(20000))).toBe(true)
  })
  it('detects a different type, size, start or end', async () => {
    expect(await sameBlob(bytes(10), bytes(11))).toBe(false)
    expect(await sameBlob(bytes(10, 1), bytes(10, 2))).toBe(false)
    expect(await sameBlob(bytes(20000, 1, 1), bytes(20000, 1, 2))).toBe(false)
    expect(
      await sameBlob(bytes(10), new Blob([new Uint8Array(10).fill(7)])),
    ).toBe(false)
  })
  it('keeps the shown Blob when only other fields change', async () => {
    const shown = bytes(30)
    const [next] = await keepPhotoIdentity(
      [{ ...garment(bytes(30), bytes(30)), favorite: true }],
      new Map([['a', { photo: shown, cutout: undefined }]]),
    )
    expect(next.photo).toBe(shown)
    expect(next.favorite).toBe(true)
    expect(next.cutout).toBeInstanceOf(Blob)
  })
  it('uses the new Blob when the photo was replaced', async () => {
    const replaced = bytes(30, 9)
    const [next] = await keepPhotoIdentity(
      [garment(replaced)],
      new Map([['a', { photo: bytes(30, 1) }]]),
    )
    expect(next.photo).toBe(replaced)
  })
})
