import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDatabaseBackup,
  importFullBackup,
  parseFullBackup,
} from '../src/backup'
import {
  dayLabel,
  isDay,
  localDay,
  monthDays,
  wornCounts,
  type CalendarEntry,
} from '../src/calendar'
import {
  deleteCalendarEntry,
  deleteOutfit,
  saveCalendarEntry,
} from '../src/calendar-db'
import { deleteGarment, saveOutfit, WardrobeDatabase } from '../src/db'
import { generateOutfits } from '../src/generator'
import type { Garment } from '../src/model'
import { DEFAULT_PREFERENCES, type OutfitOptions } from '../src/outfit-model'
import {
  loadWeather,
  parseForecast,
  roundedLocation,
  searchLocations,
  weatherFresh,
  type WeatherDay,
} from '../src/weather'

const stamp = '2026-01-01T00:00:00.000Z'
const options: OutfitOptions = {
  occasion: 'Alltag',
  season: 'Alle',
  style: 'Alle',
  includeAccessory: false,
}
const pieces: Garment[] = (
  ['Oberteile', 'Hosen', 'Schuhe', 'Jacken'] as const
).map((category, index) => ({
  id: `piece-${index}`,
  name: category,
  category,
  color: 'Weiss',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
  createdAt: stamp,
  updatedAt: stamp,
}))
function forecast(day = '2026-10-15') {
  return {
    timezone: 'Europe/Zurich',
    daily_units: {
      temperature_2m_min: '°C',
      temperature_2m_max: '°C',
      precipitation_probability_max: '%',
    },
    daily: {
      time: [day],
      temperature_2m_min: [5],
      temperature_2m_max: [9],
      precipitation_probability_max: [80],
      weather_code: [61],
    },
  }
}

describe('Kalendertage und Monatsgrenzen', () => {
  it('validiert reale Kalendertage einschliesslich Schaltjahr und lehnt Überläufe ab', () => {
    expect(isDay('2024-02-29')).toBe(true)
    for (const value of [
      '2026-02-29',
      '2026-04-31',
      '2026-13-01',
      '2026-1-01',
      '1899-12-31',
      '2201-01-01',
    ])
      expect(isDay(value)).toBe(false)
  })
  it('verwendet lokale Tagesbestandteile ohne UTC-Verschiebung', () => {
    expect(localDay(new Date(2026, 2, 29, 0, 30))).toBe('2026-03-29')
    expect(dayLabel('2026-10-15')).toContain('Donnerstag')
  })
  it('ordnet Wochen montags beginnend an und erzeugt keine fremden Monatstage', () => {
    const cells = monthDays('2024-02')
    expect(cells).toHaveLength(42)
    expect(cells.indexOf('2024-02-01')).toBe(3)
    expect(cells.filter(Boolean)).toHaveLength(29)
    expect(cells.filter(Boolean).at(-1)).toBe('2024-02-29')
  })
})

