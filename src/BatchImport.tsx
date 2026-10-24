import { useEffect, useRef, useState } from 'react'
import { Check, CircleAlert, LoaderCircle, Trash2 } from 'lucide-react'
import { analyzePhoto, readAIConnection } from './cloud-ai'
import { saveGarment, storageError } from './db'
import { CATEGORIES, type Category, type GarmentDraft } from './model'
import { preparePhoto } from './photos'
import { ErrorMessage, PhotoImage, Sheet } from './ui'

type Status = 'waiting' | 'working' | 'done' | 'failed'
interface Entry {
  key: string
  file: File
  status: Status
  draft: GarmentDraft
}

const blank = (index: number): GarmentDraft => ({
  name: `Neues Stück ${index + 1}`,
  category: 'Oberteile',
  color: '',
  brand: '',
  seasons: [],
  styles: [],
  notes: '',
  favorite: false,
})

/**
 * Adds several photos at once. Each photo is prepared, analysed and cut out
 * one after another (free services have limits); everything stays editable
 * and nothing is saved until "Alle speichern".
 */
export function BatchImport({
  files,
  onClose,
  onSaved,
}: {
  files: File[]
  onClose: () => void
  onSaved: (count: number) => void
}) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    files.slice(0, 30).map((file, index) => ({
      key: `${index}-${file.name}-${file.size}`,
      file,
      status: 'waiting',
      draft: blank(index),
    })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const patch = (key: string, change: Partial<Entry>) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key ? { ...entry, ...change } : entry,
      ),
    )
  const edit = (key: string, change: Partial<GarmentDraft>) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.key === key
          ? { ...entry, draft: { ...entry.draft, ...change } }
          : entry,
      ),
    )

  useEffect(() => {
    const active = new AbortController()
    controller.current = active
    void (async () => {
      for (const entry of entries) {
        if (active.signal.aborted) return
        patch(entry.key, { status: 'working' })
        let photo: Blob
        try {
          photo = await preparePhoto(entry.file)
        } catch {
          patch(entry.key, { status: 'failed' })
          continue
        }
        edit(entry.key, { photo })
        try {
          const connection = readAIConnection()
          if (connection?.enabled) {
            const result = await analyzePhoto(photo, connection, active.signal)
            if (active.signal.aborted) return
            edit(entry.key, {
              ...(result.attributes ?? {}),
              ...(result.cutout ? { cutout: result.cutout } : {}),
            })
          } else {
            // Without online AI the on-device model still removes the background.
            const { removePhotoBackground } =
              await import('./background-removal')
            const cutout = await removePhotoBackground(
              photo,
              active.signal,
              () => {},
            )
            edit(entry.key, { cutout })
          }
          patch(entry.key, { status: 'done' })
        } catch {
          if (active.signal.aborted) return
          patch(entry.key, { status: 'failed' })
        }
      }
    })()
    return () => active.abort()
    // Runs once for the files chosen when the sheet opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const busy = entries.some(
    (entry) => entry.status === 'waiting' || entry.status === 'working',
  )
  const ready = entries.filter((entry) => entry.draft.photo)
  async function saveAll() {
    setSaving(true)
    setError('')
    let saved = 0
    try {
      for (const entry of ready) {
        await saveGarment({
          ...entry.draft,
          name: entry.draft.name.trim() || 'Neues Stück',
        })
        saved++
      }
      onSaved(saved)
    } catch (error) {
      setEntries((current) => current.slice(saved))
      setError(storageError(error))
    } finally {
      setSaving(false)
    }
  }
  const doneCount = entries.filter(
    (entry) => entry.status === 'done' || entry.status === 'failed',
  ).length
  return (
    <Sheet
      title={`${entries.length} Fotos`}
      eyebrow="Mehrere Stücke"
      onClose={() => {
        controller.current?.abort()
        onClose()
      }}
      dirty={ready.length > 0}
      closeDisabled={saving}
    >
      <div className="batch">
        <div
          className="batch-progress"
          role="progressbar"
          aria-label="Fortschritt"
          aria-valuemin={0}
          aria-valuemax={entries.length}
          aria-valuenow={doneCount}
        >
          <span style={{ width: `${(doneCount / entries.length) * 100}%` }} />
        </div>
        <ul className="batch-list">
          {entries.map((entry) => (
            <li key={entry.key} className={`batch-item ${entry.status}`}>
              <div className="batch-thumb">
                {entry.draft.cutout || entry.draft.photo ? (
                  <PhotoImage
                    photo={(entry.draft.cutout ?? entry.draft.photo)!}
                    alt=""
                  />
                ) : null}
                <span className="batch-status" aria-hidden="true">
                  {entry.status === 'working' || entry.status === 'waiting' ? (
                    <LoaderCircle
                      size={16}
                      className={entry.status === 'working' ? 'spin' : ''}
                    />
                  ) : entry.status === 'done' ? (
                    <Check size={16} />
                  ) : (
                    <CircleAlert size={16} />
                  )}
                </span>
              </div>
              <div className="batch-fields">
                <input
                  aria-label="Name"
                  maxLength={100}
                  value={entry.draft.name}
                  onChange={(event) =>
                    edit(entry.key, { name: event.target.value })
                  }
                />
                <select
                  aria-label="Kategorie"
                  value={entry.draft.category}
                  onChange={(event) =>
                    edit(entry.key, {
                      category: event.target.value as Category,
                    })
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`${entry.draft.name} entfernen`}
                disabled={saving}
                onClick={() =>
                  setEntries((current) =>
                    current.filter((item) => item.key !== entry.key),
                  )
                }
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button
          type="button"
          className="button primary full"
          disabled={saving || busy || !ready.length}
          onClick={() => void saveAll()}
        >
          {busy ? (
            <>
              <LoaderCircle size={18} className="spin" />
              {doneCount} von {entries.length}
            </>
          ) : saving ? (
            'Wird gespeichert …'
          ) : (
            `Alle speichern (${ready.length})`
          )}
        </button>
      </div>
    </Sheet>
  )
}
