import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, ArrowUpRight } from 'lucide-react'
import {
  analyzePhoto,
  readAIConnection,
  AI_CONNECTION_KEY,
  AI_CONNECTION_CHANGED,
  type PhotoAttributes,
  type PhotoTask,
} from './cloud-ai'
import { ErrorMessage, PhotoImage } from './ui'
import { AISettings } from './AISettings'

export function PhotoAssistant({
  photo,
  onAttributes,
  onChoose,
  onBusy,
  autoStart = false,
}: {
  photo: Blob
  onAttributes: (value: PhotoAttributes) => void
  onChoose: (value?: Blob) => void
  onBusy: (value: boolean) => void
  /** New photos are analysed and cut out right away when the AI is enabled. */
  autoStart?: boolean
}) {
  const [connection, setConnection] = useState(readAIConnection)
  const [status, setStatus] = useState('')
  const [started, setStarted] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Blob>()
  const [applied, setApplied] = useState(false)
  const [retry, setRetry] = useState({ attributes: false, cutout: false })
  const [setup, setSetup] = useState(false)
  const section = useRef<HTMLElement>(null)
  const setupPanel = useRef<HTMLDivElement>(null)
  const setupButton = useRef<HTMLButtonElement>(null)
  const controller = useRef<AbortController | null>(null)
  const lastConnection = useRef(connection)
  // Capture the draft at the start of a request; later edits must win.
  const callbacks = useRef({ onAttributes, onChoose })
  callbacks.current = { onAttributes, onChoose }
  useEffect(() => {
    if (setup) setupPanel.current?.focus()
  }, [setup])
  useEffect(() => {
    const changed = (event: Event) => {
      if (
        event.type === 'storage' &&
        (event as StorageEvent).key !== null &&
        (event as StorageEvent).key !== AI_CONNECTION_KEY
      )
        return
      const next = readAIConnection()
      if (JSON.stringify(next) === JSON.stringify(lastConnection.current))
        return
      lastConnection.current = next
      controller.current?.abort()
      controller.current = null
      setConnection(next)
      setStatus('')
      setPreview(undefined)
      setRetry({ attributes: false, cutout: false })
      onBusy(false)
      setMessage(
        'Foto-Freigabe oder KI-Verbindung geändert. Starte die Analyse bei Bedarf erneut.',
      )
    }
    window.addEventListener('storage', changed)
    window.addEventListener(AI_CONNECTION_CHANGED, changed)
    return () => {
      window.removeEventListener('storage', changed)
      window.removeEventListener(AI_CONNECTION_CHANGED, changed)
    }
  }, [onBusy])
  async function start(task: PhotoTask = 'all') {
    const allowed = readAIConnection()
    if (!allowed?.enabled) {
      setConnection(allowed)
      return
    }
    controller.current?.abort()
    const next = new AbortController()
    controller.current = next
    const apply = callbacks.current.onAttributes
    const timer = setTimeout(() => next.abort('timeout'), 10 * 60 * 1000)
    setStarted(true)
    setStatus(
      task === 'attributes'
        ? 'Angaben werden erkannt …'
        : task === 'cutout'
          ? 'Hintergrund wird entfernt …'
          : 'Foto wird analysiert und freigestellt …',
    )
    setError('')
    setMessage('')
    onBusy(true)
    try {
      const result = await analyzePhoto(photo, allowed, next.signal, task)
      if (next.signal.aborted) return
      if (result.attributes) apply(result.attributes)
      if (result.cutout && autoStart) {
        callbacks.current.onChoose(result.cutout)
        setApplied(true)
      } else if (result.cutout) setPreview(result.cutout)
      setRetry((previous) => ({
        attributes:
          task === 'cutout' ? previous.attributes : !result.attributes,
        cutout: task === 'attributes' ? previous.cutout : !result.cutout,
      }))
      setMessage(
        [
          result.attributes
            ? 'Angaben vorbereitet. Bitte kurz prüfen: Stil und Saison sind Schätzungen.'
            : '',
          result.cutout
            ? autoStart
              ? 'Hintergrund entfernt.'
              : 'Freistellung bereit. Prüfe sie und übernimm sie bei Bedarf.'
            : '',
          ...result.warnings,
        ]
          .filter(Boolean)
          .join(' '),
      )
    } catch (e) {
      if (!next.signal.aborted || next.signal.reason === 'timeout')
        setRetry((previous) => ({
          attributes: task === 'cutout' ? previous.attributes : true,
          cutout: task === 'attributes' ? previous.cutout : true,
        }))
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
    if (autoStart && readAIConnection()?.enabled) void start()
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
      ref={section}
      tabIndex={-1}
      className="photo-assistant"
      aria-label="Foto mit KI vorbereiten"
    >
      <div className="assistant-heading">
        <ArrowUpRight size={21} />
        <div>
          <h3>Foto mit KI vorbereiten</h3>
          <p>
            {connection?.enabled
              ? autoStart
                ? 'Läuft automatisch für neue Fotos.'
                : 'Angaben erkennen und Hintergrund entfernen.'
              : 'Noch nicht eingerichtet.'}
          </p>
        </div>
      </div>
      {(!connection?.enabled || setup) && (
        <>
          {!connection?.enabled && (
            <button
              ref={setupButton}
              className="button secondary full"
              type="button"
              aria-expanded={setup}
              onClick={() => setSetup((value) => !value)}
            >
              Kostenlose Foto-KI einrichten
            </button>
          )}
          {setup && (
            <div className="photo-ai-setup" ref={setupPanel} tabIndex={-1}>
              <AISettings
                onConnected={() => {
                  setSetup(false)
                  setConnection(readAIConnection())
                  section.current?.focus()
                  setMessage(
                    'Foto-KI verbunden. Du kannst die Analyse jetzt starten.',
                  )
                }}
              />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSetup(false)
                  setupButton.current?.focus()
                }}
              >
                {connection?.enabled
                  ? 'Einrichtung schliessen'
                  : 'Ohne KI weiter bearbeiten'}
              </button>
            </div>
          )}
        </>
      )}
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
                  ? 'Bitte App geöffnet lassen.'
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
              className={
                retry.attributes || retry.cutout
                  ? 'text-button'
                  : 'button secondary full'
              }
              type="button"
              onClick={() => void start()}
            >
              <ArrowUpRight size={18} />
              {retry.attributes || retry.cutout
                ? 'Beide Schritte erneut starten'
                : started
                  ? 'Foto erneut analysieren'
                  : 'Foto mit KI vorbereiten'}
            </button>
          )}
          {!status && (retry.attributes || retry.cutout) && (
            <div className="photo-retry-actions">
              {retry.attributes && (
                <button
                  type="button"
                  className="button secondary full"
                  onClick={() => void start('attributes')}
                >
                  Nur Angaben erneut erkennen
                </button>
              )}
              {retry.cutout && (
                <button
                  type="button"
                  className="button secondary full"
                  onClick={() => void start('cutout')}
                >
                  Nur Hintergrund erneut entfernen
                </button>
              )}
            </div>
          )}
          {message && (
            <p role="status" className="muted">
              {message}
            </p>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {applied && !status && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                callbacks.current.onChoose(undefined)
                setApplied(false)
                setMessage('Original wird verwendet.')
              }}
            >
              Original verwenden
            </button>
          )}
          {preview && (
            <div className="ai-cutout-review">
              <PhotoImage
                className="cutout-preview"
                photo={preview}
                alt="Online-KI: Freistellung prüfen"
              />
              <p className="muted">
                Prüfe, ob dein Stück vollständig ist. Erst mit „Freistellung
                übernehmen“ ersetzt du die Vorschau; dein Original bleibt
                erhalten.
              </p>
              <div className="photo-actions">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => {
                    callbacks.current.onChoose(preview)
                    setPreview(undefined)
                    setMessage(
                      'Freistellung übernommen. Dein Original bleibt erhalten.',
                    )
                  }}
                >
                  Freistellung übernehmen
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setPreview(undefined)
                    setMessage(
                      'Freistellung verworfen. Dein bisheriges Foto bleibt erhalten.',
                    )
                  }}
                >
                  Freistellung verwerfen
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
