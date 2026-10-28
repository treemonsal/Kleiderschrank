import { describe, expect, it } from 'vitest'
import {
  project,
  releaseVelocity,
  rubberband,
  springSettled,
  stepSpring,
  SPRING_DEFAULT,
  SPRING_SHEET,
} from '../src/spring'

function settle(
  config = SPRING_DEFAULT,
  from = { value: 0, velocity: 0 },
  to = 100,
) {
  let state = from
  let peak = state.value
  let time = 0
  while (!springSettled(state, to) && time < 5) {
    state = stepSpring(state, to, config, 1 / 60)
    peak = Math.max(peak, state.value)
    time += 1 / 60
  }
  return { state, peak, time }
}

describe('Feder', () => {
  it('kommt kritisch gedämpft ohne Überschwingen ans Ziel', () => {
    const { peak, time } = settle()
    expect(peak).toBeLessThanOrEqual(100.5)
    expect(time).toBeGreaterThan(0.3)
    expect(time).toBeLessThan(1.2)
  })

  it('schwingt mit Dämpfung unter 1 leicht über', () => {
    const { peak } = settle(SPRING_SHEET)
    expect(peak).toBeGreaterThan(100.1)
    expect(peak).toBeLessThan(110)
  })

  it('übernimmt die Geschwindigkeit des Fingers', () => {
    const still = stepSpring(
      { value: 0, velocity: 0 },
      100,
      SPRING_DEFAULT,
      0.05,
    )
    const thrown = stepSpring(
      { value: 0, velocity: 2000 },
      100,
      SPRING_DEFAULT,
      0.05,
    )
    expect(thrown.value).toBeGreaterThan(still.value)
  })

  it('bleibt bei grossen Zeitschritten stabil', () => {
    const state = stepSpring({ value: 0, velocity: 0 }, 100, SPRING_SHEET, 0.5)
    expect(Number.isFinite(state.value)).toBe(true)
    expect(Math.abs(state.value)).toBeLessThan(200)
  })
})

describe('Wurf und Grenzen', () => {
  it('projiziert einen Wurf wie Scroll-Verzögerung', () => {
    expect(project(0)).toBe(0)
    expect(project(1000)).toBeCloseTo(499, 0)
    expect(project(-1000)).toBeCloseTo(-499, 0)
  })

  it('bremst hinter der Grenze immer stärker', () => {
    const near = rubberband(50, 800)
    const far = rubberband(400, 800)
    expect(near).toBeGreaterThan(0)
    expect(near).toBeLessThan(50)
    expect(far / 400).toBeLessThan(near / 50)
    expect(rubberband(-50, 800)).toBeCloseTo(-near)
    expect(rubberband(10, 0)).toBe(0)
  })

  it('misst die Loslass-Geschwindigkeit aus den letzten 100 ms', () => {
    expect(
      releaseVelocity([
        { value: 0, time: 0 },
        { value: 100, time: 300 },
        { value: 150, time: 350 },
        { value: 200, time: 400 },
      ]),
    ).toBeCloseTo(1000)
    expect(releaseVelocity([{ value: 0, time: 0 }])).toBe(0)
    expect(
      releaseVelocity([
        { value: 0, time: 0 },
        { value: 50, time: 0 },
      ]),
    ).toBe(0)
  })
})
