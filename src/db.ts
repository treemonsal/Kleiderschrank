import { isWarmth } from './warmth'
import Dexie, { type Table } from 'dexie'
import { parseStyleProfile } from './personalization'
import { cleanSecondaryColors, COLORS, STYLES } from './model'
import type { Garment, GarmentDraft } from './model'
import { lookTitle } from './swatch'
import type { SyncBase } from './sync-model'
import type { CalendarEntry } from './calendar'
import type { WeatherState } from './weather'
import type { ChatSession } from './chat-model'
import {
  assertWardrobeCapacity,
  MAX_OUTFITS,
  UserFacingError,
} from './constraints'
import {
  DEFAULT_PREFERENCES,
  OCCASIONS,
  DEFAULT_OUTFIT_OPTIONS,
  feedbackKey,
  isCompleteOutfit,
  outfitKey,
  type OutfitFeedback,
  type OutfitOptions,
  type Preferences,
  type SavedOutfit,
  type StyleProfile,
} from './outfit-model'

export interface SyncState {
  /** Google account id („sub“). */
  id: string
  base: SyncBase
  lastSyncedAt: string
}

export class WardrobeDatabase extends Dexie {
  garments!: Table<Garment, string>
  outfits!: Table<SavedOutfit, string>
  feedback!: Table<OutfitFeedback, string>
  preferences!: Table<Preferences, string>
  calendar!: Table<CalendarEntry, string>
  weather!: Table<WeatherState, string>
  chat!: Table<ChatSession, string>
  /** Device-local sync bookkeeping per Google account; never backed up. */
  syncState!: Table<SyncState, string>
  constructor(name = 'mystyle-private-wardrobe') {
    super(name)
    this.version(1).stores({ garments: 'id, category, updatedAt' })
    this.version(2).stores({
      outfits: 'id, updatedAt, *garmentIds',
      feedback: 'id, updatedAt, *garmentIds',
      preferences: 'id',
    })
    this.version(3).stores({
      calendar: 'id, day, outfitId, status, updatedAt',
      weather: 'id',
    })
    this.version(4).stores({ garments: 'id, category, updatedAt' })
    this.version(5).stores({ chat: 'id, updatedAt' })
    this.version(6).stores({ syncState: 'id' })
    // Ratings are kept per occasion: re-key those that name one.
    this.version(7)
      .stores({ feedback: 'id, updatedAt, *garmentIds' })
      .upgrade(async (transaction) => {
        const table = transaction.table<OutfitFeedback, string>('feedback')
        for (const entry of await table.toArray()) {
          const id = feedbackKey(entry.garmentIds, entry.occasion)
          if (id === entry.id) continue
          await table.delete(entry.id)
          await table.put({ ...entry, id })
        }
      })
  }
}
export async function deleteGarment(id: string, database = db): Promise<void> {
  await database.transaction(
    'rw',
    [
      database.garments,
      database.outfits,
      database.feedback,
      database.calendar,
      database.preferences,
      database.chat,
    ],
    async () => {
      const ids = await database.outfits
        .where('garmentIds')
        .equals(id)
        .primaryKeys()
      if (ids.length)
        await database.calendar.where('outfitId').anyOf(ids).delete()
      await database.outfits.where('garmentIds').equals(id).delete()
      await database.feedback.where('garmentIds').equals(id).delete()
      await database.garments.delete(id)
      const chat = await database.chat.get('stylist')
      if (
        chat?.messages.some((message) => message.look?.garmentIds.includes(id))
      )
        await database.chat.put({
          ...chat,
          revision: crypto.randomUUID(),
          updatedAt: new Date(
            Math.max(Date.now(), Date.parse(chat.updatedAt) + 1),
          ).toISOString(),
          messages: chat.messages.map((message) =>
            message.look?.garmentIds.includes(id)
              ? { ...message, look: undefined }
              : message,
          ),
        })
      const preferences = await database.preferences.get('personal')
      if (preferences?.dailySelection?.garmentIds.includes(id))
        await database.preferences.put({
          ...preferences,
          dailySelection: undefined,
          updatedAt: new Date(
            Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
          ).toISOString(),
        })
    },
  )
}
export async function saveOutfit(
  ids: string[],
  options: OutfitOptions,
  database = db,
): Promise<string> {
  return database.transaction(
    'rw',
    database.garments,
    database.outfits,
    async () => {
      const garments = await database.garments.bulkGet(ids)
      if (
        ids.length < 2 ||
        ids.length > 6 ||
        new Set(ids).size !== ids.length ||
        garments.some((item) => !item)
      )
        throw new UserFacingError(
          'Ein Stück ist nicht mehr vorhanden. Bitte erstelle neue Vorschläge.',
        )
      if (!isCompleteOutfit(garments as Garment[]))
        throw new UserFacingError(
          'Die Kategorien haben sich geändert. Bitte erstelle neue Vorschläge.',
        )
      const same = (await database.outfits.toArray()).find(
        (item) => outfitKey(item.garmentIds) === outfitKey(ids),
      )
      if (same) return same.id
      if ((await database.outfits.count()) >= MAX_OUTFITS)
        throw new UserFacingError(
          'Du kannst bis zu 1000 Outfits speichern. Bitte entferne zuerst eines.',
        )
      const now = new Date().toISOString(),
        id = crypto.randomUUID()
      await database.outfits.put({
        id,
        name: lookTitle(garments as Garment[], `${options.occasion}-Look`),
        garmentIds: [...ids],
        occasion: options.occasion,
        season: options.season,
        style: options.style,
        favorite: false,
        createdAt: now,
        updatedAt: now,
      })
      return id
    },
  )
}
export async function setOutfitFeedback(
  ids: string[],
  verdict: OutfitFeedback['verdict'],
  database = db,
  context: Pick<OutfitFeedback, 'reason' | 'occasion'> = {},
): Promise<void> {
  await database.transaction(
    'rw',
    database.garments,
    database.feedback,
    async () => {
      if (
        ids.length < 2 ||
        ids.length > 6 ||
        new Set(ids).size !== ids.length ||
        (await database.garments.bulkGet(ids)).some((item) => !item)
      )
        throw new UserFacingError(
          'Ein Stück wurde entfernt. Bitte erstelle neue Vorschläge.',
        )
      if (
        (context.occasion && !OCCASIONS.includes(context.occasion)) ||
        (context.reason &&
          !['combination', 'colors', 'style', 'occasion', 'bold'].includes(
            context.reason,
          ))
      )
        throw new UserFacingError('Diese Bewertung ist ungültig.')
      const id = feedbackKey(ids, context.occasion)
      const previous = await database.feedback.get(id)
      await database.feedback.put({
        id,
        garmentIds: [...ids],
        verdict,
        updatedAt: new Date(
          Math.max(Date.now(), Date.parse(previous?.updatedAt ?? '') + 1 || 0),
        ).toISOString(),
        ...(context.occasion ? { occasion: context.occasion } : {}),
        ...(verdict === 'rejected' && context.reason
          ? { reason: context.reason }
          : {}),
      })
      const extra = (await database.feedback.count()) - 1000
      if (extra > 0)
        await database.feedback.orderBy('updatedAt').limit(extra).delete()
    },
  )
}
export async function toggleOutfitLike(
  ids: string[],
  database = db,
  occasion?: OutfitFeedback['occasion'],
): Promise<boolean> {
  return database.transaction(
    'rw',
    database.garments,
    database.feedback,
    async () => {
      const key = feedbackKey(ids, occasion),
        current = await database.feedback.get(key)
      if (current?.verdict === 'liked') {
        await database.feedback.delete(key)
        return false
      }
      // An older rating without occasion counts everywhere; taking back the
      // like it shows removes it.
      const general = occasion
        ? await database.feedback.get(outfitKey(ids))
        : undefined
      if (!current && general?.verdict === 'liked' && !general.occasion) {
        await database.feedback.delete(general.id)
        return false
      }
      await setOutfitFeedback(ids, 'liked', database, { occasion })
      return true
    },
  )
}
export async function updateOutfit(
  id: string,
  patch: { name: string; expectedUpdatedAt: string } | { favorite: boolean },
  database = db,
): Promise<void> {
  await database.transaction('rw', database.outfits, async () => {
    const existing = await database.outfits.get(id)
    if (!existing)
      throw new UserFacingError('Dieses Outfit wurde bereits entfernt.')
    if ('name' in patch && existing.updatedAt !== patch.expectedUpdatedAt)
      throw new UserFacingError(
        'Dieses Outfit wurde inzwischen geändert. Deine Eingabe bleibt hier sichtbar. Öffne den Look erneut, damit keine neueren Angaben überschrieben werden.',
      )
    const name = ('name' in patch ? patch.name : existing.name).trim()
    if (!name || name.length > 100)
      throw new UserFacingError(
        'Bitte gib einen Outfit-Namen mit höchstens 100 Zeichen ein.',
      )
    await database.outfits.update(id, {
      name,
      favorite: 'favorite' in patch ? patch.favorite : existing.favorite,
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(existing.updatedAt) + 1),
      ).toISOString(),
    })
  })
}
export async function savePreferences(
  styles: Preferences['styles'],
  colors: string[],
  database = db,
  expectedRevision?: string,
): Promise<void> {
  await database.transaction('rw', database.preferences, async () => {
    const current = await database.preferences.get('personal')
    if (
      expectedRevision !== undefined &&
      styleProfileRevision(current ?? DEFAULT_PREFERENCES) !== expectedRevision
    )
      throw new UserFacingError(
        'Deine Stilvorlieben wurden inzwischen geändert. Deine Auswahl bleibt hier erhalten. Schliesse das Fenster und öffne es erneut, damit keine neueren Angaben überschrieben werden.',
      )
    await updatePreferences(
      {
        styles: [...styles],
        colors: [...colors],
        ...(current?.styleProfile
          ? {
              styleProfile: {
                ...current.styleProfile,
                avoidColors: current.styleProfile.avoidColors.filter(
                  (color) => !colors.includes(color),
                ),
              },
            }
          : {}),
      },
      database,
    )
  })
}
export async function updatePreferences(
  patch: Partial<
    Pick<
      Preferences,
      | 'styles'
      | 'colors'
      | 'useWeather'
      | 'autoLaundry'
      | 'comfort'
      | 'backupReminder'
      | 'styleProfile'
      | 'shopping'
    >
  >,
  database = db,
): Promise<void> {
  await database.transaction('rw', database.preferences, async () => {
    const current =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    await database.preferences.put({
      ...current,
      ...patch,
      ...('styles' in patch || 'colors' in patch || 'styleProfile' in patch
        ? { dailySelection: undefined }
        : {}),
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
      ).toISOString(),
    })
  })
}
export async function saveOutfitOptions(
  patch: Partial<OutfitOptions>,
  database = db,
): Promise<void> {
  await database.transaction('rw', database.preferences, async () => {
    const current =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    await database.preferences.put({
      ...current,
      dailySelection: undefined,
      outfitOptions: {
        ...DEFAULT_OUTFIT_OPTIONS,
        ...current.outfitOptions,
        ...patch,
      },
      updatedAt: new Date(
        Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
      ).toISOString(),
    })
  })
}

