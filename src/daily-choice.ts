import { db } from './db'
import { localDay, wornCounts } from './calendar'
import { chooseDailyOutfit } from './daily-outfit'
import { eligibleGarments, generateOutfits } from './generator'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  outfitKey,
  type OutfitOptions,
} from './outfit-model'
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

export async function applyStylistLook(
  input: {
    day: string
    expectedIds: string[]
    expectedSelection: string | null
    expectedPreferences: string
    garmentIds: string[]
    versions: { id: string; updatedAt: string }[]
    options: OutfitOptions
  },
  database = db,
): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    const conflict = () =>
      new UserFacingError(
        'Dein Tag oder dein Kleiderschrank wurde inzwischen geändert. Lass den aktuellen Look erneut prüfen.',
      )
    if (input.day !== localDay() || (await database.calendar.get(input.day)))
      throw conflict()
    const preferences =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    if (
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
      outfitKey(current.garmentIds) !== outfitKey(input.expectedIds) ||
      Object.keys(current.options).some(
        (key) =>
          current.options[key as keyof OutfitOptions] !==
          input.options[key as keyof OutfitOptions],
      )
    )
      throw conflict()
    const eligible = eligibleGarments(items, input.options, weather)
    const pieces = input.garmentIds.flatMap(
      (id) => eligible.find((item) => item.id === id) ?? [],
    )
    if (
      pieces.length !== input.garmentIds.length ||
      !isCompleteOutfit(pieces) ||
      pieces.some(
        (item) =>
          !input.versions.some(
            (version) =>
              version.id === item.id && version.updatedAt === item.updatedAt,
          ),
      ) ||
      feedback.some(
        (item) =>
          item.id === outfitKey(input.garmentIds) &&
          item.verdict === 'rejected',
      )
    )
      throw conflict()
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
    ).toISOString()
    await database.preferences.put({
      ...preferences,
      dailySelection: {
        day: input.day,
        garmentIds: [...input.garmentIds],
        options: input.options,
        updatedAt,
      },
      updatedAt,
    })
  })
}
