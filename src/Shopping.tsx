import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowUpRight, LoaderCircle } from 'lucide-react'
import { readShoppingData, saveShoppingPreferences } from './shopping-db'
import {
  shoppingEvidence,
  shoppingLink,
  shoppingOptions,
  shoppingRevision,
  shoppingTarget,
  type ShoppingIdea,
  type ShoppingPreferences,
} from './shopping-model'
import {
  SHOPPING_CONSENT_CHANGED,
  SHOPPING_CONSENT_KEY,
  setShoppingEnabled,
  shoppingEnabled,
} from './shopping-consent'
import { ErrorMessage, GarmentPicture, Sheet } from './ui'
import { describeAIProblem } from './ai-errors'
import { useClock } from './useWeather'

export function ShoppingCard({ hideLocked = false }: { hideLocked?: boolean }) {
  const data = useLiveQuery(() => readShoppingData())
  const now = useClock()
  const evidence = data ? shoppingEvidence(data, now) : undefined
  const revision = data ? shoppingRevision(data, now) : ''
  const latest = useRef(revision)
  latest.current = revision
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(shoppingEnabled)
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [answer, setAnswer] = useState<{
    revision: string
    ideas: ShoppingIdea[]
  }>()
  const controller = useRef<AbortController | null>(null)
  const resultStart = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = resultStart.current
    if (!open || !answer || answer.revision !== revision || !element) return
    const header = element.closest('dialog')?.querySelector('.sheet-header')
    element.style.scrollMarginTop = `${(header?.getBoundingClientRect().height ?? 160) + 16}px`
    element.focus({ preventScroll: true })
    element.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    })
  }, [answer, open, revision])
  function cancel() {
    controller.current?.abort()
    controller.current = null
    setBusy(false)
  }
  useEffect(() => {
    const interrupted = !!controller.current
    cancel()
    setAnswer(undefined)
    setError(
      interrupted
        ? 'Dein Stil, Bestand oder Budget wurde geändert. Starte die Beratung erneut.'
        : '',
    )
  }, [revision])
  useEffect(() => {
    const changed = (event: Event) => {
      if (
        event.type === 'storage' &&
        (event as StorageEvent).key !== null &&
        (event as StorageEvent).key !== SHOPPING_CONSENT_KEY
      )
        return
      setEnabled(shoppingEnabled())
      cancel()
      setAnswer(undefined)
      setError('')
    }
    window.addEventListener('storage', changed)
    window.addEventListener(SHOPPING_CONSENT_CHANGED, changed)
    return () => {
      controller.current?.abort()
      window.removeEventListener('storage', changed)
      window.removeEventListener(SHOPPING_CONSENT_CHANGED, changed)
    }
  }, [])
  function consent(value: boolean) {
    try {
      setShoppingEnabled(value)
    } catch {
      setError(
        'Die Shopping-Freigabe konnte nicht gespeichert werden. Bitte erlaube lokale Speicherung.',
      )
    }
  }
  async function options(
    value: Partial<Pick<ShoppingPreferences, 'maxPriceCHF' | 'assortment'>>,
  ) {
    setSaving(true)
    setError('')
    cancel()
    setAnswer(undefined)
    try {
      await saveShoppingPreferences(value)
    } catch {
      setError(
        'Dein Budget konnte nicht gespeichert werden. Bitte versuche es erneut.',
      )
    } finally {
      setSaving(false)
    }
  }
  async function start() {
    cancel()
    const active = new AbortController()
    controller.current = active
    const expected = latest.current
    const timeout = setTimeout(() => active.abort('timeout'), 10 * 60 * 1000)
    setBusy(true)
    setError('')
    setAnswer(undefined)
    try {
      const current = await readShoppingData()
      active.signal.throwIfAborted()
      if (
        !shoppingEnabled() ||
        !shoppingEvidence(current).ready ||
        shoppingRevision(current) !== expected
      )
        throw new Error(
          'Dein Stil oder Budget wurde geändert. Prüfe die Auswahl und starte erneut.',
        )
      const { requestShopping } = await import('./shopping-service')
      active.signal.throwIfAborted()
      const ideas = await requestShopping(current, active.signal)
      const fresh = await readShoppingData()
      active.signal.throwIfAborted()
      if (
        !shoppingEnabled() ||
        !shoppingEvidence(fresh).ready ||
        shoppingRevision(fresh) !== expected ||
        latest.current !== expected
      )
        throw new Error(
          'Dein Kleiderschrank oder Budget wurde geändert. Starte die Beratung erneut.',
        )
      setAnswer({ revision: expected, ideas })
    } catch (error) {
      if (!active.signal.aborted)
        setError(
          error instanceof Error && error.name !== 'AIProviderError'
            ? error.message
            : describeAIProblem('Shopping-Beratung', error),
        )
      else if (active.signal.reason === 'timeout')
        setError(
          'Die Beratung dauert zu lange. Dein Budget ist gespeichert; versuche es später erneut.',
        )
    } finally {
      clearTimeout(timeout)
      if (controller.current === active) {
        controller.current = null
        setBusy(false)
      }
    }
  }
  if (!data || !evidence || (!evidence.ready && hideLocked && !open))
    return null
  const config = shoppingOptions(data.preferences)
  const result =
    answer?.revision === revision && enabled && evidence.ready
      ? answer.ideas
      : undefined
  return (
    <>
      <section
        className="shopping-card"
        aria-label="Persönliche Shopping-Beratung"
      >
        <p className="eyebrow">Shopping</p>
        <h2>{evidence.ready ? 'Kaufideen' : 'Shopping'}</h2>
        <p className="muted">
          {evidence.ready
            ? 'Kleine Ergänzungen, die zu deinen Lieblingslooks passen. Lieber unter 50 CHF, höchstens 100 CHF pro Stück.'
            : 'Erst deinen Stil kennenlernen, dann passende Kaufideen anbieten.'}
        </p>
        {evidence.ready ? (
          <button
            className="button secondary"
            type="button"
            onClick={() => setOpen(true)}
          >
            Mit KI günstig shoppen <ArrowUpRight size={18} />
          </button>
        ) : (
          <details className="shopping-progress">
            <summary>Wann wird Shopping freigeschaltet?</summary>
            <p className="micro-copy">
              Diese Hinweise aus deinem Bestand reichen für erste persönliche
              Ideen, nicht für eine perfekte Stilvorhersage.
            </p>
            <ul>
              <li>
                <span aria-hidden="true">{evidence.profile ? '✓' : '○'}</span>{' '}
                Stilcheck oder drei vertiefte Antworten{' '}
                {evidence.profile ? 'abgeschlossen' : 'noch offen'}
              </li>
              <li>
                <span aria-hidden="true">{evidence.days >= 7 ? '✓' : '○'}</span>{' '}
                {Math.min(7, evidence.days)} von 7 bestätigten Tragetagen in den
                letzten 90 Tagen
              </li>
              <li>
                <span aria-hidden="true">
                  {evidence.span >= 14 ? '✓' : '○'}
                </span>{' '}
                {Math.min(14, evidence.span)} von 14 Tagen seit dem ersten
                dieser Tragetage
              </li>
              <li>
                <span aria-hidden="true">
                  {evidence.ratings >= 3 && evidence.likes >= 2 ? '✓' : '○'}
                </span>{' '}
                {Math.min(3, evidence.ratings)} von 3 unterschiedlichen Looks
                bewertet, davon {Math.min(2, evidence.likes)} von 2 positiv
              </li>
            </ul>
            <p className="micro-copy">
              Bestätige getragene Looks im Kalender und nutze die Daumen an
              deinen Outfits. Geplante Tage und wiederholte Bewertungen
              desselben Looks zählen nicht zusätzlich.
            </p>
          </details>
        )}
        {!evidence.ready && enabled && (
          <button
            type="button"
            className="text-button"
            onClick={() => consent(false)}
          >
            Shopping-KI ausschalten
          </button>
        )}
        {!open && error && <ErrorMessage>{error}</ErrorMessage>}
      </section>
      {open && (
        <Sheet
          title="Kaufideen"
          eyebrow="Shopping"
          closeDisabled={saving}
          onClose={() => {
            cancel()
            setOpen(false)
          }}
        >
          <p className="muted">
            Persönliche Ergänzungen für deine vorhandenen Looks. Die Links
            öffnen Suchideen mit Preisfilter bei Zalando Schweiz; aktuelle
            Angebote und Preise stehen im Shop.
          </p>
          <div className="field-row">
            <label className="field">
              Höchstens pro Stück
              <select
                aria-label="Höchstens pro Stück"
                value={config.maxPriceCHF}
                disabled={saving || busy}
                onChange={(event) =>
                  void options({
                    maxPriceCHF: Number(event.target.value),
                  })
                }
              >
                {[25, 50, 75, 100].map((value) => (
                  <option key={value} value={value}>
                    {value} CHF
                  </option>
                ))}
                {![25, 50, 75, 100].includes(config.maxPriceCHF) && (
                  <option value={config.maxPriceCHF}>
                    {config.maxPriceCHF} CHF
                  </option>
                )}
              </select>
            </label>
            <label className="field">
              Sortiment
              <select
                aria-label="Sortiment"
                value={config.assortment}
                disabled={saving || busy}
                onChange={(event) =>
                  void options({
                    assortment: event.target
                      .value as ShoppingPreferences['assortment'],
                  })
                }
              >
                <option value="all">Alle / offen</option>
                <option value="women">Damen</option>
                <option value="men">Herren</option>
              </select>
            </label>
          </div>
          <p className="micro-copy" role="status">
            {saving
              ? 'Auswahl wird gespeichert …'
              : `Gespeichertes Limit: ${config.maxPriceCHF} CHF. Bevorzugt bis ${Math.min(50, config.maxPriceCHF)} CHF, Accessoires bis ${Math.min(25, config.maxPriceCHF)} CHF.`}
          </p>
          {!evidence.ready && (
            <ErrorMessage>
              Die Grundlage für persönliche Kaufideen hat sich geändert. Sammle
              erst wieder die angezeigten Stilhinweise.
            </ErrorMessage>
          )}
          <details className="shopping-information">
            <summary>Was für die Beratung verwendet wird</summary>
            <p className="micro-copy">
              Beim Start gehen dein bestätigtes Stilprofil, abgeleitete
              Bewertungen und Tragehäufigkeiten, Bestandszahlen, bis zu 40
              Kleidungsangaben, Budget und gewähltes Sortiment an den
              kostenlosen Qwen3-VL-Outpost-Dienst auf Hugging Face. Fotos,
              Chatverlauf, Notizen und Standort werden nicht gesendet. Die
              Freigabe gilt nur auf diesem Gerät und lässt sich hier
              zurücknehmen. Der Dienst kann Daten speichern, warten lassen oder
              Nutzungslimits haben.
            </p>
          </details>
          <label className="accessory-option">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => consent(event.target.checked)}
            />
            Ich erlaube die Online-Shopping-Beratung mit diesen Stil- und
            Kleidungsangaben.
          </label>
          {busy ? (
            <div>
              <p className="ai-progress" role="status">
                <LoaderCircle className="spin" size={18} />
                Deine Garderobe wird auf passende Ergänzungen geprüft …
              </p>
              <button
                className="button secondary"
                type="button"
                onClick={() => {
                  cancel()
                  setError(
                    'Beratung abgebrochen. Dein Budget bleibt gespeichert.',
                  )
                }}
              >
                Shopping-Beratung abbrechen
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="button primary full"
              disabled={!enabled || !evidence.ready || saving}
              onClick={() => void start()}
            >
              {result ? 'Neue Kaufideen finden' : 'Passende Kaufideen finden'}
            </button>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {result && (
            <div
              className="shopping-ideas"
              role="status"
              ref={resultStart}
              tabIndex={-1}
              aria-label="Deine Kaufideen"
            >
              {result.length === 0 ? (
                <p>
                  Die KI sieht gerade keine sinnvolle Ergänzung. Du kannst
                  zuerst neue Looks aus deinem Bestand ausprobieren.
                </p>
              ) : (
                result.map((idea, index) => {
                  const target = shoppingTarget(idea, config.maxPriceCHF)
                  return (
                    <article
                      className="shopping-idea"
                      key={`${idea.name}:${index}`}
                    >
                      <p className="eyebrow">
                        Idee {index + 1} · bis {target} CHF
                      </p>
                      <h3>{idea.name}</h3>
                      <p>{idea.why}</p>
                      <p className="micro-copy">
                        Kombinierbar mit diesen vorhandenen Stücken:
                      </p>
                      <div className="shopping-pairings">
                        {idea.withIds.map((id) => {
                          const item = data.garments.find(
                            (item) => item.id === id,
                          )!
                          return (
                            <div key={id}>
                              <GarmentPicture item={item} />
                              <span>{item.name}</span>
                            </div>
                          )
                        })}
                      </div>
                      <a
                        className="button secondary full"
                        href={shoppingLink(idea, config, target)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Bis {target} CHF bei Zalando suchen{' '}
                        <ArrowUpRight size={17} />
                      </a>
                      {target < config.maxPriceCHF && (
                        <a
                          className="text-button"
                          href={shoppingLink(idea, config)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Suche bis {config.maxPriceCHF} CHF erweitern{' '}
                          <ArrowUpRight size={15} />
                        </a>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          )}
          <p className="micro-copy">
            Prüfe im Shop den aktiven Preisfilter, den aktuellen Einzelpreis,
            die Währung und Versandkosten. Preise und Verfügbarkeit können sich
            ändern; Grössen und Passform kennst du selbst am besten. Der Kauf
            findet im Shop statt. MyStyle erhält keine Provision und bestellt
            nichts automatisch.
          </p>
        </Sheet>
      )}
    </>
  )
}
