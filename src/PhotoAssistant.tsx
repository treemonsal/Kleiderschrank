import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, ArrowUpRight } from 'lucide-react'
import {
  analyzePhoto,
  readAIConnection,
  AI_CONNECTION_KEY,
  AI_CONNECTION_CHANGED,
  type PhotoAttributes,
} from './cloud-ai'
import { ErrorMessage, PhotoImage } from './ui'
import { AISettings } from './AISettings'

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
  onChoose: (value?: Blob) => void
  onBusy: (value: boolean) => void
}) {
  const [connection, setConnection] = useState(readAIConnection)
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Blob>()
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
  async function start() {
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
    setStatus('Foto wird analysiert und freigestellt …')
    setError('')
    setMessage('')
    setPreview(undefined)
    onBusy(true)
    try {
      const result = await analyzePhoto(photo, allowed, next.signal)
      if (next.signal.aborted) return
      if (result.attributes) apply(result.attributes)
      if (result.cutout) callbacks.current.onChoose(result.cutout)
      setPreview(result.cutout)
      setMessage(
        [
          result.attributes
            ? 'Angaben vorbereitet. Bitte kurz prüfen: Stil und Saison sind Schätzungen.'
            : '',
          result.cutout
            ? 'Hintergrund automatisch entfernt. Dein Original bleibt erhalten.'
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
      ref={section}
      tabIndex={-1}
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
              : 'Online-KI noch nicht verbunden. Du kannst sie hier kostenlos einrichten oder dein Stück manuell speichern.'}
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
              <p className="muted">
                Dein Foto und deine Eingaben bleiben hier. Nach deiner Freigabe
                und dem Aktivieren wird dieses Foto analysiert.
              </p>
              <AISettings
                onConnected={() => {
                  setSetup(false)
                  setConnection(readAIConnection())
                  section.current?.focus()
                  void start()
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
          {preview && (
            <div className="ai-cutout-review">
              <PhotoImage
                className="cutout-preview"
                photo={preview}
                alt="Online-KI: Freistellung prüfen"
              />
              <p className="muted">
                Bereits automatisch übernommen. Prüfe kurz, ob dein Stück
                vollständig ist. Dein Original bleibt zusätzlich gespeichert.
              </p>
              <div className="photo-actions">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    callbacks.current.onChoose(undefined)
                    setPreview(undefined)
                    setMessage('Dein Originalfoto wird verwendet.')
                  }}
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
