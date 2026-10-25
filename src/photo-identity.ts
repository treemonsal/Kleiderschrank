import type { Garment } from './model'

type Photos = Pick<Garment, 'photo' | 'cutout'>
const PROBE = 4096

/**
 * IndexedDB hands out a new Blob for every read, so each favourite or laundry
 * change would give every picture a new object URL and reload it (WebKit can
 * leave such images blank). Byte-identical photos keep the Blob already shown.
 */
export async function sameBlob(a: Blob, b: Blob): Promise<boolean> {
  if (a === b) return true
  if (a.size !== b.size || a.type !== b.type) return false
  const parts = (blob: Blob) =>
    blob.size <= PROBE * 2
      ? [blob]
      : [blob.slice(0, PROBE), blob.slice(blob.size - PROBE)]
  const [left, right] = await Promise.all(
    [a, b].map(async (blob) =>
      Promise.all(parts(blob).map((part) => part.arrayBuffer())),
    ),
  )
  return left.every((buffer, index) => {
    const x = new Uint8Array(buffer),
      y = new Uint8Array(right[index])
    return x.length === y.length && x.every((value, i) => value === y[i])
  })
}

async function stable(next: Blob | undefined, previous: Blob | undefined) {
  if (!next || !previous) return next
  return (await sameBlob(next, previous)) ? previous : next
}

export async function keepPhotoIdentity(
  items: Garment[],
  previous: Map<string, Photos>,
): Promise<Garment[]> {
  return Promise.all(
    items.map(async (item) => {
      const before = previous.get(item.id)
      if (!before) return item
      const [photo, cutout] = await Promise.all([
        stable(item.photo, before.photo),
        stable(item.cutout, before.cutout),
      ])
      return photo === item.photo && cutout === item.cutout
        ? item
        : { ...item, photo, cutout }
    }),
  )
}
