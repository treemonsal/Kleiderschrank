import { db } from './db'
import { localDay } from './calendar'
import { eligibleGarments } from './generator'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  type OutfitOptions,
} from './outfit-model'
import { weatherFresh } from './weather'
import { UserFacingError } from './constraints'

/**
 * „Für heute“ from Looks: makes a saved or generated look today's selection.
 * Refused when today is already in the journal or a piece changed, went to
 * the laundry, disappeared or no longer suits today's saved weather.
 */
export async function chooseLookForToday(
  input: {
    garmentIds: string[]
    options: OutfitOptions
    versions: { id: string; updatedAt: string }[]
  },
  database = db,
): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    const day = localDay()
    if (await database.calendar.get(day))
      throw new UserFacingError(
        'Für heute ist schon ein Look im Journal eingetragen.',
      )
    const preferences =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    const items = await database.garments.toArray(),
      savedWeather = await database.weather.get('local')
    const weather =
      preferences.useWeather !== false &&
      savedWeather &&
      weatherFresh(savedWeather.report)
        ? savedWeather.report.days.find((entry) => entry.day === day)
        : undefined
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
      )
    )
      throw new UserFacingError(
        'Ein Teil dieses Looks liegt in der Wäsche, fehlt oder passt nicht zum heutigen Wetter.',
      )
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
    ).toISOString()
    await database.preferences.put({
      ...preferences,
      dailySelection: {
        day,
        garmentIds: [...input.garmentIds],
        options: input.options,
        updatedAt,
      },
      updatedAt,
    })
  })
}
