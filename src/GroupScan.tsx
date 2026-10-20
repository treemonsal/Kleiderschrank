import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, LoaderCircle } from 'lucide-react'
import { AISettings } from './AISettings'
import {
  AI_CONNECTION_CHANGED,
  AI_CONNECTION_KEY,
  stylistEnabled,
} from './cloud-ai'
import { preparePhoto } from './photos'
import { CATEGORIES } from './model'
import { ErrorMessage, PhotoImage, Sheet } from './ui'
import { storageError } from './db'
import { describeAIProblem } from './ai-errors'
import {
  cropGarment,
  cutoutGarment,
  detectGarments,
  saveScannedGarments,
  scanProblem,
  type ScannedGarment,
} from './group-scan'

export function GroupScan({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (count: number) => void
}) {
  const [photo, setPhoto] = useState<Blob>()
  const [items, setItems] = useState<ScannedGarment[]>([])
  const [ready, setReady] = useState(stylistEnabled)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const library = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const changed = (event: Event) => {
      if (
        event.type === 'storage' &&
        (event as StorageEvent).key !== null &&
        (event as StorageEvent).key !== AI_CONNECTION_KEY
      )
        return
      setReady(stylistEnabled())
      controller.current?.abort()
      controller.current = null
      setStatus('')
    }
    window.addEventListener('storage', changed)
    window.addEventListener(AI_CONNECTION_CHANGED, changed)
    return () => {
      controller.current?.abort()
      window.removeEventListener('storage', changed)
      window.removeEventListener(AI_CONNECTION_CHANGED, changed)
    }
  }, [])
  async function scan(source: Blob) {
    const active = new AbortController()
    controller.current?.abort()
    controller.current = active
    const timeout = setTimeout(() => active.abort('timeout'), 10 * 60 * 1000)
    setItems([])
    setError('')
    setStatus('Die KI sucht einzelne Kleidungsstücke …')
    try {
      const detected = await detectGarments(source, active.signal)
      const prepared: ScannedGarment[] = []
      for (const detection of detected) {
        const original = await cropGarment(source, detection.box)
        active.signal.throwIfAborted()
        prepared.push({
          ...detection,
          id: crypto.randomUUID(),
          photo: original,
          selected: true,
        })
      }
      setItems(prepared)
      for (let i = 0; i < prepared.length; i++) {
        active.signal.throwIfAborted()
        setStatus(`Hintergrund ${i + 1} von ${prepared.length} wird entfernt …`)
        try {
          const cutout = await cutoutGarment(prepared[i].photo, active.signal)
          active.signal.throwIfAborted()
          setItems((previous) =>
            previous.map((item) =>
              item.id === prepared[i].id ? { ...item, cutout } : item,
            ),
          )
        } catch (error) {
          active.signal.throwIfAborted()
          const warning = describeAIProblem('Freistellung', error)
          const remaining = new Set(prepared.slice(i).map((item) => item.id))
          setItems((previous) =>
            previous.map((item) =>
              remaining.has(item.id) ? { ...item, warning } : item,
            ),
          )
          break
        }
      }
    } catch (error) {
      if (!active.signal.aborted)
        setError(
          error instanceof Error && error.name !== 'AIProviderError'
            ? error.message
            : scanProblem(error),
        )
      else if (active.signal.reason === 'timeout')
        setError(
          'Der Mehrfachscan dauert zu lange. Bereits vorbereitete Stücke bleiben zur Auswahl erhalten.',
        )
    } finally {
      clearTimeout(timeout)
      if (controller.current === active) {
        controller.current = null
        setStatus('')
      }
    }
  }
  async function upload(file?: File) {
    if (!file) return
    setPreparing(true)
    setError('')
    try {
      const source = await preparePhoto(file)
      setPhoto(source)
      setItems([])
      if (stylistEnabled()) void scan(source)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Das Foto konnte nicht geöffnet werden.',
      )
    } finally {
      setPreparing(false)
    }
  }
  const busy = !!status
  return (
    <Sheet
      title="Ein Foto. Mehrere Stücke."
      eyebrow="MEHRFACHSCAN · EXPERIMENTELL"
      dirty={!!photo}
      closeDisabled={saving || preparing}
      onClose={onClose}
    >
      <p className="muted">
        Lege bis zu sechs Stücke mit Abstand nebeneinander. Die KI erstellt
        Bildausschnitte, erkennt Angaben und entfernt die Hintergründe
        automatisch. Überlappende Kleidung und angezogene Outfits sind
        schwieriger zu trennen.
      </p>
      {photo && (
        <PhotoImage
          className="group-source"
          photo={photo}
          alt="Gesamtfoto für den Mehrfachscan"
        />
      )}
      <div className="photo-actions">
        <button
          type="button"
          className="button secondary"
          disabled={busy || saving || preparing}
          onClick={() => camera.current?.click()}
        >
          <Camera size={18} />
          Kamera
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={busy || saving || preparing}
          onClick={() => library.current?.click()}
        >
          <ImagePlus size={18} />
          Fotomediathek
        </button>
      </div>
      <input
        ref={library}
        type="file"
        accept="image/*"
        hidden
        aria-label="Mehrfachfoto aus Mediathek"
        onChange={(event) => {
          void upload(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Mehrfachfoto aufnehmen"
        onChange={(event) => {
          void upload(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      {!ready && (
        <AISettings
          onConnected={() => {
            setReady(stylistEnabled())
            if (photo) void scan(photo)
          }}
        />
      )}
      {preparing && <p role="status">Foto wird vorbereitet …</p>}
      {busy ? (
        <>
          <p className="ai-progress" role="status">
            <LoaderCircle className="spin" size={18} />
            {status}
          </p>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              controller.current?.abort()
              controller.current = null
              setStatus('')
              setError(
                'Scan angehalten. Bereits vorbereitete Stücke bleiben erhalten.',
              )
            }}
          >
            Scan abbrechen
          </button>
        </>
      ) : (
        photo &&
        ready && (
          <button
            className="text-button"
            type="button"
            disabled={saving}
            onClick={() => void scan(photo)}
          >
            Foto erneut aufteilen
          </button>
        )
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {!!items.length && (
        <div className="group-results">
          <p className="muted" role="status">
            {items.length} Stücke vorbereitet. Prüfe Bildausschnitt, Name und
            Kategorie. Nicht passende Treffer kannst du abwählen.
          </p>
          {items.map((item, index) => (
            <article key={item.id} className="group-item">
              <PhotoImage
                photo={item.cutout ?? item.photo}
                fallbackPhoto={item.photo}
                alt={`Bild von ${item.attributes.name}`}
              />
              <label className="accessory-option">
                <input
                  type="checkbox"
                  checked={item.selected}
                  disabled={saving}
                  onChange={(event) =>
                    setItems((previous) =>
                      previous.map((value) =>
                        value.id === item.id
                          ? { ...value, selected: event.target.checked }
                          : value,
                      ),
                    )
                  }
                />
                Stück {index + 1} speichern
              </label>
              <label className="field">
                Name für Stück {index + 1}
                <input
                  maxLength={100}
                  value={item.attributes.name}
                  disabled={saving}
                  onChange={(event) =>
                    setItems((previous) =>
                      previous.map((value) =>
                        value.id === item.id
                          ? {
                              ...value,
                              attributes: {
                                ...value.attributes,
                                name: event.target.value,
                              },
                            }
                          : value,
                      ),
                    )
                  }
                />
              </label>
              <label className="field">
                Kategorie für Stück {index + 1}
                <select
                  value={item.attributes.category}
                  disabled={saving}
                  onChange={(event) =>
                    setItems((previous) =>
                      previous.map((value) =>
                        value.id === item.id
                          ? {
                              ...value,
                              attributes: {
                                ...value.attributes,
                                category: event.target
                                  .value as ScannedGarment['attributes']['category'],
                              },
                            }
                          : value,
                      ),
                    )
                  }
                >
                  {CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <p className="muted">
                {[
                  item.attributes.color,
                  item.attributes.brand,
                  ...item.attributes.styles,
                  ...item.attributes.seasons,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Weitere Angaben nicht sicher erkannt.'}
              </p>
              {item.warning && (
                <p className="muted">
                  {item.warning} Der Originalausschnitt bleibt nutzbar.
                </p>
              )}
              {item.cutout && (
                <button
                  className="text-button"
                  type="button"
                  disabled={saving || busy}
                  onClick={() =>
                    setItems((previous) =>
                      previous.map((value) =>
                        value.id === item.id
                          ? { ...value, cutout: undefined }
                          : value,
                      ),
                    )
                  }
                >
                  Originalausschnitt verwenden
                </button>
              )}
            </article>
          ))}
          <p className="micro-copy">
            Pro Stück speichern wir den Bildausschnitt und gegebenenfalls die
            Freistellung. Das Gesamtfoto wird nicht im Kleiderschrank
            gespeichert. Du kannst alle Angaben anschliessend einzeln
            bearbeiten.
          </p>
          <button
            className="button primary full"
            type="button"
            disabled={
              busy ||
              saving ||
              !items.some((item) => item.selected) ||
              items.some(
                (item) => item.selected && !item.attributes.name.trim(),
              )
            }
            onClick={async () => {
              setSaving(true)
              setError('')
              try {
                onSaved(await saveScannedGarments(items))
              } catch (error) {
                setError(storageError(error))
              } finally {
                setSaving(false)
              }
            }}
          >
            {saving
              ? 'Wird gespeichert …'
              : `${items.filter((item) => item.selected).length} ${items.filter((item) => item.selected).length === 1 ? 'Stück' : 'Stücke'} zum Kleiderschrank hinzufügen`}
          </button>
        </div>
      )}
      <p className="micro-copy">
        Kostenlose Community-KI mit möglichen Quoten und Wartezeiten. Nur dieses
        gewählte Foto geht zur Erkennung an Qwen3-VL-Outpost; die Ausschnitte
        gehen einzeln an BiRefNet. Es werden keine vorhandenen Stücke neu
        hochgeladen.
      </p>
    </Sheet>
  )
}
