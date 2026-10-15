import { useEffect, useRef, useState } from 'react'
import { Sparkles, LoaderCircle } from 'lucide-react'
import {
  checkAIConnection,
  readAIConnection,
  saveAIConnection,
} from './cloud-ai'
import { ErrorMessage } from './ui'

export function AISettings() {
  const [connection, setConnection] = useState(readAIConnection)
  const [url, setUrl] = useState(connection?.url ?? '')
  const [code, setCode] = useState(connection?.code ?? '')
  const [enabled, setEnabled] = useState(connection?.enabled ?? false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  return (
    <section className="settings-section ai-settings">
      <div className="section-heading">
        <h2>Online-Foto-KI</h2>
        <Sparkles size={20} />
      </div>
      <p className="muted section-intro">
        Ein Foto, alle Angaben. Die KI erkennt Name, Kategorie und Farbe,
        schätzt Stil und Saison und stellt dein Stück frei. Marken bleiben leer,
        wenn das Logo nicht lesbar ist.
      </p>
      <div className="settings-card ai-connection">
        <p className="muted">
          {connection
            ? 'KI-Server verbunden. Kostenlose Server können beim ersten Foto einige Minuten zum Starten brauchen.'
            : 'Noch kein KI-Server verbunden. Die App allein kann auf GitHub Pages keine Server-KI ausführen. Die kostenlose Server-Vorlage ist vorbereitet.'}
        </p>
        <label className="field">
          KI-Server
          <input
            type="url"
            placeholder="https://dein-space.hf.space"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        <label className="field">
          Verbindungscode
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="off"
          />
        </label>
        <label className="ai-consent">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              if (!e.target.checked) {
                controller.current?.abort()
                controller.current = null
                setBusy(false)
                saveAIConnection(null)
                setConnection(null)
                setMessage(
                  'Online-KI ausgeschaltet. Es werden keine neuen Fotos gesendet.',
                )
                setError('')
              }
            }}
          />
          <span>
            Neue Fotos automatisch an diesen Server auf Hugging Face senden.
            Dort werden sie verarbeitet; der MyStyle-Server speichert sie nicht.
            Meine gespeicherte Sammlung bleibt auf meinem Gerät.
          </span>
        </label>
        <button
          className="button primary full"
          disabled={busy || !enabled}
          onClick={async () => {
            const next = new AbortController()
            controller.current = next
            const timer = setTimeout(() => next.abort(), 60000)
            setBusy(true)
            setError('')
            setMessage('')
            try {
              const value = { url, code, enabled }
              await checkAIConnection(value, next.signal)
              saveAIConnection(value)
              setConnection(value)
              setMessage(
                'Verbunden. Neue Fotos werden jetzt automatisch vorbereitet.',
              )
            } catch (e) {
              if (controller.current === next)
                setError(
                  e instanceof Error && e.name !== 'AbortError'
                    ? e.message
                    : 'Der Server antwortet noch nicht. Starte den Space und versuche es erneut.',
                )
            } finally {
              clearTimeout(timer)
              if (controller.current === next) {
                controller.current = null
                setBusy(false)
              }
            }
          }}
        >
          {busy ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <Sparkles size={18} />
          )}
          Verbinden und aktivieren
        </button>
        <button
          className="button secondary full"
          onClick={() => {
            controller.current?.abort()
            controller.current = null
            setBusy(false)
            saveAIConnection(null)
            setConnection(null)
            setEnabled(false)
            setCode('')
            setMessage(
              'Online-KI ausgeschaltet. Es werden keine neuen Fotos gesendet.',
            )
            setError('')
          }}
        >
          Online-KI ausschalten
        </button>
        <p className="micro-copy">
          Verbindung nur auf diesem Gerät. Nicht in deiner Datensicherung
          enthalten.
        </p>
      </div>
      {message && (
        <p role="status" className="muted section-intro">
          {message}
        </p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </section>
  )
}
