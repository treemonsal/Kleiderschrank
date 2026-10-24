import { useEffect, useRef, useState } from 'react'
import { Check, LoaderCircle, MessageCircle } from 'lucide-react'
import {
  stylistEnabled,
  AI_CONNECTION_KEY,
  AI_CONNECTION_CHANGED,
} from './cloud-ai'
import {
  stylistPieces,
  stylistRevision,
  type StylistInput,
  type StylistAdvice,
} from './stylist-model'
import { describeAIProblem } from './ai-errors'
import type { OutfitCandidate } from './outfit-model'
import { OutfitPieces } from './OutfitPieces'
import { ErrorMessage } from './ui'
import { storageError } from './db'

export function OnlineStylist({
  input,
  onOpen,
  onApply,
  applyLabel,
}: {
  input: StylistInput
  onOpen: (id: string) => void
  onApply: (candidate: OutfitCandidate) => Promise<void>
  applyLabel: string
}) {
  const [wish, setWish] = useState('')
  const [enabled, setEnabled] = useState(stylistEnabled)
  const revision = stylistRevision(input) + wish
  const latest = useRef(revision)
  latest.current = revision
  const controller = useRef<AbortController | null>(null)
  const sequence = useRef(0)
  const [busy, setBusy] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState<string>()
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    revision: string
    advice: StylistAdvice
  }>()
  const advice = result?.revision === revision ? result.advice : undefined
  const pieces = stylistPieces(input)
  const photoCount = pieces.filter((item) => item.cutout || item.photo).length
  useEffect(() => {
    setError('')
    setResult(undefined)
    setApplied(undefined)
    setBusy(false)
    return () => {
      sequence.current++
      controller.current?.abort()
    }
  }, [revision])
  useEffect(() => {
    const changed = (event: Event) => {
      if (
        event.type === 'storage' &&
        (event as StorageEvent).key !== null &&
        (event as StorageEvent).key !== AI_CONNECTION_KEY
      )
        return
      const next = stylistEnabled()
      setEnabled(next)
      if (!next) {
        sequence.current++
        controller.current?.abort()
        setBusy(false)
        setResult(undefined)
        setError('Die Community-Freigabe wurde zurückgezogen.')
      }
    }
    window.addEventListener('storage', changed)
    window.addEventListener(AI_CONNECTION_CHANGED, changed)
    return () => {
      window.removeEventListener('storage', changed)
      window.removeEventListener(AI_CONNECTION_CHANGED, changed)
    }
  }, [])
  async function request() {
    const request = ++sequence.current,
      expected = revision
    const active = new AbortController()
    controller.current?.abort()
    controller.current = active
    setBusy(true)
    setResult(undefined)
    setError('')
    setApplied(undefined)
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      active.abort()
    }, 90000)
    try {
      const { askStylist } = await import('./outfit-stylist')
      const advice = await askStylist(input, wish, active.signal)
      if (
        request === sequence.current &&
        expected === latest.current &&
        stylistEnabled()
      )
        setResult({ revision: expected, advice })
    } catch (error) {
      if (request === sequence.current && expected === latest.current) {
        setError(
          timedOut
            ? 'Die Outfit-Beratung dauert zu lange. Dein bisheriger Look bleibt erhalten.'
            : active.signal.aborted
              ? ''
              : !stylistEnabled()
                ? 'Aktiviere die kostenlose Community-KI unter Mehr → Online-Foto-KI.'
                : describeAIProblem('Outfit-Beratung', error),
        )
      }
    } finally {
      window.clearTimeout(timeout)
      if (controller.current === active) controller.current = null
      if (request === sequence.current) setBusy(false)
    }
  }
  return (
    <section className="online-stylist" aria-label="Online-Stylist">
      <h2>
        <MessageCircle size={19} /> Dein Online-Stylist
      </h2>
      {enabled ? (
        <>
          <p className="muted">
            {photoCount
              ? 'Lass Qwen deine Looks anhand der Fotos vergleichen.'
              : 'Lass Qwen deine Looks anhand der Kleidungsangaben vergleichen. Ohne Fotos ist keine visuelle Einschätzung möglich.'}
          </p>
          <details className="stylist-disclosure">
            <summary>Was wird gesendet?</summary>
            <p>
              Erst beim Start gehen bis zu {photoCount} gespeicherte
              Kleidungsfotos als Übersicht, ihre Angaben, Anlass, dein
              Stilprofil, aus deinen Bewertungen abgeleitete Vorlieben, dein
              Wunsch und gegebenenfalls die Wettervorhersage an Qwen3-VL-Outpost
              auf Hugging Face. Keine Standortkoordinaten oder vollständige
              Sicherung. Der Community-Dienst kann Inhalte speichern; Löschdauer
              und Verfügbarkeit sind nicht garantiert. Die Auswahl bleibt auf
              vorhandene, verfügbare Kombinationen begrenzt.
            </p>
          </details>
          <label className="field">
            Dein Wunsch (optional)
            <input
              value={wish}
              maxLength={400}
              disabled={busy || applying}
              placeholder="Zum Beispiel: etwas eleganter, ohne neue Teile"
              onChange={(event) => setWish(event.target.value)}
            />
          </label>
        </>
      ) : (
        <p className="muted">
          Ausgeschaltet. Aktiviere die kostenlose Community-KI unter Mehr →
          Online-Foto-KI, dann vergleicht Qwen deine Looks.
        </p>
      )}
      <div className="stylist-actions">
        <button
          className="button secondary"
          disabled={busy || applying || !enabled}
          onClick={() => void request()}
        >
          {busy ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <MessageCircle size={17} />
          )}
          {busy
            ? 'Looks werden verglichen …'
            : advice
              ? 'Erneut online beraten'
              : 'Looks online vergleichen'}
        </button>
        {busy && (
          <button
            className="text-button"
            onClick={() => {
              sequence.current++
              controller.current?.abort()
              setBusy(false)
            }}
          >
            Beratung abbrechen
          </button>
        )}
      </div>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {advice && (
        <div className="stylist-result" role="status">
          <p className="eyebrow">
            {photoCount
              ? 'QWEN · VISUELLE OUTFIT-BERATUNG'
              : 'QWEN · OUTFIT-BERATUNG NACH ANGABEN'}
          </p>
          <p>{advice.reason}</p>
          <OutfitPieces
            ids={advice.candidate.garmentIds}
            items={input.items}
            onOpen={onOpen}
          />
          <details className="stylist-disclosure">
            <summary>Stylingtipps</summary>
            <ul>
              {advice.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </details>
          {advice.caveat && <p className="muted">{advice.caveat}</p>}
          <button
            className="button primary"
            disabled={applying || applied === revision}
            onClick={async () => {
              setApplying(true)
              setError('')
              try {
                await onApply(advice.candidate)
                setApplied(revision)
              } catch (error) {
                setError(storageError(error))
              } finally {
                setApplying(false)
              }
            }}
          >
            <Check size={17} />
            {applying
              ? 'Wird gespeichert …'
              : applied === revision
                ? 'Gespeichert'
                : applyLabel}
          </button>
        </div>
      )}
    </section>
  )
}
