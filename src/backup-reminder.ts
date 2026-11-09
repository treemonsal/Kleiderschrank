import type { BackupData } from './backup'
import { DEFAULT_PREFERENCES, type BackupReminderState } from './outfit-model'
import { db } from './db'
export const BACKUP_INTERVAL = 7 * 86400000
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    )
  return value
}
export function backupRevision(data: BackupData): string {
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...data.preferences,
    backupReminder: undefined,
    updatedAt: undefined,
  }
  // Routine weather-cache refreshes and reminder bookkeeping do not create a new reminder.
  const content = {
    garments: data.garments
      .map((item) => ({
        ...item,
        photo: item.photo
          ? { size: item.photo.size, type: item.photo.type }
          : undefined,
        cutout: item.cutout
          ? { size: item.cutout.size, type: item.cutout.type }
          : undefined,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    outfits: [...data.outfits].sort((a, b) => a.id.localeCompare(b.id)),
    feedback: [...data.feedback].sort((a, b) => a.id.localeCompare(b.id)),
    chat: data.chat?.messages.length
      ? { messages: data.chat.messages }
      : undefined,
    preferences,
    calendar: [...(data.calendar ?? [])].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    location: data.weather?.location ?? null,
  }
  const text = JSON.stringify(canonical(content))
  let a = 2166136261,
    b = 0x9e3779b9
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619)
    b = Math.imul(b ^ text.charCodeAt(i), 2246822519)
  }
  return (
    (a >>> 0).toString(16).padStart(8, '0') +
    (b >>> 0).toString(16).padStart(8, '0')
  )
}
export function backupReminderDue(
  state: BackupReminderState | undefined,
  revision: string,
  hasData: boolean,
  now = Date.now(),
): boolean {
  if (
    !hasData ||
    !state ||
    state.disabled ||
    state.lastExportedRevision === revision
  )
    return false
  const since = Date.parse(state.lastExportedAt ?? state.firstSeenAt)
  return (
    Number.isFinite(since) &&
    now - since >= BACKUP_INTERVAL &&
    (!state.snoozedUntil || Date.parse(state.snoozedUntil) <= now)
  )
}
export async function updateBackupReminder(
  patch: Partial<BackupReminderState>,
  database = db,
): Promise<void> {
  await database.transaction('rw', database.preferences, async () => {
    const current = await database.preferences.get('personal')
    await database.preferences.put({
      ...current,
      id: 'personal',
      styles: current?.styles ?? [],
      colors: current?.colors ?? [],
      updatedAt: current?.updatedAt ?? '1970-01-01T00:00:00.000Z',
      backupReminder: {
        firstSeenAt: new Date().toISOString(),
        ...current?.backupReminder,
        ...patch,
        updatedAt: new Date(
          Math.max(
            Date.now(),
            Date.parse(
              current?.backupReminder?.updatedAt ??
                current?.backupReminder?.firstSeenAt ??
                '',
            ) + 1 || 0,
          ),
        ).toISOString(),
      },
    })
  })
}
