import { useRef, useState } from 'react'
import { Camera, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import {
  CATEGORIES,
  COLORS,
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
}: {
  item?: Garment
  onClose: () => void
  onSaved: () => void
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
  const [priceText, setPriceText] = useState(
    item?.price === undefined ? '' : String(item.price),
  )
  const [photoRevision, setPhotoRevision] = useState(0)
  const library = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const name = useRef<HTMLInputElement>(null)
  const photo = draft.cutout ?? draft.photo
  function update<K extends keyof GarmentDraft>(
    key: K,
    value: GarmentDraft[K],
  ) {
    setDraft((previous) => ({ ...previous, [key]: value }))
    setDirty(true)
  }
  async function upload(file?: File) {
    if (!file) return
    setProcessing(true)
    setError('')
    try {
      update('photo', await preparePhoto(file))
      update('cutout', undefined)
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
      eyebrow="Kleiderschrank"
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
                <span>
                  Wähle ein Foto und starte die KI bei Bedarf per Knopfdruck. Du
                  kannst die Angaben auch selbst eintragen.
                </span>
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
            hidden
            aria-label="Foto aus Mediathek"
            onChange={(e) => {
              void upload(e.target.files?.[0])
              e.target.value = ''
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
          <label className="field">
            <span>
              Preis in CHF <span className="optional">optional</span>
            </span>
            <input
              inputMode="decimal"
              placeholder="z. B. 49.90"
              value={priceText}
              onChange={(e) => {
                const text = e.target.value.replace(/[^0-9.,]/g, '').slice(0, 9)
                const value = Number(text.replace(',', '.'))
                setPriceText(text)
                update(
                  'price',
                  text && Number.isFinite(value) && value <= 100000
                    ? Math.round(value * 100) / 100
                    : undefined,
                )
              }}
            />
          </label>
          <div className="field">
            <span>
              Farbe{' '}
              <span className="optional">{draft.color || 'optional'}</span>
            </span>
            {draft.photo && (
              <PhotoColorPicker
                key={photoRevision}
                photo={draft.photo}
                onChoose={(color) => update('color', color)}
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
                    update('color', draft.color === c.name ? '' : c.name)
                  }
                >
                  <span style={{ background: c.hex }} />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
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
            {!draft.name.trim()
              ? 'Gib deinem Stück noch einen Namen. Die übrigen Angaben sind optional.'
              : 'Erst mit Speichern in deinem Kleiderschrank.'}
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
                : 'Zum Kleiderschrank hinzufügen'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
