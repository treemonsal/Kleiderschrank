import { db } from './db'
import { localDay, wornCounts } from './calendar'
import { chooseDailyOutfit } from './daily-outfit'
import { generateOutfits } from './generator'
import { DEFAULT_PREFERENCES, outfitKey } from './outfit-model'
import { recentWear } from './wear-history'
import { weatherFresh } from './weather'
import { UserFacingError } from './constraints'

export async function anotherDailyLook(
  input: {
    day: string
    expectedIds: string[]
    expectedSelection: string | null
  },
  database = db,
): Promise<boolean> {
  return database.transaction('rw', database.tables, async () => {
    if (input.day !== localDay() || (await database.calendar.get(input.day)))
      throw new UserFacingError(
        'Dieser Tag ist bereits geplant, bestätigt oder nicht mehr heute. Öffne ihn erneut.',
      )
    const preferences =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    const selection =
      preferences.dailySelection?.day === input.day
        ? preferences.dailySelection
        : undefined
    if ((selection?.updatedAt ?? null) !== input.expectedSelection)
      throw new UserFacingError(
        'Deine Tagesauswahl wurde inzwischen geändert. Öffne den Look erneut.',
      )
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
    if (outfitKey(current.garmentIds) !== outfitKey(input.expectedIds))
      throw new UserFacingError(
        'Dein Bestand oder deine Auswahl hat sich geändert. Prüfe den aktuellen Look.',
      )
    const candidate = generateOutfits(
      items,
      current.options,
      preferences,
      feedback,
      Date.now() | 0,
      weather,
      wornCounts(calendar, outfits, input.day),
      recentWear(calendar, outfits, input.day),
      new Set([outfitKey(input.expectedIds)]),
    )[0]
    if (!candidate) return false
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
    ).toISOString()
    await database.preferences.put({
      ...preferences,
      dailySelection: {
        day: input.day,
        garmentIds: candidate.garmentIds,
        options: current.options,
        updatedAt,
      },
      updatedAt,
    })
    return true
  })
}
