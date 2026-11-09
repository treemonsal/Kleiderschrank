import { useState, type FormEvent } from 'react'
import { storageError, updatePreferences } from './db'
import { ErrorMessage, Sheet } from './ui'

/** The name on the profile; empty falls back to the Google account. */
export function NameSheet({
  current,
  fallback,
  onClose,
  notify,
}: {
  current: string
  fallback: string
  onClose: () => void
  notify: (message: string) => void
}) {
  const [name, setName] = useState(current)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function save(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const value = name.trim().slice(0, 40)
      await updatePreferences({ displayName: value || undefined })
      notify('Dein Profil ist gespeichert.')
      onClose()
    } catch (caught) {
      setError(storageError(caught))
      setBusy(false)
    }
  }
  return (
    <Sheet
      title="Profil bearbeiten"
      onClose={onClose}
      dirty={name.trim() !== current.trim()}
      closeDisabled={busy}
    >
      <form className="name-form" onSubmit={save}>
        <label className="field">
          Name
          <input
            value={name}
            maxLength={40}
            autoComplete="nickname"
            placeholder={fallback}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button className="button primary full" disabled={busy}>
          Speichern
        </button>
      </form>
    </Sheet>
  )
}
