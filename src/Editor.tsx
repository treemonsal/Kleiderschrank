import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  ClipboardPaste,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from 'lucide-react'
import { imagesFromClipboard } from './image-drop'
import {
  CATEGORIES,
  COLORS,
  MAX_SECONDARY_COLORS,
  SEASONS,
  STYLES,
  type Garment,
  type GarmentDraft,
} from './model'
import { preparePhoto } from './photos'
import { saveGarment, storageError } from './db'
import { ErrorMessage, PhotoImage, Sheet } from './ui'
import { PhotoColorPicker } from './PhotoColorPicker'
import { BackgroundRemoval } from './BackgroundRemoval'
import { PhotoAssistant } from './PhotoAssistant'
import type { PhotoAttributes } from './cloud-ai'

export function Editor({
  item,
  onClose,
  onSaved,
  onBatch,
  incoming,
}: {
  item?: Garment
  onClose: () => void
  onSaved: () => void
  /** Several library photos at once go to the batch import. */
  onBatch?: (files: File[]) => void
  /** Images dragged in from another window or pasted. */
  incoming?: { files: File[]; key: number }
}) {
  const [draft, setDraft] = useState<GarmentDraft>(() =>
    item
      ? { ...item }
      : {
          name: '',
          category: 'Oberteile',
          color: '',
          brand: '',
          seasons: [],
          styles: [],
          notes: '',
          favorite: false,
        },
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [assisting, setAssisting] = useState(false)
  const [onlineBusy, setOnlineBusy] = useState(false)
  const [recognized, setRecognized] = useState(false)
  const [dirty, setDirty] = useState(false)
  // Only photos picked in this session start the AI automatically.
  const [freshPhoto, setFreshPhoto] = useState(false)
  const [photoRevision, setPhotoRevision] = useState(0)
  const library = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const name = useRef<HTMLInputElement>(null)
  const photo = draft.cutout ?? draft.photo
  const canPaste = typeof navigator.clipboard?.read === 'function'
  function update<K extends keyof GarmentDraft>(
    key: K,
    value: GarmentDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setDirty(true)
  }
  function receive(files: File[]) {
    if (files.length > 1 && onBatch && !item) onBatch(files)
    else void upload(files[0])
  }
  const receiveLatest = useRef(receive)
  receiveLatest.current = receive
  useEffect(() => {
    if (incoming?.files.length) receiveLatest.current(incoming.files)
  }, [incoming?.key, incoming?.files])
  const secondary = draft.secondaryColors ?? []
  function chooseMain(color: string) {
    update('color', color)
    // The main colour is never also a second colour; without one, none.
    update(
      'secondaryColors',
      color ? secondary.filter((name) => name !== color) : [],
    )
  }
  async function upload(file?: File) {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      update('photo', await preparePhoto(file))
      update('cutout', undefined)
      setFreshPhoto(true)
      setRecognized(false)
      setPhotoRevision((previous) => previous + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Das Bild konnte nicht geöffnet werden.',
      )
    } finally {
      setProcessing(false)
    }
  }
  return (
    <Sheet
      title={item ? 'Stück bearbeiten' : 'Neues Stück'}
      eyebrow="Garderobe"
      onClose={onClose}
      dirty={dirty}
      closeDisabled={busy || processing}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!draft.name.trim()) {
            setError('Bitte gib deinem Stück einen Namen.')
            name.current?.focus()
            return
          }
          setBusy(true)
          setError('')
          try {
            await saveGarment(draft, item)
            onSaved()
          } catch (err) {
            setError(storageError(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        <fieldset disabled={busy || processing} className="editor-fields">
          <div className={`photo-picker ${photo ? 'has-photo' : ''}`}>
            {photo ? (
              <PhotoImage
                photo={photo}
                fallbackPhoto={draft.photo}
                alt="Vorschau des Kleidungsstücks"
              />
            ) : (
              <div className="photo-picker-empty">
                <ImagePlus size={32} strokeWidth={1.3} />
                <p>Foto hinzufügen</p>
                <span>Mehrere auf einmal, auch per Ziehen oder Einsetzen.</span>
              </div>
            )}
            {processing && (
              <div className="processing">
                <LoaderCircle className="spin" /> Foto wird vorbereitet …
              </div>
            )}
          </div>
          <div className="photo-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => camera.current?.click()}
            >
              <Camera size={18} />
              Kamera
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => library.current?.click()}
            >
              <ImagePlus size={18} />
              Fotomediathek
            </button>
            {canPaste && (
              <button
                type="button"
                className="icon-button"
                aria-label="Bild aus der Zwischenablage einsetzen"
                disabled={processing}
                onClick={() =>
                  imagesFromClipboard().then(receive, (err: unknown) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Das Bild konnte nicht eingesetzt werden.',
                    ),
                  )
                }
              >
                <ClipboardPaste size={19} />
              </button>
            )}
            {draft.photo && (
              <button
                type="button"
                className="icon-button"
                aria-label="Foto entfernen"
                onClick={() => {
                  update('photo', undefined)
                  update('cutout', undefined)
                  setRecognized(false)
                  setPhotoRevision((previous) => previous + 1)
                }}
              >
                <Trash2 size={19} />
              </button>
            )}
          </div>
          {draft.photo && (
            <PhotoAssistant
              key={`online-${photoRevision}`}
              photo={draft.photo}
              onBusy={setOnlineBusy}
              autoStart={freshPhoto}
              onChoose={(blob) => update('cutout', blob)}
              onAttributes={(values: PhotoAttributes) => {
                const baseline = draft
                setDraft((current) => {
                  if (current.photo !== baseline.photo) return current
                  const next = { ...current }
                  for (const key of Object.keys(
                    values,
                  ) as (keyof PhotoAttributes)[]) {
                    if (
                      JSON.stringify(current[key]) ===
                      JSON.stringify(baseline[key])
                    )
                      Object.assign(next, { [key]: values[key] })
                  }
                  return next
                })
                setRecognized(true)
                setDirty(true)
              }}
            />
          )}
          {draft.photo && !onlineBusy && (
            <BackgroundRemoval
              key={photoRevision}
              photo={draft.photo}
              cutout={draft.cutout}
              onChoose={(blob) => update('cutout', blob)}
              onBusy={setAssisting}
            />
          )}
          <input
            ref={library}
            type="file"
            accept="image/*"
            multiple={!item && !!onBatch}
            hidden
            aria-label="Foto aus Mediathek"
            onChange={(e) => {
              const files = [...(e.target.files ?? [])]
              e.target.value = ''
              if (files.length > 1 && onBatch) onBatch(files)
              else void upload(files[0])
            }}
          />
          <input
            ref={camera}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            aria-label="Kamerafoto"
            onChange={(e) => {
              void upload(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {recognized && (
            <p className="ai-ready" role="status">
              Angaben aus deinem Foto vorbereitet. Du kannst alles ändern.
            </p>
          )}
          <label className="field">
            Name <span className="required-hint">Pflichtfeld</span>
            <input
              ref={name}
              autoComplete="off"
              required
              maxLength={100}
              placeholder="z. B. Mein weisses Leinenhemd"
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </label>
          <div className="field-row">
            <label className="field">
              Kategorie
              <select
                value={draft.category}
                onChange={(e) =>
                  update('category', e.target.value as Garment['category'])
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Marke
              <input
                maxLength={100}
                placeholder="Optional"
                value={draft.brand}
                onChange={(e) => update('brand', e.target.value)}
              />
            </label>
          </div>
          <div className="field">
            <span>
              Farbe{' '}
              <span className="optional">{draft.color || 'optional'}</span>
            </span>
            {draft.photo && (
              <PhotoColorPicker
                key={photoRevision}
                photo={draft.photo}
                onChoose={(color) => chooseMain(color)}
              />
            )}
            <div className="color-options">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.name}
                  className={`color-option ${draft.color === c.name ? 'selected' : ''}`}
                  aria-label={c.name}
                  aria-pressed={draft.color === c.name}
                  onClick={() =>
                    chooseMain(draft.color === c.name ? '' : c.name)
                  }
                >
                  <span style={{ background: c.hex }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          {draft.color && (
            <div
              className="field secondary-colors"
              role="group"
              aria-label="Zweitfarben"
            >
              <span>
                Zweitfarben{' '}
                <span className="optional">
                  {secondary.length
                    ? secondary.join(', ')
                    : `optional, bis zu ${MAX_SECONDARY_COLORS}`}
                </span>
              </span>
              <div className="color-options compact">
                {COLORS.filter((c) => c.name !== draft.color).map((c) => {
                  const selected = secondary.includes(c.name)
                  return (
                    <button
                      type="button"
                      key={c.name}
                      className={`color-option ${selected ? 'selected' : ''}`}
                      aria-label={`Zweitfarbe ${c.name}`}
                      aria-pressed={selected}
                      disabled={
                        !selected && secondary.length >= MAX_SECONDARY_COLORS
                      }
                      onClick={() =>
                        update(
                          'secondaryColors',
                          selected
                            ? secondary.filter((name) => name !== c.name)
                            : [...secondary, c.name],
                        )
                      }
                    >
                      <span style={{ background: c.hex }} />
                      <span>{c.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="field">
            <span>
              Jahreszeiten <span className="optional">optional</span>
            </span>
            <div className="chips wrap">
              {SEASONS.map((season) => (
                <button
                  className={`chip ${draft.seasons.includes(season) ? 'active' : ''}`}
                  key={season}
                  type="button"
                  aria-pressed={draft.seasons.includes(season)}
                  onClick={() =>
                    update(
                      'seasons',
                      draft.seasons.includes(season)
                        ? draft.seasons.filter((s) => s !== season)
                        : [...draft.seasons, season],
                    )
                  }
                >
                  {season}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>
              Dein Stil <span className="optional">optional</span>
            </span>
            <div className="chips wrap">
              {STYLES.map((style) => (
                <button
                  className={`chip ${draft.styles.includes(style) ? 'active' : ''}`}
                  key={style}
                  type="button"
                  aria-pressed={draft.styles.includes(style)}
                  onClick={() =>
                    update(
                      'styles',
                      draft.styles.includes(style)
                        ? draft.styles.filter((s) => s !== style)
                        : [...draft.styles, style],
                    )
                  }
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
          <label className="accessory-option">
            <input
              type="checkbox"
              checked={!!draft.inLaundry}
              onChange={(event) => update('inLaundry', event.target.checked)}
            />
            In der Wäsche · aus neuen Vorschlägen ausblenden
          </label>
          <label className="field">
            Notizen
            <textarea
              maxLength={2000}
              rows={3}
              placeholder="Material, Passform oder was dieses Stück besonders macht …"
              value={draft.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </label>
        </fieldset>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="sheet-footer">
          <p className="micro-copy">
            {!draft.name.trim() ? 'Nur der Name ist nötig.' : ''}
          </p>
          <button
            className="button primary full"
            type="submit"
            disabled={busy || processing || assisting || onlineBusy}
          >
            {busy ? <LoaderCircle className="spin" size={18} /> : null}
            {busy
              ? 'Wird gespeichert …'
              : item
                ? 'Änderungen speichern'
                : 'In die Garderobe legen'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