export function styleProfileRevision(preferences: Preferences) {
  return JSON.stringify([
    preferences.styles,
    preferences.colors,
    preferences.styleProfile ?? null,
  ])
}
export async function saveStyleProfile(
  profile: StyleProfile,
  styles: Preferences['styles'],
  colors: string[],
  expectedRevision: string,
  database = db,
) {
  const parsed = parseStyleProfile(profile)
  if (
    styles.some((style) => !STYLES.includes(style)) ||
    colors.some((color) => !COLORS.some((c) => c.name === color)) ||
    colors.some((color) => parsed.avoidColors.includes(color))
  )
    throw new UserFacingError('Bitte prüfe deine Stilrichtungen und Farben.')
  await database.transaction('rw', database.preferences, async () => {
    const current =
      (await database.preferences.get('personal')) ?? DEFAULT_PREFERENCES
    if (styleProfileRevision(current) !== expectedRevision)
      throw new UserFacingError(
        'Dein Stilprofil wurde inzwischen geändert. Schliesse den Stilcheck und öffne ihn erneut.',
      )
    const updatedAt = new Date(
      Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
    ).toISOString()
    await database.preferences.put(
      parsed.status === 'skipped'
        ? {
            ...current,
            styleProfile: {
              ...(current.styleProfile ?? parsed),
              status: 'skipped',
            },
            updatedAt,
          }
        : {
            ...current,
            styles: [...new Set(styles)],
            colors: [...new Set(colors)],
            styleProfile: parsed,
            dailySelection: undefined,
            outfitOptions: {
              ...DEFAULT_OUTFIT_OPTIONS,
              ...current.outfitOptions,
              occasion: parsed.usualOccasion,
            },
            updatedAt,
          },
    )
  })
}

