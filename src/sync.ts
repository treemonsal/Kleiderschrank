import { db, type WardrobeDatabase } from './db'
import {
  importFullBackup,
  parseFullBackup,
  PENDING_PHOTOS,
  readBackupData,
  type BackupData,
} from './backup'
import { validateBackupPhotos } from './photos'
import {
  deleteFile,
  downloadFile,
  listAppFiles,
  uploadFile,
  type DriveFile,
} from './drive'
import {
  parsePhotoRef,
  photoFileName,
  photoRef,
  sha256,
  snapshotBase,
  SYNC_COLLECTIONS,
  syncPlan,
  type SyncRecord,
  type SyncSides,
} from './sync-model'
import { feedbackKey, OCCASIONS, type OutfitFeedback } from './outfit-model'

export const SYNC_FILE = 'mystyle-sync.json'
/** Photos nobody references any more are removed after a day. */
const ORPHAN_AGE = 24 * 60 * 60 * 1000

export interface SyncResult {
  imported: number
  deleted: number
  uploaded: boolean
}

const hashes = new WeakMap<Blob, string>()
async function hashOf(blob: Blob) {
  const known = hashes.get(blob)
  if (known) return known
  const hash = await sha256(blob)
  hashes.set(blob, hash)
  return hash
}

function records(value: unknown): SyncRecord[] {
  return Array.isArray(value)
    ? value.flatMap((item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.updatedAt === 'string'
          ? [{ id: item.id, updatedAt: item.updatedAt }]
          : [],
      )
    : []
}
/**
 * Ratings written before 0.36 carry ids without their occasion. Plan with
 * the current ids, keeping the newer of two entries for the same rating.
 */
export function rekeyFeedback(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  const byId = new Map<string, unknown>()
  for (const item of value) {
    const entry = item as Partial<OutfitFeedback> | null
    const ids = entry?.garmentIds
    const valid =
      !!entry &&
      Array.isArray(ids) &&
      ids.every((id) => typeof id === 'string') &&
      (entry.occasion === undefined || OCCASIONS.includes(entry.occasion))
    const id = valid
      ? feedbackKey(ids as string[], entry!.occasion)
      : (entry as { id?: unknown } | null)?.id
    const record = valid ? { ...entry, id } : item
    const key = typeof id === 'string' ? id : `invalid:${byId.size}`
    const known = byId.get(key) as Partial<OutfitFeedback> | undefined
    if (
      !known ||
      String(known.updatedAt ?? '') < String(entry?.updatedAt ?? '')
    )
      byId.set(key, record)
  }
  return [...byId.values()]
}

function single(value: unknown, id: string): SyncRecord[] {
  return value && typeof value === 'object'
    ? records([{ ...(value as object), id }])
    : []
}

function sidesOf(data: {
  garments?: unknown
  outfits?: unknown
  feedback?: unknown
  calendar?: unknown
  weather?: unknown
  chat?: unknown
}): SyncSides {
  return {
    garments: records(data.garments),
    outfits: records(data.outfits),
    feedback: records(data.feedback),
    calendar: records(data.calendar),
    weather: single(data.weather, 'local'),
    chat: single(data.chat, 'stylist'),
  }
}

function sameSnapshot(a: SyncSides, b: SyncSides) {
  const left = snapshotBase(a),
    right = snapshotBase(b)
  const keys = Object.keys(left)
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => left[key] === right[key])
  )
}

/** The Drive copy: a version-8 backup whose photos are separate files. */
async function syncDocument(
  data: BackupData,
  carry: Partial<
    Record<'garments' | 'outfits' | 'feedback' | 'calendar', unknown[]>
  >,
): Promise<{
  json: string
  photos: Map<string, Blob>
}> {
  const photos = new Map<string, Blob>()
  const ref = async (blob?: Blob) => {
    if (!blob) return undefined
    const hash = await hashOf(blob)
    photos.set(hash, blob)
    return photoRef(blob.type, hash)
  }
  const garments = []
  for (const item of data.garments)
    garments.push({
      ...item,
      photo: await ref(item.photo),
      cutout: await ref(item.cutout),
    })
  const json = JSON.stringify({
    ...data,
    app: 'MyStyle',
    version: 8,
    sync: 1,
    exportedAt: new Date().toISOString(),
    outfits: [...data.outfits, ...(carry.outfits ?? [])],
    feedback: [...data.feedback, ...(carry.feedback ?? [])],
    calendar: [...(data.calendar ?? []), ...(carry.calendar ?? [])],
    weather: data.weather ?? null,
    chat: data.chat ?? null,
    garments: [...garments, ...(carry.garments ?? [])],
  })
  return { json, photos }
}

/**
 * One full sync with the person's Drive: bring in newer and deleted records
 * from other devices atomically, then upload this device's merged state.
 */
