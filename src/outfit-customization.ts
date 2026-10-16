import { db } from './db'
import { localDay } from './calendar'
import { eligibleGarments } from './generator'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  outfitKey,
  type OutfitOptions,
  type OutfitFeedback,
  type Preferences,
} from './outfit-model'
import { recentPiecePenalty, type RecentWear } from './wear-history'
import type { Garment } from './model'
import { weatherFresh, type WeatherDay } from './weather'
import { UserFacingError } from './constraints'
import { saveOutfit } from './db'
import { saveCalendarEntry } from './calendar-db'
export function replacementChoices(
  items: Garment[],
  ids: string[],
  targetId: string,
  options: OutfitOptions,
  preferences: Preferences,
  feedback: OutfitFeedback[],
  weather?: WeatherDay,
  history?: RecentWear,
) {
  const target = items.find((item) => item.id === targetId)
  if (!target) return []
  const rejected = new Set(
    feedback
      .filter((item) => item.verdict === 'rejected')
      .map((item) => item.id),
  )
  return eligibleGarments(items, options, weather)
    .filter(
      (item) =>
        item.category === target.category &&
        !ids.includes(item.id) &&
        !rejected.has(
          outfitKey(ids.map((id) => (id === targetId ? item.id : id))),
        ),
    )
    .sort((a, b) => {
      const score = (item: Garment) =>
        (item.favorite ? 2 : 0) +
        (preferences.colors.includes(item.color) ? 2 : 0) +
        (options.style !== 'Alle' && item.styles.includes(options.style)
          ? 2
          : 0) -
        recentPiecePenalty(item.id, history)
      return (
        score(b) - score(a) ||
        a.name.localeCompare(b.name, 'de') ||
        a.id.localeCompare(b.id)
      )
    })
}
export async function swapDailyPiece(
  input: {
    day: string
    ids: string[]
    targetId: string
    replacementId: string
    options: OutfitOptions
    expectedEntry: string | null
    expectedSelection: string | null
  },
  database = db,
): Promise<void> {
  if (input.day !== localDay())
    throw new UserFacingError(
      'Einzelne Teile kannst du im heutigen, noch nicht getragenen Look tauschen.',
    )
  await database.transaction(
    'rw',
    [
      database.garments,
      database.preferences,
      database.calendar,
      database.outfits,
      database.feedback,
      database.weather,
    ],
    async () => {
      const preferences =
        (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
      const entry = await database.calendar.get(input.day)
      if (
        (entry?.updatedAt ?? null) !== input.expectedEntry ||
        entry?.status === 'worn'
      )
        throw new UserFacingError(
          'Der Tag wurde inzwischen geändert. Öffne den Look erneut.',
        )
      const selection =
        preferences.dailySelection?.day === input.day
          ? preferences.dailySelection
          : undefined
      if ((selection?.updatedAt ?? null) !== input.expectedSelection)
        throw new UserFacingError(
          'Deine Tagesauswahl wurde inzwischen geändert. Öffne den Look erneut.',
        )
      if (entry) {
        const original = await database.outfits.get(entry.outfitId)
        if (
          !original ||
          outfitKey(original.garmentIds) !== outfitKey(input.ids)
        )
          throw new UserFacingError('Dieser Look wurde inzwischen geändert.')
      } else if (
        selection &&
        outfitKey(selection.garmentIds) !== outfitKey(input.ids)
      )
        throw new UserFacingError(
          'Deine Tagesauswahl wurde inzwischen geändert.',
        )
      const items = await database.garments.toArray(),
        feedback = await database.feedback.toArray(),
        savedWeather = await database.weather.get('local')
      const weather =
        preferences.useWeather !== false &&
        savedWeather &&
        weatherFresh(savedWeather.report)
          ? savedWeather.report.days.find((item) => item.day === input.day)
          : undefined
      if (
        !replacementChoices(
          items,
          input.ids,
          input.targetId,
          input.options,
          preferences,
          feedback,
          weather,
        ).some((item) => item.id === input.replacementId)
      )
        throw new UserFacingError(
          'Diese Alternative ist nicht mehr verfügbar oder passt nicht zur Auswahl.',
        )
      const ids = input.ids.map((id) =>
        id === input.targetId ? input.replacementId : id,
      )
      const selected = ids.flatMap(
        (id) => items.find((item) => item.id === id) ?? [],
      )
      if (
        !input.ids.includes(input.targetId) ||
        selected.length !== ids.length ||
        !isCompleteOutfit(selected)
      )
        throw new UserFacingError(
          'Ein Stück fehlt oder die Kategorien haben sich geändert.',
        )
      const updatedAt = new Date(
        Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
      ).toISOString()
      if (entry) {
        const outfitId = await saveOutfit(ids, input.options, database)
        await saveCalendarEntry(
          { ...entry, outfitId },
          entry.updatedAt,
          database,
        )
        await database.preferences.put({
          ...preferences,
          dailySelection: undefined,
          updatedAt,
        })
      } else
        await database.preferences.put({
          ...preferences,
          dailySelection: {
            day: input.day,
            garmentIds: ids,
            options: input.options,
            updatedAt,
          },
          updatedAt,
        })
    },
  )
}
