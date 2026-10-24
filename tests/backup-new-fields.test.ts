import { describe, expect, it } from 'vitest'
import { parseFullBackup } from '../src/backup'

const stamp = '2026-01-01T00:00:00.000Z'
const backup = (
  garment: Record<string, unknown>,
  preferences: unknown = null,
) =>
  JSON.stringify({
    app: 'MyStyle',
    version: 4,
    garments: [
      {
        id: 'g',
        name: 'Hemd',
        category: 'Oberteile',
        color: 'Weiss',
        brand: '',
        seasons: [],
        styles: [],
        notes: '',
        favorite: false,
        createdAt: stamp,
        updatedAt: stamp,
        ...garment,
      },
    ],
    outfits: [],
    feedback: [],
    preferences,
    calendar: [],
    weather: null,
  })

describe('Neue Sicherungsfelder 0.25.0', () => {
  it('übernimmt Preis, Wäschedatum, Wäsche-Automatik und Temperaturempfinden', () => {
    const data = parseFullBackup(
      backup(
        { price: 49.999, washedAt: '2026-10-01T10:00:00.000Z' },
        {
          id: 'personal',
          styles: [],
          colors: [],
          updatedAt: stamp,
          autoLaundry: false,
          comfort: 'cold',
        },
      ),
    )
    expect(data.garments[0].price).toBe(50)
    expect(data.garments[0].washedAt).toBe('2026-10-01T10:00:00.000Z')
    expect(data.preferences?.autoLaundry).toBe(false)
    expect(data.preferences?.comfort).toBe('cold')
  })

  it('lehnt ungültige Werte ab', () => {
    expect(() => parseFullBackup(backup({ price: -1 }))).toThrow()
    expect(() => parseFullBackup(backup({ price: '12' }))).toThrow()
    expect(() =>
      parseFullBackup(
        backup(
          {},
          {
            id: 'personal',
            styles: [],
            colors: [],
            updatedAt: stamp,
            comfort: 'hot',
          },
        ),
      ),
    ).toThrow()
  })
})
