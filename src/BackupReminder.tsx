import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ShieldCheck } from 'lucide-react'
import { db, storageError } from './db'
import { readBackupData } from './backup'
import {
  BACKUP_INTERVAL,
  backupReminderDue,
  backupRevision,
  updateBackupReminder,
} from './backup-reminder'
import { useClock } from './useWeather'
import { ErrorMessage } from './ui'
export function BackupReminder({ onBackup }: { onBackup: () => void }) {
  const state = useLiveQuery(() =>
    db.transaction('r', db.tables, async () => {
      const data = await readBackupData()
      return {
        revision: backupRevision(data),
        reminder: data.preferences?.backupReminder,
        hasData: !!data.garments.length,
      }
    }),
  )
  const now = useClock(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    if (state?.hasData && !state.reminder)
      void updateBackupReminder({
        firstSeenAt: new Date(now).toISOString(),
      }).catch(() => {})
  }, [state?.hasData, !!state?.reminder, now])
  if (
    !state ||
    !backupReminderDue(state.reminder, state.revision, state.hasData, now)
  )
    return null
  async function later(days: number, open = false) {
    setBusy(true)
    setError('')
    try {
      await updateBackupReminder({
        snoozedUntil: new Date(now + days * 86400000).toISOString(),
      })
      if (open) onBackup()
    } catch (error) {
      setError(storageError(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <aside className="backup-reminder" aria-label="Sicherungserinnerung">
      <ShieldCheck size={20} />
      <div>
        <h2>Zeit für eine Sicherung?</h2>
        <p>
          {state.reminder?.lastExportedAt
            ? 'Seit deinem letzten Export gibt es neue Daten.'
            : 'Dein Kleiderschrank ist noch nicht gesichert.'}{' '}
          Speichere eine Sicherung in „Dateien“.
        </p>
        <div className="backup-reminder-actions">
          <button
            className="text-button"
            disabled={busy}
            onClick={() => void later(1, true)}
          >
            Sicherung öffnen
          </button>
          <button
            className="text-button muted"
            disabled={busy}
            onClick={() => void later(BACKUP_INTERVAL / 86400000)}
          >
            In einer Woche
          </button>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    </aside>
  )
}

export function BackupReminderSettings() {
  const reminder = useLiveQuery(
    async () => (await db.preferences.get('personal'))?.backupReminder,
  )
  const [choice, setChoice] = useState<boolean>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => setChoice(reminder?.disabled !== true), [reminder?.disabled])
  const enabled = choice ?? reminder?.disabled !== true
  return (
    <div className="backup-reminder-setting">
      <label className="accessory-option">
        <input
          type="checkbox"
          checked={enabled}
          disabled={busy}
          onChange={(event) => {
            const value = event.target.checked
            setChoice(value)
            setBusy(true)
            setError('')
            void updateBackupReminder({ disabled: !value })
              .catch((error) => {
                setChoice(enabled)
                setError(storageError(error))
              })
              .finally(() => setBusy(false))
          }}
        />
        An Sicherungen erinnern
      </label>
      <p className="micro-copy">Höchstens einmal pro Woche.</p>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  )
}