export async function removeOutfitFeedback(
  id: string,
  expectedUpdatedAt: string,
  database = db,
) {
  await database.transaction('rw', database.feedback, async () => {
    const current = await database.feedback.get(id)
    if (current && current.updatedAt !== expectedUpdatedAt)
      throw new UserFacingError(
        'Diese Bewertung wurde inzwischen geändert. Prüfe die aktuelle Rückmeldung.',
      )
    await database.feedback.delete(id)
  })
}

export const db = new WardrobeDatabase()
export async function saveGarment(
  draft: GarmentDraft,
  existing?: Garment,
  database = db,
): Promise<string> {
  const now = new Date(
    Math.max(Date.now(), Date.parse(existing?.updatedAt ?? '') + 1 || 0),
  ).toISOString()
  const garment: Garment = {
    ...draft,
    name: draft.name.trim(),
    brand: draft.brand.trim(),
    notes: draft.notes.trim(),
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  if (!isWarmth(garment.warmth)) delete garment.warmth
  const secondary = cleanSecondaryColors(draft.secondaryColors, draft.color)
  if (secondary.length) garment.secondaryColors = secondary
  else delete garment.secondaryColors
  if (!garment.name || garment.name.length > 100)
    throw new Error('Bitte gib einen Namen mit höchstens 100 Zeichen ein.')
  await database.transaction(
    'rw',
    [database.garments, database.preferences],
    async () => {
      const current = await database.garments.get(garment.id)
      if (existing && !current)
        throw new UserFacingError(
          'Dieses Stück wurde inzwischen gelöscht. Deine Eingaben bleiben hier sichtbar; schliesse den Dialog und lege es bei Bedarf neu an.',
        )
      if (existing && current?.updatedAt !== existing.updatedAt)
        throw new UserFacingError(
          'Dieses Stück wurde inzwischen in einer anderen Ansicht geändert. Kopiere deine Eingaben und öffne es erneut, damit keine neueren Angaben verloren gehen.',
        )
      const items = await database.garments.toArray()
      assertWardrobeCapacity([
        ...items.filter((item) => item.id !== garment.id),
        garment,
      ])
      await database.garments.put(garment)
      const preferences = await database.preferences.get('personal')
      if (
        garment.inLaundry &&
        preferences?.dailySelection?.garmentIds.includes(garment.id)
      )
        await database.preferences.put({
          ...preferences,
          dailySelection: undefined,
          updatedAt: new Date(
            Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
          ).toISOString(),
        })
    },
  )
  return garment.id
}
export async function toggleFavorite(
  item: Garment,
  database = db,
): Promise<void> {
  await database.transaction('rw', database.garments, async () => {
    const current = await database.garments.get(item.id)
    if (current)
      await database.garments.update(item.id, {
        favorite: !current.favorite,
        updatedAt: new Date(
          Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
        ).toISOString(),
      })
  })
}
export function storageError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message
  if (error instanceof Error && /quota/i.test(error.name + error.message)) {
    return 'Der Gerätespeicher ist voll. Sichere deine Daten und schaffe Platz, bevor du es erneut versuchst.'
  }
  // Safari keeps no photos in IndexedDB while browsing privately.
  const inner = (error as { inner?: unknown } | null)?.inner
  if (
    [error, inner].some(
      (item) => item instanceof Error && /blob/i.test(item.message),
    )
  ) {
    return 'Im privaten Surfen kann Safari keine Fotos speichern. Öffne MyStyle in einem normalen Tab oder vom Home-Bildschirm.'
  }
  return 'Die Daten konnten nicht lokal gespeichert werden. Bitte versuche es erneut. Prüfe, ob dein Browser lokale Speicherung erlaubt.'
}

