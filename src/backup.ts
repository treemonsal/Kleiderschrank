import { CATEGORIES, COLORS, SEASONS, STYLES, type Garment } from './model'
import { blobToDataURL } from './photos'
import { db, type WardrobeDatabase } from './db'
import { isDay, MAX_CALENDAR_ENTRIES, type CalendarEntry } from './calendar'
import { parseSavedWeather, type WeatherState } from './weather'
import {
  assertWardrobeCapacity,
  MAX_BACKUP_BYTES,
  MAX_OUTFITS,
  UserFacingError,
} from './constraints'
import {
  DEFAULT_PREFERENCES,
  OCCASIONS,
  outfitKey,
  type OutfitOptions,
  type OutfitFeedback,
  type Preferences,
  type SavedOutfit,
} from './outfit-model'

export { MAX_BACKUP_BYTES } from './constraints'
export interface BackupData {
  garments: Garment[]
  outfits: SavedOutfit[]
  feedback: OutfitFeedback[]
  preferences: Preferences | null
  calendar?: CalendarEntry[]
  weather?: WeatherState | null
}
const invalid = () =>
  new Error(
    'Die Datei ist keine gültige MyStyle-Sicherung (Version 1, 2, 3 oder 4). Es wurde nichts verändert.',
  )
export async function createDatabaseBackup(database = db): Promise<string> {
  const data = await database.transaction('r', database.tables, async () => ({
    garments: await database.garments.toArray(),
    outfits: await database.outfits.toArray(),
    feedback: await database.feedback.toArray(),
    preferences: (await database.preferences.get('personal')) ?? null,
    calendar: await database.calendar.toArray(),
    weather: (await database.weather.get('local')) ?? null,
  }))
  return createBackup(data.garments, data)
}
export async function createBackup(
  items: Garment[],
  extra: Omit<BackupData, 'garments'> = {
    outfits: [],
    feedback: [],
    preferences: null,
  },
): Promise<string> {
  if (items.length > 1000)
    throw new Error('Diese Sicherung unterstützt höchstens 1000 Stücke.')
  const garments = []
  for (const item of items)
    garments.push({
      ...item,
      photo: item.photo ? await blobToDataURL(item.photo) : undefined,
      cutout: item.cutout ? await blobToDataURL(item.cutout) : undefined,
    })
  const json = JSON.stringify({
    app: 'MyStyle',
    version: 4,
    exportedAt: new Date().toISOString(),
    ...extra,
    calendar: extra.calendar ?? [],
    weather: extra.weather ?? null,
    garments,
  })
  if (new Blob([json]).size > MAX_BACKUP_BYTES)
    throw new Error(
      'Die Sicherung überschreitet 100 MB. Eine so grosse Mediathek wird in dieser Version noch nicht unterstützt.',
    )
  return json
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw invalid()
  return value
}
function identifier(value: unknown): string {
  const id = text(value, 100)
  if (!/^[A-Za-z0-9_.:-]+$/.test(id)) throw invalid()
  return id
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T))
    throw invalid()
  return value as T
}
function choices<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value) || value.length > allowed.length) throw invalid()
  return [...new Set(value.map((item) => choice(item, allowed)))]
}
function timestamp(value: unknown): string {
  const date = text(value, 40)
  if (!Number.isFinite(Date.parse(date))) throw invalid()
  return new Date(date).toISOString()
}
function photo(value: unknown): Blob | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length > 12 * 1024 * 1024)
    throw invalid()
  const match =
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    )
  if (!match) throw invalid()
  let raw: string
  try {
    raw = atob(match[2])
  } catch {
    throw invalid()
  }
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0))
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
  const webp = raw.startsWith('RIFF') && raw.slice(8, 12) === 'WEBP'
  if (!(
    (match[1] === 'image/jpeg' && jpeg) ||
    (match[1] === 'image/png' && png) ||
    (match[1] === 'image/webp' && webp)
  ))
    throw invalid()
  return new Blob([bytes], { type: match[1] })
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw invalid()
  return value
}
function parseOutfitOptions(value: unknown): OutfitOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid()
  const item = value as Record<string, unknown>
  return {
    occasion: choice(item.occasion, OCCASIONS),
    season: choice(item.season, ['Alle', ...SEASONS]),
    style: choice(item.style, ['Alle', ...STYLES]),
    includeAccessory: boolean(item.includeAccessory),
  }
}
function parseWornColors(
  value: unknown,
  status: unknown,
  count: number,
): string[] {
  if (status !== 'worn' || !Array.isArray(value) || value.length !== count)
    throw invalid()
  return value.map((color) =>
    choice(color, [...COLORS.map((item) => item.name), '']),
  )
}
export function parseBackup(json: string): Garment[] {
  return parseFullBackup(json).garments
}
export function parseFullBackup(json: string): BackupData {
  if (new Blob([json]).size > MAX_BACKUP_BYTES)
    throw new Error('Die Sicherung ist grösser als 100 MB.')
  let data
  try {
    data = JSON.parse(json)
  } catch {
    throw invalid()
  }
  if (
    !data ||
    data.app !== 'MyStyle' ||
    ![1, 2, 3, 4].includes(data.version) ||
    !Array.isArray(data.garments) ||
    data.garments.length > 1000
  )
    throw invalid()
  const ids = new Set<string>()
  const garments: Garment[] = data.garments.map(
    (item: Record<string, unknown>) => {
      if (!item || typeof item !== 'object') throw invalid()
      const id = identifier(item.id)
      const name = text(item.name, 100).trim()
      if (!id || !name || ids.has(id) || typeof item.favorite !== 'boolean')
        throw invalid()
      const original = photo(item.photo)
      const cutout = data.version >= 4 ? photo(item.cutout) : undefined
      if (cutout && (!original || cutout.type !== 'image/png')) throw invalid()
      ids.add(id)
      return {
        id,
        name,
        category: choice(item.category, CATEGORIES),
        color: choice(item.color, [...COLORS.map((c) => c.name), '']),
        brand: text(item.brand, 100),
        seasons: choices(item.seasons, SEASONS),
        styles: choices(item.styles, STYLES),
        notes: text(item.notes, 2000),
        favorite: item.favorite,
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
        photo: original,
        ...(cutout ? { cutout } : {}),
      }
    },
  )
  if (data.version === 1)
    return {
      garments,
      outfits: [],
      feedback: [],
      preferences: null,
      calendar: [],
      weather: null,
    }
  if (
    !Array.isArray(data.outfits) ||
    data.outfits.length > MAX_OUTFITS ||
    !Array.isArray(data.feedback) ||
    data.feedback.length > 1000
  )
    throw invalid()
  const references = (value: unknown): string[] => {
    if (!Array.isArray(value) || value.length < 2 || value.length > 6)
      throw invalid()
    const refs = value.map(identifier)
    if (new Set(refs).size !== refs.length || refs.some((id) => !ids.has(id)))
      throw invalid()
    return refs
  }
  const outfitIds = new Set<string>()
  const outfits: SavedOutfit[] = data.outfits.map((item: SavedOutfit) => {
    if (!item || typeof item !== 'object') throw invalid()
    const id = identifier(item.id),
      name = text(item.name, 100).trim()
    if (!id || !name || outfitIds.has(id) || typeof item.favorite !== 'boolean')
      throw invalid()
    outfitIds.add(id)
    return {
      id,
      name,
      favorite: item.favorite,
      garmentIds: references(item.garmentIds),
      occasion: choice(item.occasion, OCCASIONS),
      season: choice(item.season, ['Alle', ...SEASONS]),
      style: choice(item.style, ['Alle', ...STYLES]),
      createdAt: timestamp(item.createdAt),
      updatedAt: timestamp(item.updatedAt),
    }
  })
  const feedbackIds = new Set<string>()
  const feedback: OutfitFeedback[] = data.feedback.map(
    (item: OutfitFeedback) => {
      if (!item || typeof item !== 'object') throw invalid()
      const garmentIds = references(item.garmentIds),
        id = outfitKey(garmentIds)
      if (item.id !== id || feedbackIds.has(id)) throw invalid()
      feedbackIds.add(id)
      return {
        id,
        garmentIds,
        verdict: choice(item.verdict, ['liked', 'rejected']),
        updatedAt: timestamp(item.updatedAt),
      }
    },
  )
  let preferences: Preferences | null = null
  if (data.preferences !== null) {
    const item = data.preferences
    if (!item || item.id !== 'personal') throw invalid()
    preferences = {
      id: 'personal',
      styles: choices(item.styles, STYLES),
      colors: choices(
        item.colors,
        COLORS.map((c) => c.name),
      ),
      updatedAt: timestamp(item.updatedAt),
      ...(item.outfitOptions === undefined
        ? {}
        : { outfitOptions: parseOutfitOptions(item.outfitOptions) }),
      ...(item.useWeather === undefined
        ? {}
        : { useWeather: boolean(item.useWeather) }),
    }
  }
  const calendar: CalendarEntry[] = []
  let weather: WeatherState | null = null
  if (data.version >= 3) {
    if (
      !Array.isArray(data.calendar) ||
      data.calendar.length > MAX_CALENDAR_ENTRIES
    )
      throw invalid()
    const calendarIds = new Set<string>()
    for (const item of data.calendar) {
      if (
        !item ||
        !isDay(item.day) ||
        item.id !== item.day ||
        calendarIds.has(item.id) ||
        !outfitIds.has(item.outfitId)
      )
        throw invalid()
      calendarIds.add(item.id)
      calendar.push({
        id: item.day,
        day: item.day,
        outfitId: identifier(item.outfitId),
        status: choice(item.status, ['planned', 'worn']),
        ...(item.wornColors === undefined
          ? {}
          : {
              wornColors: parseWornColors(
                item.wornColors,
                item.status,
                outfits.find((outfit) => outfit.id === item.outfitId)!
                  .garmentIds.length,
              ),
            }),
        note: text(item.note, 200),
        createdAt: timestamp(item.createdAt),
        updatedAt: timestamp(item.updatedAt),
      })
    }
    if (data.weather !== null) weather = parseSavedWeather(data.weather)
  }
  return { garments, outfits, feedback, preferences, calendar, weather }
}
export async function importBackup(
  items: Garment[],
  mode: 'merge' | 'replace',
  database: WardrobeDatabase = db,
): Promise<number> {
  return importFullBackup(
    { garments: items, outfits: [], feedback: [], preferences: null },
    mode,
    database,
  )
}
export async function importFullBackup(
  data: BackupData,
  mode: 'merge' | 'replace',
  database = db,
): Promise<number> {
  return database.transaction('rw', database.tables, async () => {
    if (mode === 'replace') {
      await database.garments.clear()
      await database.outfits.clear()
      await database.feedback.clear()
      await database.preferences.clear()
      await database.calendar.clear()
      await database.weather.clear()
    }
    const existingItems = await database.garments.toArray()
    const merged = new Map(existingItems.map((item) => [item.id, item]))
    for (const item of data.garments) {
      const existing = merged.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt)
        merged.set(item.id, item)
    }
    assertWardrobeCapacity([...merged.values()])
    let changed = 0
    for (const item of data.garments) {
      const existing = await database.garments.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt) {
        await database.garments.put(item)
        changed++
      }
    }
    for (const item of data.outfits) {
      const existing = await database.outfits.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt)
        await database.outfits.put(item)
    }
    if ((await database.outfits.count()) > MAX_OUTFITS)
      throw new UserFacingError(
        'Der Import würde die Grenze von 1000 Outfits überschreiten. Es wurde nichts verändert.',
      )
    for (const item of data.feedback) {
      const existing = await database.feedback.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt)
        await database.feedback.put(item)
    }
    const extra = (await database.feedback.count()) - 1000
    if (extra > 0)
      await database.feedback.orderBy('updatedAt').limit(extra).delete()
    const current =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    if (data.preferences && data.preferences.updatedAt > current.updatedAt)
      await database.preferences.put(data.preferences)
    for (const item of data.calendar ?? []) {
      if (!(await database.outfits.get(item.outfitId))) throw invalid()
      const existing = await database.calendar.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt)
        await database.calendar.put(item)
    }
    if ((await database.calendar.count()) > MAX_CALENDAR_ENTRIES)
      throw new UserFacingError(
        'Der Import würde die Kalendergrenze von 3000 Tagen überschreiten. Es wurde nichts verändert.',
      )
    const localWeather = await database.weather.get('local')
    if (
      data.weather &&
      (!localWeather || data.weather.updatedAt > localWeather.updatedAt)
    )
      await database.weather.put(data.weather)
    return changed
  })
}
