import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Scissors } from 'lucide-react'
import { ErrorMessage, PhotoImage } from './ui'

export function BackgroundRemoval({
  photo,
  cutout,
  onChoose,
  onBusy,
}: {
  photo: Blob
  cutout?: Blob
  onChoose: (blob?: Blob) => void
  onBusy: (busy: boolean) => void
}) {
  const [preview, setPreview] = useState<Blob>()
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      controller.current?.abort()
      onBusy(false)
    },
    [onBusy],
  )
  async function start() {
    setError('')
    setPreview(undefined)
    setStatus('Die lokale KI wird vorbereitet …')
    const next = new AbortController()
    controller.current = next
    onBusy(true)
    try {
      const { removePhotoBackground } = await import('./background-removal')
      const result = await removePhotoBackground(photo, next.signal, setStatus)
      if (!next.signal.aborted) setPreview(result)
    } catch (err) {
      if (!next.signal.aborted)
        setError(
          err instanceof TypeError
            ? 'Die KI-Dateien konnten nicht geladen werden. Bitte versuche es einmal online. Dein Original bleibt erhalten.'
            : err instanceof Error
              ? err.message
              : 'Die Freistellung ist fehlgeschlagen.',
        )
    } finally {
      if (controller.current === next) {
        controller.current = null
        setStatus('')
        onBusy(false)
      }
    }
  }
  return (
    <details className="background-assist">
      <summary>
        <Scissors size={17} /> Hintergrund mit KI entfernen{' '}
        <span className="optional">Experimentell</span>
      </summary>
      <div className="photo-color-panel">
        <p>
          Die KI verarbeitet dein Foto ausschliesslich auf diesem Gerät. Beim
          ersten Start werden etwa 19 MB KI-Dateien von dieser App geladen und
          nach Möglichkeit für offline gespeichert. Es werden keine Fotos
          gesendet.
        </p>
        <p>
          Am besten mit einem einzelnen Stück vor ruhigem Hintergrund. Kanten
          und Muster können fehlerhaft sein. Auf deinem iPhone noch nicht
          geprüft. Dein Original bleibt erhalten.
        </p>
        {status ? (
          <>
            <p role="status">
              <LoaderCircle size={17} className="spin" /> {status}
            </p>
            <button
              type="button"
              className="button secondary full"
              onClick={() => controller.current?.abort()}
            >
              Freistellung abbrechen
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button secondary full"
            onClick={() => void start()}
          >
            Lokale KI starten
          </button>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {preview && (
          <>
            <PhotoImage
              className="cutout-preview"
              photo={preview}
              alt="Vorschau mit entferntem Hintergrund"
            />
            <p>
              Prüfe, ob dein Stück vollständig erhalten ist. Die Freistellung
              wird erst mit dem Stück gespeichert.
            </p>
            <div className="photo-actions">
              <button
                type="button"
                className="button primary"
                onClick={() => {
                  onChoose(preview)
                  setPreview(undefined)
                }}
              >
                Freistellung übernehmen
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setPreview(undefined)}
              >
                Vorschau verwerfen
              </button>
            </div>
          </>
        )}
        {cutout && (
          <button
            type="button"
            className="button secondary full"
            disabled={!!status}
            onClick={() => {
              onChoose(undefined)
              setPreview(undefined)
            }}
          >
            Originalfoto verwenden
          </button>
        )}
      </div>
    </details>
  )
}
