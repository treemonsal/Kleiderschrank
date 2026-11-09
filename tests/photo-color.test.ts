import { describe, expect, it } from 'vitest'
import {
  nearestWardrobeColor,
  samplePhotoColor,
  type PhotoPixels,
} from '../src/photo-color'

function pixels(
  width: number,
  height: number,
  rgb: [number, number, number],
): PhotoPixels {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let offset = 0; offset < data.length; offset += 4)
    data.set([...rgb, 255], offset)
  return { width, height, data }
}

describe('Lokale Farbprobe', () => {
  it.each([
    [[0, 0, 0], 'Schwarz'],
    [[255, 255, 255], 'Weiss'],
    [[128, 128, 128], 'Grau'],
    [[255, 0, 0], 'Rot'],
    [[0, 0, 255], 'Blau'],
    [[23, 48, 82], 'Blau'],
    [[37, 87, 55], 'Grün'],
    [[214, 196, 172], 'Beige'],
    [[86, 52, 34], 'Braun'],
    [[213, 167, 181], 'Rosa'],
    [[255, 255, 0], 'Gelb'],
    [[118, 40, 166], 'Violett'],
  ] as const)('ordnet %s einer vorhandenen Farbfamilie zu: %s', (rgb, name) => {
    expect(nearestWardrobeColor(rgb).name).toBe(name)
  })

  it('ignoriert isolierte Bildstörungen und verändert die Fotodaten nicht', () => {
    const image = pixels(7, 7, [30, 60, 130])
    image.data.set([255, 0, 0, 255], (3 * 7 + 3) * 4)
    const before = image.data.slice()
    expect(samplePhotoColor(image, 50, 50)).toEqual([30, 60, 130])
    expect(image.data).toEqual(before)
    expect(nearestWardrobeColor([30, 60, 130]).hex).toBe('#1e3c82')
  })

  it('nimmt die gewählte Bildregion statt eines globalen Hintergrundmittels', () => {
    const image = pixels(20, 10, [255, 255, 255])
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 7; x++)
        image.data.set([255, 0, 0, 255], (y * 20 + x) * 4)
    expect(samplePhotoColor(image, 10, 50)).toEqual([255, 0, 0])
    expect(samplePhotoColor(image, 90, 50)).toEqual([255, 255, 255])
  })

  it('begrenzt Randpositionen und unterstützt winzige Bilder', () => {
    const image = pixels(1, 1, [20, 30, 40])
    expect(samplePhotoColor(image, -50, 150)).toEqual([20, 30, 40])
  })

  it('lehnt unbrauchbare Pixel und transparente Bereiche ab', () => {
    const image = pixels(4, 4, [0, 0, 0])
    image.data.fill(0)
    expect(samplePhotoColor(image, 50, 50)).toBeUndefined()
    expect(samplePhotoColor(image, NaN, 50)).toBeUndefined()
    expect(samplePhotoColor({ ...image, width: 0 }, 50, 50)).toBeUndefined()
    expect(
      samplePhotoColor({ ...image, data: new Uint8ClampedArray(3) }, 50, 50),
    ).toBeUndefined()
  })
})
