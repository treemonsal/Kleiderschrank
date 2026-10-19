import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, LoaderCircle } from 'lucide-react'
import {
  checkAIConnection,
  readAIConnection,
  saveAIConnection,
  type AIConnection,
} from './cloud-ai'
import { ErrorMessage } from './ui'

export function AISettings() {
  const [connection, setConnection] = useState(readAIConnection)
  const [url, setUrl] = useState(
    connection?.mode === 'community' ? '' : (connection?.url ?? ''),
  )
  const [code, setCode] = useState(connection?.code ?? '')
  const [enabled, setEnabled] = useState(
    connection?.mode !== 'community' && (connection?.enabled ?? false),
  )
  const [communityConsent, setCommunityConsent] = useState(
    connection?.mode === 'community' && connection.enabled,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const communityActive = connection?.mode === 'community' && connection.enabled
  const Information = communityActive ? 'details' : 'div'
  return (
    <section className="settings-section ai-settings">
      <div className="section-heading">
        <h2>Online-Foto-KI</h2>
        <ArrowUpRight size={20} />
      </div>
      {!communityActive && (
        <p className="muted section-intro">
          Ein Foto, alle Angaben. Die KI erkennt Name, Kategorie und Farbe,
          schätzt Stil und Saison und stellt dein Stück frei. Marken bleiben
          leer, wenn das Logo nicht lesbar ist.
        </p>
      )}
      <div className="settings-card ai-connection community-settings">
        <h3>
          {connection?.mode === 'community'
            ? 'Kostenlose Community-KI ist aktiv'
            : 'Kostenlose Community-KI'}
        </h3>
        {communityActive && (
          <p className="muted">
            Neue Fotos werden automatisch erkannt und freigestellt. Deine
            Freigabe ist auf diesem Gerät gespeichert.
          </p>
        )}
        <Information className="ai-provider-info">
          {communityActive && (
            <summary>Anbieter, Datenschutz und Freigabe</summary>
          )}
          <p className="muted">
            Qwen3-VL erkennt die Angaben. BiRefNet stellt dein Stück frei. Kein
            Konto, Token oder Abo nötig. Die öffentlichen Dienste können
            ausgelastet sein und Nutzungslimits haben.
          </p>
          <p className="muted">
            Der Online-Stylist vergleicht auf deinen Tipp gespeicherte Looks mit
            Qwen3-VL-8B. Dafür sendet er eine Fotoübersicht der gezeigten
            Auswahl, Kleidungsangaben, Anlass, Stilwünsche und gegebenenfalls
            Wetterwerte an Qwen3-VL-Outpost. Er lädt nicht automatisch deine
            gesamte Sammlung hoch.
          </p>
          <p className="muted">
            Dein ausgewähltes Foto wird an{' '}
            <a
              href="https://huggingface.co/spaces/prithivMLmods/Qwen3-VL-Outpost"
              target="_blank"
              rel="noreferrer"
            >
              Qwen3-VL-Outpost
            </a>{' '}
            und die{' '}
            <a
              href="https://huggingface.co/spaces/ZhengPeng7/BiRefNet_demo"
              target="_blank"
              rel="noreferrer"
            >
              BiRefNet-Demo
            </a>{' '}
            auf Hugging Face gesendet. Die Freistellung nutzt temporäre Dateien
            beim Anbieter. Wir können deren Speicher- oder Löschdauer nicht
            garantieren. Bitte keine Fotos mit privaten Hintergründen oder
            Personen verwenden.
          </p>
          <label className="ai-consent">
            <input
              type="checkbox"
              checked={communityConsent}
              onChange={(e) => {
                setCommunityConsent(e.target.checked)
                if (!e.target.checked) {
                  controller.current?.abort()
                  controller.current = null
                  setBusy(false)
                  if (connection?.mode === 'community') {
                    saveAIConnection(null)
                    setConnection(null)
                  }
                  setMessage(
                    'Community-Freigabe zurückgezogen. Neue Fotos werden nicht an diese Dienste gesendet.',
                  )
                }
              }}
            />
            <span>
              Ich erlaube, neue Kleidungsfotos automatisch an diese beiden
              Community-Dienste zu senden. Beim Online-Stylisten gebe ich die
              ausgewählten gespeicherten Fotos erst durch Starten der Beratung
              frei.
            </span>
          </label>
        </Information>
        {!communityActive && (
          <button
            className="button primary full"
            disabled={!communityConsent || busy}
            onClick={async () => {
              controller.current?.abort()
              const next = new AbortController()
              controller.current = next
              const timer = setTimeout(() => next.abort('timeout'), 60000)
              setBusy(true)
              setError('')
              setMessage('')
              const value: AIConnection = {
                mode: 'community',
                url: 'https://prithivmlmods-qwen3-vl-outpost.hf.space',
                code: '',
                enabled: true,
              }
              try {
                await checkAIConnection(value, next.signal)
                if (next.signal.aborted) return
                saveAIConnection(value)
                setConnection(value)
                setEnabled(false)
                setMessage(
                  'Kostenlose KI aktiviert. Neue Fotos werden automatisch erkannt und freigestellt.',
                )
              } catch (e) {
                if (!next.signal.aborted)
                  setError(
                    e instanceof Error
                      ? e.message
                      : 'Die Community-KI ist gerade nicht erreichbar.',
                  )
                else if (next.signal.reason === 'timeout')
                  setError(
                    'Die Community-Dienste antworten gerade zu langsam. Bitte später erneut versuchen.',
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
              <ArrowUpRight size={18} />
            )}
            Kostenlose KI aktivieren
          </button>
        )}
        {communityActive && (
          <button
            className="button secondary full"
            onClick={() => {
              controller.current?.abort()
              controller.current = null
              setBusy(false)
              saveAIConnection(null)
              setConnection(null)
              setCommunityConsent(false)
              setEnabled(false)
              setMessage(
                'Online-KI ausgeschaltet. Es werden keine neuen Fotos gesendet.',
              )
            }}
          >
            Community-KI ausschalten
          </button>
        )}
      </div>
      <details className="background-assist own-ai-server">
        <summary>Eigenen Server verbinden</summary>
        <div className="settings-card ai-connection">
          <p className="muted">
            {connection && connection.mode !== 'community'
              ? 'Dein persönlicher KI-Server ist verbunden.'
              : 'Optional für einen bereits vorhandenen eigenen Server. Hugging Face verlangt für eigene Docker-Spaces derzeit ein kostenpflichtiges Abo. Für die kostenlose Community-KI brauchst du diese Felder nicht.'}
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
              Dort werden sie verarbeitet; der MyStyle-Server speichert sie
              nicht. Meine gespeicherte Sammlung bleibt auf meinem Gerät.
            </span>
          </label>
          <button
            className="button primary full"
            disabled={busy || !enabled}
            onClick={async () => {
              const next = new AbortController()
              controller.current = next
              const timer = setTimeout(() => next.abort('timeout'), 60000)
              setBusy(true)
              setError('')
              setMessage('')
              try {
                const value = { url, code, enabled }
                await checkAIConnection(value, next.signal)
                saveAIConnection(value)
                setConnection(value)
                setCommunityConsent(false)
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
              <ArrowUpRight size={18} />
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
      </details>
      {message && (
        <p role="status" className="muted section-intro">
          {message}
        </p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </section>
  )
}
