import type { Garment } from './model'
import type {
  OutfitFeedback,
  OutfitOptions,
  Preferences,
  SavedOutfit,
} from './outfit-model'
import { DEFAULT_PREFERENCES, outfitKey } from './outfit-model'
import { db, saveOutfit } from './db'
import { localDay, wornCounts, type CalendarEntry } from './calendar'
import { saveCalendarEntry } from './calendar-db'
import { chooseDailyOutfit } from './daily-outfit'
import { generateOutfits } from './generator'
import { UserFacingError } from './constraints'
import { recentWear } from './wear-history'
import { weatherFresh, type WeatherDay } from './weather'
import type { OutfitRefinement } from './refinement-model'

export function refinementChoices(
  items: Garment[],
  options: OutfitOptions,
  preferences: Preferences,
  feedback: OutfitFeedback[],
  request: OutfitRefinement,
  outfits: SavedOutfit[],
  calendar: CalendarEntry[],
  day: string,
  weather?: WeatherDay,
) {
  return generateOutfits(
    items,
    options,
    preferences,
    feedback,
    0,
    weather,
    wornCounts(calendar, outfits, day),
    recentWear(calendar, outfits, day),
    new Set(),
    request,
  )
}

export async function applyDailyRefinement(
  input: {
    day: string
    options: OutfitOptions
    expectedPreferences: string
    expectedEntry: string | null
    expectedSelection: string | null
    request: OutfitRefinement
    garmentIds: string[]
    versions: { id: string; updatedAt: string }[]
  },
  database = db,
) {
  await database.transaction('rw', database.tables, async () => {
    const conflict = () =>
      new UserFacingError(
        'Dein Tag oder dein Kleiderschrank wurde inzwischen geändert. Öffne die Anpassung erneut.',
      )
    const entry = await database.calendar.get(input.day)
    const preferences =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    if (
      input.day !== localDay() ||
      entry?.status === 'worn' ||
      (entry?.updatedAt ?? null) !== input.expectedEntry ||
      preferences.updatedAt !== input.expectedPreferences ||
      (preferences.dailySelection?.day === input.day
        ? preferences.dailySelection.updatedAt
        : null) !== input.expectedSelection
    )
      throw conflict()
    const items = await database.garments.toArray(),
      feedback = await database.feedback.toArray(),
      outfits = await database.outfits.toArray(),
      calendar = await database.calendar.toArray(),
      savedWeather = await database.weather.get('local')
    const weather =
      preferences.useWeather !== false &&
      savedWeather &&
      weatherFresh(savedWeather.report)
        ? savedWeather.report.days.find((day) => day.day === input.day)
        : undefined
    const current = chooseDailyOutfit(
      items,
      preferences,
      feedback,
      outfits,
      calendar,
      input.day,
      weather,
    )
    if (
      Object.keys(current.options).some(
        (key) =>
          current.options[key as keyof OutfitOptions] !==
          input.options[key as keyof OutfitOptions],
      ) ||
      outfitKey(current.garmentIds) !== outfitKey(input.request.currentIds) ||
      [...input.request.currentIds, ...input.garmentIds].some(
        (id) =>
          !items.some(
            (item) =>
              item.id === id &&
              input.versions.some(
                (version) =>
                  version.id === id && version.updatedAt === item.updatedAt,
              ),
          ),
      )
    )
      throw conflict()
    const candidate = refinementChoices(
      items,
      current.options,
      preferences,
      feedback,
      input.request,
      outfits,
      calendar,
      input.day,
      weather,
    ).find((item) => item.key === outfitKey(input.garmentIds))
    if (!candidate) throw conflict()
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
    ).toISOString()
    if (entry) {
      const outfitId = await saveOutfit(
        candidate.garmentIds,
        current.options,
        database,
      )
      await saveCalendarEntry({ ...entry, outfitId }, entry.updatedAt, database)
    }
    await database.preferences.put({
      ...preferences,
      updatedAt,
      dailySelection: entry
        ? undefined
        : {
            day: input.day,
            garmentIds: candidate.garmentIds,
            options: current.options,
            updatedAt,
          },
    })
  })
}