describe('Kalender, Migration und vollständige Sicherung', () => {
  let db: WardrobeDatabase
  let outfitId: string
  beforeEach(async () => {
    db = new WardrobeDatabase(`calendar-${crypto.randomUUID()}`)
    await db.garments.bulkPut(pieces)
    outfitId = await saveOutfit(
      pieces.slice(0, 3).map((item) => item.id),
      options,
      db,
    )
  })
  afterEach(async () => {
    await db.delete()
  })
  it('migriert Version 2 mit bestehenden Outfits ohne Datenverlust', async () => {
    const name = `migration-${crypto.randomUUID()}`
    const legacy = new Dexie(name)
    legacy.version(1).stores({ garments: 'id, category, updatedAt' })
    legacy.version(2).stores({
      outfits: 'id, updatedAt, *garmentIds',
      feedback: 'id, updatedAt, *garmentIds',
      preferences: 'id',
    })
    const original = (await db.outfits.toArray())[0]
    await legacy.table('garments').bulkPut(pieces)
    await legacy.table('outfits').put(original)
    legacy.close()
    const upgraded = new WardrobeDatabase(name)
    try {
      expect(await upgraded.outfits.get(original.id)).toEqual(original)
      expect(await upgraded.calendar.count()).toBe(0)
      expect(upgraded.verno).toBe(5)
    } finally {
      await upgraded.delete()
    }
  })
  it('plant, bestätigt und zählt Tragetage ohne doppelte Zähler', async () => {
    const day = '2020-01-02'
    await saveCalendarEntry(
      { day, outfitId, status: 'planned', note: ' Arbeit ' },
      null,
      db,
    )
    expect(
      wornCounts(await db.calendar.toArray(), await db.outfits.toArray()).size,
    ).toBe(0)
    const entry = (await db.calendar.get(day))!
    await saveCalendarEntry({ ...entry, status: 'worn' }, entry.updatedAt, db)
    const updated = (await db.calendar.get(day))!
    await saveCalendarEntry(updated, updated.updatedAt, db)
    expect(
      wornCounts(await db.calendar.toArray(), await db.outfits.toArray()).get(
        'piece-0',
      ),
    ).toBe(1)
    expect(updated.note).toBe('Arbeit')
    expect(await db.calendar.count()).toBe(1)
  })
  it('schliesst geplante und zukünftige importierte Tragetage aus der Häufigkeit aus', async () => {
    const outfit = (await db.outfits.toArray())[0]
    const entries: CalendarEntry[] = [
      '2019-01-01',
      '2020-01-01',
      '2099-01-01',
    ].map((day, index) => ({
      id: day,
      day,
      outfitId,
      status: index === 0 ? 'planned' : 'worn',
      note: '',
      createdAt: stamp,
      updatedAt: stamp,
    }))
    expect(wornCounts(entries, [outfit], '2026-10-15').get('piece-0')).toBe(1)
  })
  it('verbietet zukünftige Tragetage und unbekannte Looks', async () => {
    await expect(
      saveCalendarEntry(
        { day: '2199-01-01', outfitId, status: 'worn', note: '' },
        null,
        db,
      ),
    ).rejects.toThrow('zukünftiger')
    await expect(
      saveCalendarEntry(
        { day: '2020-01-01', outfitId: 'missing', status: 'planned', note: '' },
        null,
        db,
      ),
    ).rejects.toThrow('nicht mehr vorhanden')
    expect(await db.calendar.count()).toBe(0)
  })
  it('verhindert unbemerkte Überschreibungen und veraltete Löschungen', async () => {
    const draft = {
      day: '2020-01-01',
      outfitId,
      status: 'planned' as const,
      note: '',
    }
    await saveCalendarEntry(draft, null, db)
    const original = (await db.calendar.get(draft.day))!
    await saveCalendarEntry({ ...draft, note: 'Neu' }, original.updatedAt, db)
    await expect(
      saveCalendarEntry({ ...draft, note: 'Alt' }, original.updatedAt, db),
    ).rejects.toThrow('inzwischen')
    await expect(
      deleteCalendarEntry(draft.day, original.updatedAt, db),
    ).rejects.toThrow('inzwischen')
    expect((await db.calendar.get(draft.day))?.note).toBe('Neu')
  })
  it.each(['garment', 'outfit'])(
    'entfernt Kalendereinträge atomar bei %s-Löschung',
    async (target) => {
      await saveCalendarEntry(
        { day: '2020-01-01', outfitId, status: 'planned', note: '' },
        null,
        db,
      )
      if (target === 'garment') await deleteGarment('piece-0', db)
      else await deleteOutfit(outfitId, db)
      expect(await db.calendar.count()).toBe(0)
      expect(await db.outfits.count()).toBe(0)
      expect(await db.garments.count()).toBe(target === 'garment' ? 3 : 4)
    },
  )
  it('sichert und restauriert Kalender und gerundeten Wetterort gemeinsam', async () => {
    await saveCalendarEntry(
      { day: '2020-01-01', outfitId, status: 'worn', note: 'Ausflug' },
      null,
      db,
    )
    await db.weather.put({
      id: 'local',
      location: roundedLocation('Zürich', 47.3769, 8.5417),
      report: parseForecast(forecast(), stamp),
      updatedAt: stamp,
    })
    const data = parseFullBackup(await createDatabaseBackup(db))
    expect(data.calendar).toHaveLength(1)
    expect(data.weather?.location.latitude).toBe(47.38)
    await importFullBackup(
      { garments: [], outfits: [], feedback: [], preferences: null },
      'replace',
      db,
    )
    expect(await db.weather.count()).toBe(0)
    await importFullBackup(data, 'replace', db)
    expect(await db.calendar.toArray()).toEqual(data.calendar)
    expect(await db.weather.get('local')).toEqual(data.weather)
  })
  it('rollt sämtliche Daten nach einem Kalender-Schreibfehler zurück', async () => {
    await saveCalendarEntry(
      { day: '2020-01-01', outfitId, status: 'planned', note: '' },
      null,
      db,
    )
    const data = parseFullBackup(await createDatabaseBackup(db))
    db.calendar.hook('creating', () => {
      throw new Error('Kalender-Schreibfehler')
    })
    await expect(importFullBackup(data, 'replace', db)).rejects.toThrow(
      'Kalender-Schreibfehler',
    )
    expect(await db.garments.count()).toBe(4)
    expect(await db.calendar.count()).toBe(1)
    expect(await db.outfits.count()).toBe(1)
  })
  it('liest v2-Sicherungen weiter und verwirft ungültige Tage oder Referenzen in v3', async () => {
    const json = JSON.parse(await createDatabaseBackup(db))
    const legacy = { ...json, version: 2 }
    delete legacy.calendar
    delete legacy.weather
    expect(parseFullBackup(JSON.stringify(legacy)).calendar).toEqual([])
    for (const bad of [
      { id: '2026-02-30', day: '2026-02-30', outfitId },
      { id: '2020-01-01', day: '2020-01-01', outfitId: 'phantom' },
    ]) {
      expect(() =>
        parseFullBackup(
          JSON.stringify({
            ...json,
            calendar: [
              {
                ...bad,
                status: 'planned',
                note: '',
                createdAt: stamp,
                updatedAt: stamp,
              },
            ],
          }),
        ),
      ).toThrow()
    }
  })
})

