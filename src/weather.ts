import { isDay } from './calendar'

export interface WeatherLocation {
  name: string
  latitude: number
  longitude: number
}
export interface WeatherDay {
  day: string
  min: number
  max: number
  rain: number
  code: number
}
export interface WeatherReport {
  fetchedAt: string
  timezone: string
  days: WeatherDay[]
}
export interface WeatherState {
  id: 'local'
  location: WeatherLocation
  report: WeatherReport
  updatedAt: string
}
export const WEATHER_MAX_AGE = 6 * 60 * 60 * 1000
export function roundedLocation(
  name: string,
  latitude: number,
  longitude: number,
): WeatherLocation {
  if (
    !name.trim() ||
    name.length > 160 ||
    !Number.isFinite(latitude) ||
    Math.abs(latitude) > 90 ||
    !Number.isFinite(longitude) ||
    Math.abs(longitude) > 180
  )
    throw new Error('Die Ortsangaben sind ungültig.')
  return {
    name: name.trim(),
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  }
}
export function weatherFresh(report: WeatherReport, now = Date.now()): boolean {
  const age = now - Date.parse(report.fetchedAt)
  return Number.isFinite(age) && age >= -5 * 60 * 1000 && age <= WEATHER_MAX_AGE
}
export function weatherLabel(code: number): string {
  if (code === 0) return 'Klar'
  if (code <= 3) return 'Teilweise bewölkt'
  if (code <= 48) return 'Neblig'
  if (code <= 67) return 'Regen'
  if (code <= 77) return 'Schnee'
  if (code <= 82) return 'Regenschauer'
  if (code <= 86) return 'Schneeschauer'
  return 'Gewitter möglich'
}
async function jsonRequest(url: URL, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = globalThis.setTimeout(abort, 12000)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    })
    if (!response.ok)
      throw new Error(
        `Der Wetterdienst antwortet mit Fehler ${response.status}. Bitte versuche es später erneut.`,
      )
    return await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    if (error instanceof Error && error.message.startsWith('Der Wetterdienst'))
      throw error
    throw new Error(
      'Der Wetterdienst ist nicht erreichbar. Prüfe deine Verbindung und versuche es erneut. Gespeichertes Wetter bleibt verfügbar.',
    )
  } finally {
    globalThis.clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Der Wetterdienst hat unvollständige Daten geliefert.')
  return value as Record<string, unknown>
}
export async function searchLocations(
  query: string,
  signal?: AbortSignal,
): Promise<WeatherLocation[]> {
  const search = query.trim()
  if (search.length < 2 || search.length > 100)
    throw new Error('Bitte gib einen Ortsnamen mit 2 bis 100 Zeichen ein.')
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.search = new URLSearchParams({
    name: search,
    count: '5',
    language: 'de',
    format: 'json',
  }).toString()
  const data = record(await jsonRequest(url, signal))
  if (data.results === undefined) return []
  if (!Array.isArray(data.results) || data.results.length > 5)
    throw new Error('Die Ortssuche hat ungültige Daten geliefert.')
  return data.results.map((item) => {
    const place = record(item)
    if (
      typeof place.name !== 'string' ||
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    )
      throw new Error('Die Ortssuche hat ungültige Daten geliefert.')
    const label = [place.name, place.admin1, place.country]
      .filter((value) => typeof value === 'string')
      .join(', ')
    return roundedLocation(label, place.latitude, place.longitude)
  })
}
export function parseForecast(
  value: unknown,
  fetchedAt = new Date().toISOString(),
): WeatherReport {
  const data = record(value),
    daily = record(data.daily),
    units = record(data.daily_units)
  if (
    units.temperature_2m_min !== '°C' ||
    units.temperature_2m_max !== '°C' ||
    units.precipitation_probability_max !== '%'
  )
    throw new Error('Der Wetterdienst hat unerwartete Einheiten geliefert.')
  if (typeof data.timezone !== 'string' || data.timezone.length > 80)
    throw new Error('Die Wetter-Zeitzone fehlt.')
  try {
    new Intl.DateTimeFormat('de', { timeZone: data.timezone })
  } catch {
    throw new Error('Die Wetter-Zeitzone ist ungültig.')
  }
  const times = daily.time
  if (!Array.isArray(times) || times.length < 1 || times.length > 7)
    throw new Error('Die Wettertage fehlen.')
  const numeric = (
    key: string,
    index: number,
    min: number,
    max: number,
  ): number => {
    const values = daily[key]
    if (
      !Array.isArray(values) ||
      values.length !== times.length ||
      typeof values[index] !== 'number' ||
      !Number.isFinite(values[index]) ||
      values[index] < min ||
      values[index] > max
    )
      throw new Error('Die Wettervorhersage ist unvollständig.')
    return values[index]
  }
  const days = times.map((day, index) => {
    if (!isDay(day) || (index > 0 && day <= times[index - 1]))
      throw new Error('Die Wettertage sind ungültig.')
    const min = numeric('temperature_2m_min', index, -100, 70),
      max = numeric('temperature_2m_max', index, -100, 70)
    if (min > max) throw new Error('Die Temperaturwerte sind ungültig.')
    const code = numeric('weather_code', index, 0, 99)
    if (
      ![
        0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75,
        77, 80, 81, 82, 85, 86, 95, 96, 99,
      ].includes(code)
    )
      throw new Error('Der Wetterzustand ist ungültig.')
    return {
      day,
      min,
      max,
      rain: numeric('precipitation_probability_max', index, 0, 100),
      code,
    }
  })
  return { fetchedAt, timezone: data.timezone, days }
}
export async function loadWeather(
  location: WeatherLocation,
  signal?: AbortSignal,
): Promise<WeatherState> {
  const coarse = roundedLocation(
    location.name,
    location.latitude,
    location.longitude,
  )
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.search = new URLSearchParams({
    latitude: String(coarse.latitude),
    longitude: String(coarse.longitude),
    daily:
      'temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code',
    timezone: 'auto',
    forecast_days: '7',
    temperature_unit: 'celsius',
  }).toString()
  const report = parseForecast(await jsonRequest(url, signal))
  return { id: 'local', location: coarse, report, updatedAt: report.fetchedAt }
}
export function parseSavedWeather(value: unknown): WeatherState {
  const state = record(value),
    location = record(state.location),
    report = record(state.report)
  if (
    state.id !== 'local' ||
    typeof location.name !== 'string' ||
    typeof location.latitude !== 'number' ||
    typeof location.longitude !== 'number' ||
    !Array.isArray(report.days) ||
    report.days.length > 7
  )
    throw new Error('Die Wetterdaten in der Sicherung sind ungültig.')
  if (
    typeof report.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(report.fetchedAt)) ||
    typeof state.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(state.updatedAt))
  )
    throw new Error('Die Wetterzeitpunkte in der Sicherung sind ungültig.')
  const days = report.days.map(record)
  const parsed = parseForecast(
    {
      timezone: report.timezone,
      daily_units: {
        temperature_2m_min: '°C',
        temperature_2m_max: '°C',
        precipitation_probability_max: '%',
      },
      daily: {
        time: days.map((day) => day.day),
        temperature_2m_min: days.map((day) => day.min),
        temperature_2m_max: days.map((day) => day.max),
        precipitation_probability_max: days.map((day) => day.rain),
        weather_code: days.map((day) => day.code),
      },
    },
    new Date(report.fetchedAt).toISOString(),
  )
  return {
    id: 'local',
    location: roundedLocation(
      location.name,
      location.latitude,
      location.longitude,
    ),
    report: parsed,
    updatedAt: new Date(state.updatedAt).toISOString(),
  }
}
