import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, ArrowUpRight } from 'lucide-react'
import {
  analyzePhoto,
  readAIConnection,
  type PhotoAttributes,
} from './cloud-ai'
import { ErrorMessage, usePhotoUrl } from './ui'

export function PhotoAssistant({
  photo,
  autoRun,
  onAttributes,
  onChoose,
  onBusy,
}: {
  photo: Blob
  autoRun: boolean
  onAttributes: (value: PhotoAttributes) => void
  onChoose: (value: Blob) => void
  onBusy: (value: boolean) => void
}) {
  const [connection] = useState(readAIConnection)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Blob>()
  const url = usePhotoUrl(preview)
  const controller = useRef<AbortController | null>(null)
  // Capture the draft at the start of a request; later edits must win.
  const callbacks = useRef({ onAttributes, onChoose })
  callbacks.current = { onAttributes, onChoose }
  async function start() {
    if (!connection?.enabled) return
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    const apply = callbacks.current.onAttributes
    const timer = setTimeout(() => next.abort('timeout'), 10 * 60 * 1000)
    setStatus('Foto wird analysiert und freigestellt …')
    setError('')
    setMessage('')
    setPreview(undefined)
    onBusy(true)
    try {
      const result = await analyzePhoto(photo, connection, next.signal)
      if (next.signal.aborted) return
      if (result.attributes) apply(result.attributes)
      setPreview(result.cutout)
      setMessage(
        [
          result.attributes
            ? 'Angaben vorbereitet. Bitte kurz prüfen: Stil und Saison sind Schätzungen.'
            : '',
          ...result.warnings,
        ]
          .filter(Boolean)
          .join(' '),
      )
    } catch (e) {
      if (!next.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : 'Die Online-KI ist nicht erreichbar.',
        )
      else if (next.signal.reason === 'timeout')
        setError(
          'Der kostenlose Server hat zu lange gebraucht. Dein Foto ist erhalten; bitte erneut versuchen.',
        )
    } finally {
      clearTimeout(timer)
      if (controller.current === next) {
        controller.current = null
        setStatus('')
        onBusy(false)
      }
    }
  }
  useEffect(() => {
    if (autoRun && connection?.enabled) void start()
    return () => {
      controller.current?.abort()
      controller.current = null
      onBusy(false)
    }
    // This component is remounted for each newly selected photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section
      className="photo-assistant"
      aria-label="Foto automatisch vorbereiten"
    >
      <div className="assistant-heading">
        <ArrowUpRight size={21} />
        <div>
          <h3>Dein Foto automatisch vorbereiten.</h3>
          <p>
            {connection?.enabled
              ? 'Erkennen, ausfüllen und freistellen.'
              : 'Online-KI noch nicht verbunden. Kostenlose KI unter Mehr → Online-Foto-KI aktivieren. Du kannst dein Stück jederzeit manuell speichern.'}
          </p>
        </div>
      </div>
      {connection?.enabled && (
        <>
          {status ? (
            <>
              <p role="status" className="ai-progress">
                <LoaderCircle className="spin" size={19} />
                {status}
              </p>
              <p className="muted">
                {connection.mode === 'community'
                  ? 'Community-Dienste können Warteschlangen und Tageslimits haben. Bitte halte die App während der Analyse geöffnet.'
                  : 'Der Start und die Analyse können mehrere Minuten dauern.'}
              </p>
              <button
                className="button secondary full"
                type="button"
                onClick={() => {
                  controller.current?.abort()
                  setMessage('Analyse abgebrochen. Dein Foto ist erhalten.')
                }}
              >
                Analyse abbrechen
              </button>
            </>
          ) : (
            <button
              className="button secondary full"
              type="button"
              onClick={() => void start()}
            >
              <ArrowUpRight size={18} />
              {message ? 'Foto erneut analysieren' : 'Foto mit KI vorbereiten'}
            </button>
          )}
          {message && (
            <p role="status" className="muted">
              {message}
            </p>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {preview && url && (
            <div className="ai-cutout-review">
              <img
                className="cutout-preview"
                src={url}
                alt="Online-KI: Freistellung prüfen"
              />
              <p className="muted">
                Ist dein Stück vollständig? Dein Original bleibt zusätzlich
                gespeichert.
              </p>
              <div className="photo-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    callbacks.current.onChoose(preview)
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
                  Original behalten
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
