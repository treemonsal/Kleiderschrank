import { describe, expect, it } from 'vitest'
import {
  convexHull,
  opaqueBox,
  opaquePoints,
  uprightAngle,
  type Point,
} from '../src/tidy-cutout'

/** A filled rectangle (w × h) turned by `degrees`, as sample points. */
function tilted(w: number, h: number, degrees: number): Point[] {
  const r = (degrees * Math.PI) / 180
  const points: Point[] = []
  for (let x = -w / 2; x <= w / 2; x += 2)
    for (let y = -h / 2; y <= h / 2; y += 2)
      points.push([
        x * Math.cos(r) - y * Math.sin(r),
        x * Math.sin(r) + y * Math.cos(r),
      ])
  return points
}

describe('Ausrichten freigestellter Stücke', () => {
  it('dreht ein schräg gehaltenes Stück gerade', () => {
    expect(uprightAngle(tilted(60, 120, 12))).toBeCloseTo(-12, 0)
    expect(uprightAngle(tilted(80, 100, -9))).toBeCloseTo(9, 0)
  })

  it('lässt gerade und runde Formen in Ruhe', () => {
    expect(uprightAngle(tilted(60, 120, 0))).toBe(0)
    const circle: Point[] = []
    for (let a = 0; a < 360; a += 3)
      circle.push([
        Math.cos((a * Math.PI) / 180) * 50,
        Math.sin((a * Math.PI) / 180) * 50,
      ])
    expect(uprightAngle(circle)).toBe(0)
  })

  it('dreht nie stärker als 20 Grad', () => {
    expect(Math.abs(uprightAngle(tilted(40, 120, 35)))).toBeLessThanOrEqual(20)
  })

  it('findet Umriss und Rand der deckenden Pixel', () => {
    expect(
      convexHull([
        [0, 0],
        [2, 0],
        [1, 1],
        [2, 2],
        [0, 2],
      ]),
    ).toHaveLength(4)
    const data = new Uint8ClampedArray(10 * 10 * 4)
    for (let y = 3; y < 7; y++)
      for (let x = 2; x < 5; x++) data[(y * 10 + x) * 4 + 3] = 255
    expect(opaqueBox(data, 10, 10)).toEqual({ x: 2, y: 3, w: 3, h: 4 })
    expect(opaquePoints(data, 10, 10, 10)).toHaveLength(12)
    expect(opaqueBox(new Uint8ClampedArray(16), 2, 2)).toBeNull()
  })
})
