import type { Garment } from './model'
import type { CalendarEntry } from './calendar'
import { wornCounts } from './calendar'
import { recentWear } from './wear-history'
import {
  eligibleGarments,
  generateOutfits,
  comfortOffset,
  missingOutfitMessage,
} from './generator'
import {
  DEFAULT_OUTFIT_OPTIONS,
  isCompleteOutfit,
  outfitKey,
  type OutfitFeedback,
  type OutfitOptions,
  type Preferences,
  type SavedOutfit,
} from './outfit-model'
import type { WeatherDay } from './weather'
import { feedbackForOccasion } from './personalization'

export function chooseDailyOutfit(
  items: Garment[],
  preferences: Preferences,
  feedback: OutfitFeedback[],
  outfits: SavedOutfit[],
  calendar: CalendarEntry[],
  day: string,
  weather?: WeatherDay,
) {
  // Season and style had their own pickers before 0.29.0; with those gone,
  // stored values must not keep filtering silently. Occasion and accessory
  // still come from the style check.
  const options: OutfitOptions = {
    ...DEFAULT_OUTFIT_OPTIONS,
    ...preferences.outfitOptions,
    season: 'Alle',
    style: 'Alle',
  }
  if (options.season === 'Alle' && !weather) {
    const month = Number(day.slice(5, 7))
    options.season =
      month >= 3 && month <= 5
        ? 'Frühling'
        : month >= 6 && month <= 8
          ? 'Sommer'
          : month >= 9 && month <= 11
            ? 'Herbst'
            : 'Winter'
  }
  const plannedEntry = calendar.find((entry) => entry.day === day)
  const planned = outfits.find((outfit) => outfit.id === plannedEntry?.outfitId)
  if (planned) {
    const pieces = planned.garmentIds.flatMap(
      (id) => items.find((item) => item.id === id) ?? [],
    )
    if (pieces.length === planned.garmentIds.length && isCompleteOutfit(pieces))
      return {
        garmentIds: planned.garmentIds,
        name: planned.name,
        planned: true,
        options: {
          occasion: plannedEntry?.occasion ?? planned.occasion,
          season: planned.season,
          style: planned.style,
          includeAccessory: pieces.some(
            (item) => item.category === 'Accessoires',
          ),
        },
        reasons: ['Diesen Look hast du für heute im Journal eingetragen.'],
      }
  }
  const selection = preferences.dailySelection
  if (selection?.day === day) {
    const eligible = eligibleGarments(items, selection.options, weather)
    const selected = selection.garmentIds.flatMap(
      (id) => eligible.find((item) => item.id === id) ?? [],
    )
    if (
      selected.length === selection.garmentIds.length &&
      isCompleteOutfit(selected) &&
      !feedbackForOccasion(feedback, selection.options.occasion).some(
        (entry) =>
          outfitKey(entry.garmentIds) === outfitKey(selection.garmentIds) &&
          entry.verdict === 'rejected',
      )
    )
      return {
        garmentIds: selection.garmentIds,
        name: 'Dein Look für heute',
        planned: false,
        customized: true,
        options: selection.options,
        reasons: ['Deine persönliche Auswahl für heute bleibt gespeichert.'],
        missing: undefined,
      }
  }
  // Stable on the same local day for the same wardrobe and preferences.
  const seed = Number(day.replaceAll('-', ''))
  const candidate = generateOutfits(
    items,
    options,
    preferences,
    feedback,
    seed,
    weather,
    wornCounts(calendar, outfits, day),
    recentWear(calendar, outfits, day),
  )[0]
  return {
    garmentIds: candidate?.garmentIds ?? [],
    name: 'Dein Look für heute',
    planned: false,
    options,
    reasons: candidate?.reasons ?? [],
    missing: candidate
      ? undefined
      : missingOutfitMessage(
          items,
          options,
          weather,
          comfortOffset(preferences.comfort),
        ),
  }
}