export async function syncWithDrive(
  token: string,
  account: string,
  database: WardrobeDatabase = db,
  fetcher?: typeof fetch,
): Promise<SyncResult> {
  const files = await listAppFiles(token, fetcher)
  const byName = new Map<string, DriveFile>(
    files.map((file) => [file.name, file]),
  )
  const dataFile = byName.get(SYNC_FILE)
  const state = await database.syncState.get(account)
  const base = state?.base ?? {}
  let imported = 0,
    deleted = 0
  let remoteSides: SyncSides | undefined
  let raw: Record<string, unknown> = {}
  let plan: ReturnType<typeof syncPlan> | undefined
  if (dataFile) {
    const text = await (await downloadFile(token, dataFile.id, fetcher)).text()
    try {
      raw = JSON.parse(text)
      if (
        raw?.app !== 'MyStyle' ||
        raw.sync !== 1 ||
        !Array.isArray(raw.garments)
      )
        throw new Error()
    } catch {
      throw new Error(
        'Die Daten in Google Drive sind beschädigt. Auf diesem Gerät wurde nichts verändert.',
      )
    }
    raw.feedback = rekeyFeedback(raw.feedback)
    remoteSides = sidesOf(raw)
    const local = await readBackupData(database)
    const localSides = sidesOf(local)
    plan = syncPlan(localSides, remoteSides, base)
    const planned = plan
    // Photos: reuse identical local ones, download only what is missing.
    const photos = new Map<string, Blob>()
    const localPhotos = new Map<string, Blob>()
    for (const item of local.garments)
      if (planned.imports.garments.has(item.id))
        for (const blob of [item.photo, item.cutout])
          if (blob) localPhotos.set(await hashOf(blob), blob)
    for (const item of raw.garments as Record<string, unknown>[])
      if (planned.imports.garments.has(String(item?.id)))
        for (const value of [item.photo, item.cutout]) {
          const ref = parsePhotoRef(value)
          if (!ref || photos.has(ref.hash)) continue
          const known = localPhotos.get(ref.hash)
          const file = byName.get(photoFileName(ref.hash))
          if (known) photos.set(ref.hash, known)
          else if (file) {
            const blob = await downloadFile(token, file.id, fetcher)
            if ((await sha256(blob)) === ref.hash)
              photos.set(ref.hash, new Blob([blob], { type: ref.type }))
          }
        }
    let remote: BackupData
    try {
      remote = parseFullBackup(text, photos)
    } catch {
      throw new Error(
        'Die Daten in Google Drive sind beschädigt. Auf diesem Gerät wurde nichts verändert.',
      )
    }
    // A piece whose photo is still uploading elsewhere waits for the next sync.
    const garments = remote.garments.filter(
      (item) =>
        planned.imports.garments.has(item.id) &&
        ![item.photo, item.cutout].some(
          (blob) => blob && PENDING_PHOTOS.has(blob),
        ),
    )
    await validateBackupPhotos(garments)
    const before = new Map(
      SYNC_COLLECTIONS.map((collection) => [
        collection,
        new Map(
          localSides[collection].map((item) => [item.id, item.updatedAt]),
        ),
      ]),
    )
    await database.transaction('rw', database.tables, async () => {
      // Deletions from other devices, only if untouched since this sync began.
      const unchanged = (
        collection: (typeof SYNC_COLLECTIONS)[number],
        item?: { updatedAt: string },
        id?: string,
      ) => !!item && before.get(collection)!.get(id!) === item.updatedAt
      for (const id of planned.deletions.calendar)
        if (unchanged('calendar', await database.calendar.get(id), id)) {
          await database.calendar.delete(id)
          deleted++
        }
      for (const id of planned.deletions.feedback)
        if (unchanged('feedback', await database.feedback.get(id), id)) {
          await database.feedback.delete(id)
          deleted++
        }
      for (const id of planned.deletions.outfits)
        if (unchanged('outfits', await database.outfits.get(id), id)) {
          await database.calendar.where('outfitId').equals(id).delete()
          await database.outfits.delete(id)
          deleted++
        }
      for (const id of planned.deletions.garments)
        if (unchanged('garments', await database.garments.get(id), id)) {
          await database.garments.delete(id)
          deleted++
        }
      if (
        planned.deletions.weather.size &&
        unchanged('weather', await database.weather.get('local'), 'local')
      )
        await database.weather.delete('local')
      if (
        planned.deletions.chat.size &&
        unchanged('chat', await database.chat.get('stylist'), 'stylist')
      )
        await database.chat.delete('stylist')
      const present = new Set([
        ...(await database.garments.toCollection().primaryKeys()),
        ...garments.map((item) => item.id),
      ] as string[])
      const complete = (ids: string[]) => ids.every((id) => present.has(id))
      const outfits = remote.outfits.filter(
        (item) =>
          planned.imports.outfits.has(item.id) && complete(item.garmentIds),
      )
      const outfitIds = new Set([
        ...(await database.outfits.toCollection().primaryKeys()),
        ...outfits.map((item) => item.id),
      ] as string[])
      await importFullBackup(
        {
          garments,
          outfits,
          feedback: remote.feedback.filter(
            (item) =>
              planned.imports.feedback.has(item.id) &&
              complete(item.garmentIds),
          ),
          preferences: remote.preferences,
          calendar: (remote.calendar ?? []).filter(
            (item) =>
              planned.imports.calendar.has(item.id) &&
              outfitIds.has(item.outfitId),
          ),
          weather: planned.imports.weather.size
            ? (remote.weather ?? null)
            : null,
          chat: planned.imports.chat.size ? (remote.chat ?? null) : null,
        },
        'merge',
        database,
      )
      imported =
        garments.length +
        outfits.length +
        [...planned.imports.feedback, ...planned.imports.calendar].length
      // Nothing may point at a piece or look that is gone now.
      const garmentIds = new Set(
        (await database.garments.toCollection().primaryKeys()) as string[],
      )
      const orphan = (ids: string[]) => ids.some((id) => !garmentIds.has(id))
      for (const outfit of await database.outfits.toArray())
        if (orphan(outfit.garmentIds)) {
          await database.calendar.where('outfitId').equals(outfit.id).delete()
          await database.outfits.delete(outfit.id)
        }
      for (const item of await database.feedback.toArray())
        if (
          orphan(item.garmentIds) ||
          item.id !== feedbackKey(item.garmentIds, item.occasion)
        )
          await database.feedback.delete(item.id)
      const looks = new Set(
        (await database.outfits.toCollection().primaryKeys()) as string[],
      )
      for (const entry of await database.calendar.toArray())
        if (!looks.has(entry.outfitId)) await database.calendar.delete(entry.id)
      const preferences = await database.preferences.get('personal')
      if (
        preferences?.dailySelection &&
        orphan(preferences.dailySelection.garmentIds)
      )
        await database.preferences.put({
          ...preferences,
          dailySelection: undefined,
        })
    })
  }
  // Upload this device's merged state, photos first, then the document.
  // Remote records this device could not take over yet (e.g. a photo still
  // uploading elsewhere) are carried along unchanged, never dropped.
  const after = await readBackupData(database)
  const afterSides = sidesOf(after)
  const carry: Partial<
    Record<'garments' | 'outfits' | 'feedback' | 'calendar', unknown[]>
  > = {}
  if (plan)
    for (const collection of [
      'garments',
      'outfits',
      'feedback',
      'calendar',
    ] as const) {
      const here = new Set(afterSides[collection].map((item) => item.id))
      carry[collection] = (
        Array.isArray(raw[collection]) ? (raw[collection] as unknown[]) : []
      ).filter((item) => {
        const id = (item as { id?: unknown })?.id
        return (
          typeof id === 'string' &&
          plan!.imports[collection].has(id) &&
          !here.has(id)
        )
      })
    }
  // Carried records must still point at pieces and looks in the document.
  const idsOf = (items: unknown[] | undefined) =>
    (items ?? []).map((item) => (item as { id: string }).id)
  const docGarments = new Set([
    ...after.garments.map((item) => item.id),
    ...idsOf(carry.garments),
  ])
  const refsOk = (item: unknown) => {
    const ids = (item as { garmentIds?: unknown }).garmentIds
    return Array.isArray(ids) && ids.every((id) => docGarments.has(id))
  }
  carry.outfits = carry.outfits?.filter(refsOk)
  carry.feedback = carry.feedback?.filter(refsOk)
  const docOutfits = new Set([
    ...after.outfits.map((item) => item.id),
    ...idsOf(carry.outfits),
  ])
  carry.calendar = carry.calendar?.filter((item) =>
    docOutfits.has((item as { outfitId?: string }).outfitId ?? ''),
  )
  const { json, photos } = await syncDocument(after, carry)
  const document = JSON.parse(json)
  const unchanged =
    !!remoteSides &&
    sameSnapshot(sidesOf(document), remoteSides) &&
    (document.preferences?.updatedAt ?? null) ===
      ((raw.preferences as { updatedAt?: string } | null)?.updatedAt ?? null)
  let uploaded = false
  if (!unchanged) {
    for (const [hash, blob] of photos)
      if (!byName.has(photoFileName(hash)))
        await uploadFile(token, photoFileName(hash), blob, undefined, fetcher)
    await uploadFile(
      token,
      SYNC_FILE,
      new Blob([json], { type: 'application/json' }),
      dataFile?.id,
      fetcher,
    )
    uploaded = true
    const referenced = new Set<string>(
      (document.garments as Record<string, unknown>[]).flatMap((item) =>
        [item.photo, item.cutout].flatMap(
          (value) => parsePhotoRef(value)?.hash ?? [],
        ),
      ),
    )
    const now = Date.now()
    for (const file of files)
      if (
        file.name.startsWith('photo-') &&
        !referenced.has(file.name.slice(6)) &&
        now - Date.parse(file.modifiedTime) > ORPHAN_AGE
      )
        await deleteFile(token, file.id, fetcher).catch(() => undefined)
  }
  await database.syncState.put({
    id: account,
    base: snapshotBase(afterSides),
    lastSyncedAt: new Date().toISOString(),
  })
  return { imported, deleted, uploaded }
}