describe('Wetterdaten und explizite Netzwerkanfragen', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })
  it('validiert Einheiten, Grenzen, echte Tage und fehlende Messwerte', () => {
    const valid = forecast()
    expect(parseForecast(valid).days[0]).toMatchObject({
      min: 5,
      max: 9,
      rain: 80,
    })
    const invalids = [
      {
        ...valid,
        daily_units: { ...valid.daily_units, temperature_2m_max: '°F' },
      },
      { ...valid, daily: { ...valid.daily, temperature_2m_min: [null] } },
      {
        ...valid,
        daily: { ...valid.daily, precipitation_probability_max: [101] },
      },
      { ...valid, daily: { ...valid.daily, weather_code: [12.5] } },
      forecast('2026-02-30'),
    ]
    for (const data of invalids) expect(() => parseForecast(data)).toThrow()
  })
  it('verwendet nach sechs Stunden oder bei ungültiger Uhrzeit kein Wetter als aktuell', () => {
    const now = Date.parse('2026-10-15T12:00:00Z')
    expect(
      weatherFresh(parseForecast(forecast(), new Date(now).toISOString()), now),
    ).toBe(true)
    expect(
      weatherFresh(
        parseForecast(forecast(), new Date(now - 7 * 3600000).toISOString()),
        now,
      ),
    ).toBe(false)
    expect(
      weatherFresh(
        parseForecast(forecast(), new Date(now + 3600000).toISOString()),
        now,
      ),
    ).toBe(false)
  })
  it('sendet ausschliesslich gerundete Koordinaten ohne Cookies und Referrer', async () => {
    const request = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(forecast())))
    vi.stubGlobal('fetch', request)
    const result = await loadWeather({
      name: 'Testort',
      latitude: 47.3769123,
      longitude: 8.5417821,
    })
    const [url, options] = request.mock.calls[0]
    expect(url.hostname).toBe('api.open-meteo.com')
    expect(url.searchParams.get('latitude')).toBe('47.38')
    expect(url.searchParams.get('longitude')).toBe('8.54')
    expect(options.credentials).toBe('omit')
    expect(options.referrerPolicy).toBe('no-referrer')
    expect(result.location.latitude).toBe(47.38)
  })
  it('behandelt eine leere Ortssuche und Serverfehler ohne erfundene Daten', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', request)
    expect(await searchLocations('Zürich')).toEqual([])
    request.mockResolvedValue(new Response('', { status: 503 }))
    await expect(loadWeather(roundedLocation('Test', 47, 8))).rejects.toThrow(
      '503',
    )
  })
  it('ergänzt bei kühlem Wetter nur eine vorhandene Jacke und erklärt Regen', () => {
    const weather: WeatherDay = {
      day: '2026-10-15',
      min: 5,
      max: 9,
      rain: 80,
      code: 61,
    }
    const result = generateOutfits(
      pieces,
      options,
      DEFAULT_PREFERENCES,
      [],
      0,
      weather,
    )[0]
    expect(result.garmentIds).toContain('piece-3')
    expect(
      result.reasons.some((reason) => reason.includes('Regen ist möglich')),
    ).toBe(true)
    const missing = generateOutfits(
      pieces.slice(0, 3),
      options,
      DEFAULT_PREFERENCES,
      [],
      0,
      weather,
    )[0]
    expect(missing.garmentIds).toHaveLength(3)
    expect(
      missing.reasons.some((reason) => reason.includes('Jacke fehlt')),
    ).toBe(true)
  })
  it('schliesst eindeutig sommerliche Stücke bei Kälte aus und ergänzt bei Hitze keine Jacke', () => {
    const cold = { day: '2026-10-15', min: 3, max: 9, rain: 0, code: 0 }
    const summer = pieces.map((item) =>
      item.category === 'Oberteile'
        ? { ...item, seasons: ['Sommer'] as Garment['seasons'] }
        : item,
    )
    expect(
      generateOutfits(summer, options, DEFAULT_PREFERENCES, [], 0, cold),
    ).toEqual([])
    const hot = { ...cold, min: 20, max: 29 }
    expect(
      generateOutfits(
        pieces,
        { ...options, season: 'Winter' },
        DEFAULT_PREFERENCES,
        [],
        0,
        hot,
      )[0].garmentIds,
    ).not.toContain('piece-3')
  })
})
