import { describe, expect, it } from 'vitest'
import { costPerWear, describeWear, wearStats } from '../src/wear-stats'
import type { CalendarEntry } from '../src/calendar'
import type { SavedOutfit } from '../src/outfit-model'

const outfit = (id: string, garmentIds: string[]) =>
  ({ id, garmentIds }) as SavedOutfit
const entry = (day: string, outfitId: string, status = 'worn') =>
  ({ id: day, day, outfitId, status }) as CalendarEntry

describe('Tragestatistik', () => {
  it('zählt nur bestätigte vergangene Tage und merkt den letzten', () => {
    const stats = wearStats(
      [
        entry('2026-10-01', 'a'),
        entry('2026-10-10', 'b'),
        entry('2026-10-20', 'a', 'planned'),
        entry('2026-10-30', 'a'),
      ],
      [outfit('a', ['hemd', 'hose']), outfit('b', ['hemd'])],
      '2026-10-24',
    )
    expect(stats.get('hemd')).toEqual({ count: 2, lastWorn: '2026-10-10' })
    expect(stats.get('hose')).toEqual({ count: 1, lastWorn: '2026-10-01' })
  })

  it('beschreibt Stücke verständlich', () => {
    expect(describeWear(undefined)).toBe('Noch nie getragen')
    expect(
      describeWear({ count: 3, lastWorn: '2026-10-20' }, '2026-10-24'),
    ).toBe('3× getragen · zuletzt vor 4 Tagen')
    expect(
      describeWear({ count: 1, lastWorn: '2026-10-23' }, '2026-10-24'),
    ).toBe('1× getragen · zuletzt gestern')
  })
})

describe('Kosten pro Tragen', () => {
  it('teilt den Preis durch die Tragetage und zählt ungetragene als einmal', () => {
    expect(costPerWear(undefined, 3)).toBeUndefined()
    expect(costPerWear(60, 4)).toBe(15)
    expect(costPerWear(60, 0)).toBe(60)
    expect(costPerWear(10, 3)).toBe(3.33)
  })
})
