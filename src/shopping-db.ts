import { db, updatePreferences } from './db'
import { DEFAULT_PREFERENCES } from './outfit-model'
import {
  parseShoppingPreferences,
  shoppingOptions,
  type ShoppingData,
  type ShoppingPreferences,
} from './shopping-model'
export async function readShoppingData(database = db): Promise<ShoppingData> {
  return database.transaction(
    'r',
    [
      database.garments,
      database.preferences,
      database.feedback,
      database.outfits,
      database.calendar,
    ],
    async () => ({
      garments: await database.garments.toArray(),
      preferences:
        (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
      feedback: await database.feedback.toArray(),
      outfits: await database.outfits.toArray(),
      calendar: await database.calendar.toArray(),
    }),
  )
}
export async function saveShoppingPreferences(
  patch: Partial<Pick<ShoppingPreferences, 'maxPriceCHF' | 'assortment'>>,
  database = db,
) {
  await database.transaction('rw', database.preferences, async () => {
    const current =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    const shopping = parseShoppingPreferences({
      ...shoppingOptions(current),
      ...patch,
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
      ).toISOString(),
    })
    await updatePreferences({ shopping }, database)
  })
}