/**
 * Sorts a piece out (or brings it back). It leaves suggestions and the
 * wardrobe list; worn days, looks and ratings that include it stay intact.
 */
export async function setArchived(
  id: string,
  archived: boolean,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.garments,
    database.preferences,
    async () => {
      const current = await database.garments.get(id)
      if (!current)
        throw new UserFacingError('Dieses Stück ist nicht mehr vorhanden.')
      const now = new Date(
        Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
      ).toISOString()
      const { archivedAt: _previous, ...rest } = current
      await database.garments.put(
        archived
          ? { ...rest, archivedAt: current.archivedAt ?? now, updatedAt: now }
          : { ...rest, updatedAt: now },
      )
      const preferences = await database.preferences.get('personal')
      if (archived && preferences?.dailySelection?.garmentIds.includes(id))
        await database.preferences.put({
          ...preferences,
          dailySelection: undefined,
          updatedAt: new Date(
            Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
          ).toISOString(),
        })
    },
  )
}
export async function setLaundry(
  id: string,
  inLaundry: boolean,
  database = db,
): Promise<void> {
  await database.transaction(
    'rw',
    database.garments,
    database.preferences,
    async () => {
      const current = await database.garments.get(id)
      if (!current)
        throw new UserFacingError('Dieses Stück ist nicht mehr vorhanden.')
      const now = new Date(
        Math.max(Date.now(), Date.parse(current.updatedAt) + 1),
      ).toISOString()
      await database.garments.update(id, {
        inLaundry,
        // Marking clean starts a fresh wear count for automatic laundry.
        ...(!inLaundry && current.inLaundry ? { washedAt: now } : {}),
        updatedAt: now,
      })
      const preferences = await database.preferences.get('personal')
      if (inLaundry && preferences?.dailySelection?.garmentIds.includes(id))
        await database.preferences.put({
          ...preferences,
          dailySelection: undefined,
          updatedAt: new Date(
            Math.max(Date.now(), Date.parse(preferences.updatedAt) + 1),
          ).toISOString(),
        })
    },
  )
}
