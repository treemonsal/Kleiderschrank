import { useState, type FormEvent } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { makeAvatar } from './avatar'
import { storageError, updatePreferences } from './db'
import { haptic } from './haptics'
import { ErrorMessage, Sheet } from './ui'

/**
 * Name and picture on the profile. Without an own name the Google account
 * is used, without an own picture the Google picture (or the initials).
 */
export function NameSheet({
  current,
  fallback,
  avatar,
  googlePicture,
  onClose,
  notify,
}: {
  current: string
  fallback: string
  avatar?: string
  googlePicture?: string
  onClose: () => void
  notify: (message: string) => void
}) {
  const [name, setName] = useState(current)
  const [picture, setPicture] = useState(avatar)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const shown = picture ?? googlePicture
  async function choose(file?: File) {
    if (!file) return
    setError('')
    try {
      setPicture(await makeAvatar(file))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    haptic('success')
    setBusy(true)
    setError('')
    try {
      const value = name.trim().slice(0, 40)
      await updatePreferences({
        displayName: value || undefined,
        avatar: picture,
      })
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
      dirty={name.trim() !== current.trim() || picture !== avatar}
      closeDisabled={busy}
    >
      <form className="name-form" onSubmit={save}>
        <div className="avatar-edit">
          <span className="profile-avatar" aria-hidden="true">
            {shown ? (
              <img src={shown} alt="" referrerPolicy="no-referrer" />
            ) : (
              (name.trim() || fallback)[0]?.toUpperCase()
            )}
          </span>
          <div className="avatar-actions">
            <label className="button secondary">
              <ImagePlus size={17} />
              Foto wählen
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Profilfoto wählen"
                onChange={(event) => void choose(event.target.files?.[0])}
              />
            </label>
            {picture && (
              <button
                type="button"
                className="icon-button"
                aria-label="Eigenes Profilfoto entfernen"
                onClick={() => setPicture(undefined)}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
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
