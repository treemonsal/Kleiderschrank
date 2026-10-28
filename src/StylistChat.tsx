import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bookmark,
  Check,
  LoaderCircle,
  MessageCircle,
  Mic,
  Send,
  Square,
  Trash2,
  Volume2,
} from 'lucide-react'
import {
  readChatData,
  appendChatTurn,
  clearChat,
  saveChatLook,
} from './chat-db'
import { MAX_CHAT_INPUT, buildChatContext, chatRevision } from './chat-model'
import { CHAT_CONSENT_KEY, chatEnabled, setChatEnabled } from './chat-consent'
import { readAnswer, stopReading, useSpeechInput } from './useSpeechInput'
import { useClock } from './useWeather'
import { describeAIProblem } from './ai-errors'
import { storageError } from './db'
import { outfitKey } from './outfit-model'
import { OutfitPieces } from './OutfitPieces'
import { ErrorMessage, Sheet } from './ui'
import { StyleInterviewPanel } from './StyleInterview'
import { useVisibleNotice } from './stylist-inbox'

export function StylistChat({
  open,
  onClose,
  onOpen,
  notify,
  newInterview,
  markReplyRead,
  markInterviewRead,
}: {
  open: boolean
  onClose: () => void
  onOpen: (id: string) => void
  notify: (message: string) => void
  newInterview: boolean
  markReplyRead: (id: string) => void
  markInterviewRead: (token: string) => void
}) {
  const state = useLiveQuery(() => (open ? readChatData() : undefined), [open])
  const now = useClock()
  const revision = state ? chatRevision(state, now) : ''
  const [draft, setDraft] = useState('')
  const [enabled, setEnabled] = useState(chatEnabled)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [pending, setPending] = useState('')
  const [interviewActive, setInterviewActive] = useState(false)
  const [interviewDirty, setInterviewDirty] = useState(false)
  const [interviewBusy, setInterviewBusy] = useState(false)
  const sequence = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const active = useRef<{ revision: string; saving: boolean } | null>(null)
  const latest = useRef({ revision, open })
  latest.current = { revision, open }
  const bottom = useRef<HTMLDivElement>(null)
  const errorNotice = useRef<HTMLDivElement>(null)
  const interviewStart = useRef<HTMLDivElement>(null)
  const replyNotice = useRef<HTMLParagraphElement>(null)
  const opened = useRef(false)
  const lastReply = state?.chat?.messages
    .filter((message) => message.role === 'assistant')
    .at(-1)
  useVisibleNotice(
    replyNotice,
    open && !interviewActive ? lastReply?.id : undefined,
    markReplyRead,
  )
  const speech = useSpeechInput((text) =>
    setDraft(text.slice(0, MAX_CHAT_INPUT)),
  )
  function stopVoice() {
    stopReading()
    setReading(false)
  }
  function cancel() {
    sequence.current++
    controller.current?.abort()
    controller.current = null
    active.current = null
    setBusy(false)
    setPending('')
  }
  function close() {
    cancel()
    speech.cancel()
    stopVoice()
    setReading(false)
    setConfirmClear(false)
    onClose()
  }
  useEffect(() => {
    if (!open) {
      setInterviewActive(false)
      cancel()
      speech.cancel()
      stopVoice()
    } else setEnabled(chatEnabled())
  }, [open])
  useEffect(() => {
    if (
      active.current &&
      !active.current.saving &&
      active.current.revision !== revision
    ) {
      cancel()
      setError(
        'Dein Kontext wurde geändert. Deine Frage bleibt erhalten; sende sie erneut.',
      )
    }
  }, [revision])
  useEffect(() => {
    if (!open) {
      opened.current = false
      return
    }
    if (!state) return
    if (interviewActive) return
    if (!opened.current) {
      opened.current = true
      if (newInterview) {
        interviewStart.current?.scrollIntoView({
          block: 'start',
          behavior: 'instant',
        })
        return
      }
    }
    // Before consent, keep the introduction and provider explanation visible
    // instead of scrolling straight past them to the empty composer.
    if (!enabled && !state.chat?.messages.length) {
      bottom.current
        ?.closest('dialog')
        ?.scrollTo({ top: 0, behavior: 'instant' })
      return
    }
    const target =
      !pending && state?.chat?.messages.at(-1)?.role === 'assistant'
        ? bottom.current?.parentElement?.querySelector('article:last-of-type')
        : bottom.current
    target?.scrollIntoView({
      block: pending ? 'end' : 'start',
      behavior: 'instant',
    })
  }, [state?.chat?.revision, pending, open, !!state, interviewActive, enabled])
  useEffect(() => {
    if (open && error)
      errorNotice.current?.scrollIntoView({ block: 'end', behavior: 'instant' })
  }, [error, open])
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.key !== null && event.key !== CHAT_CONSENT_KEY) return
      const allowed = chatEnabled()
      setEnabled(allowed)
      if (!allowed) {
        cancel()
        speech.cancel()
        stopVoice()
        setError('Die Chat-Freigabe wurde ausgeschaltet.')
      }
    }
    window.addEventListener('storage', changed)
    return () => {
      window.removeEventListener('storage', changed)
      controller.current?.abort()
      stopVoice()
    }
  }, [])
  async function send() {
    if (
      !state ||
      !draft.trim() ||
      busy ||
      !enabled ||
      !chatEnabled() ||
      !navigator.onLine
    )
      return
    speech.cancel()
    stopVoice()
    setError('')
    const question = draft.trim(),
      expected = revision,
      token = ++sequence.current
    const abort = new AbortController()
    controller.current = abort
    active.current = { revision: expected, saving: false }
    setBusy(true)
    setPending(question)
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      abort.abort()
    }, 90000)
    try {
      const { askChat } = await import('./chat-service')
      const result = await askChat(
        buildChatContext(state, question),
        abort.signal,
      )
      if (
        token !== sequence.current ||
        !latest.current.open ||
        latest.current.revision !== expected ||
        !chatEnabled()
      )
        return
      active.current!.saving = true
      await appendChatTurn(question, result, expected, abort.signal)
      if (token === sequence.current) {
        setDraft('')
        setPending('')
        setError('')
      }
    } catch (error) {
      if (token === sequence.current)
        setError(
          timedOut
            ? 'Die Antwort dauert zu lange. Deine Frage bleibt erhalten.'
            : abort.signal.aborted
              ? ''
              : error instanceof Error && !(error.name === 'AIProviderError')
                ? error.message
                : describeAIProblem('KI-Chat', error),
        )
    } finally {
      window.clearTimeout(timeout)
      if (token === sequence.current) {
        setBusy(false)
        setPending('')
        active.current = null
        controller.current = null
      }
    }
  }
  if (!open) return null
  const messages = state?.chat?.messages ?? []
  return (
    <Sheet
      className="chat-sheet"
      title="Stylist"
      eyebrow="Chat"
      dirty={interviewDirty}
      closeDisabled={saving || interviewBusy}
      onClose={close}
    >
      <div className="stylist-chat">
        {state && (
          <div ref={interviewStart} className="interview-start">
            <StyleInterviewPanel
              preferences={state.preferences}
              markRead={markInterviewRead}
              notify={notify}
              onActiveChange={(active) => {
                if (active) {
                  speech.cancel()
                  stopVoice()
                }
                setInterviewActive(active)
              }}
              onDirtyChange={setInterviewDirty}
              onBusyChange={setInterviewBusy}
              disabled={busy || saving}
            />
          </div>
        )}
        {!interviewActive && (
          <>
            {enabled && (
              <details className="stylist-disclosure chat-context">
                <summary>Dein Kontext &amp; Chat-Einstellungen</summary>
                <p>
                  Pro Frage gesendet: bis zu 40 Kleidungsangaben mit Notizen und
                  Tragehäufigkeit, bis zu zwölf Fotos als beschriftete Collage,
                  Vorlieben, Antworten aus dem Stilgespräch, Bewertungen,
                  Temperaturempfinden, freigegebene Wetterwerte und die letzten
                  sechs Nachrichten. Der Verlauf bleibt auf diesem Gerät und
                  wird gesichert; beim Anbieter gelten dessen
                  Speicherbedingungen. Vorschläge ändern deine Sammlung erst
                  beim Speichern.
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    try {
                      setChatEnabled(false)
                      setEnabled(false)
                      cancel()
                      speech.cancel()
                      stopVoice()
                    } catch {
                      setError('Die Freigabe konnte nicht gespeichert werden.')
                    }
                  }}
                >
                  Online-Chat ausschalten
                </button>
              </details>
            )}
            {!!messages.length && (
              <div className="chat-toolbar">
                <span className="micro-copy">
                  {Math.ceil(messages.length / 2) === 1
                    ? '1 Gesprächsrunde'
                    : `${Math.ceil(messages.length / 2)} Gesprächsrunden`}
                </span>
                <button
                  className="text-button"
                  disabled={saving}
                  onClick={() => {
                    cancel()
                    speech.cancel()
                    setConfirmClear(true)
                  }}
                >
                  <Trash2 size={16} /> Neues Gespräch
                </button>
              </div>
            )}
            {confirmClear && (
              <div className="delete-confirm">
                <p>
                  Gespräch auf diesem Gerät löschen? Deine Kleidung und
                  Stilvorlieben bleiben erhalten. Eine vorhandene Sicherung kann
                  den alten Verlauf weiterhin enthalten.
                </p>
                <div className="photo-actions">
                  <button
                    className="button secondary"
                    disabled={saving}
                    onClick={() => setConfirmClear(false)}
                  >
                    Behalten
                  </button>
                  <button
                    className="button danger"
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true)
                      setError('')
                      cancel()
                      stopVoice()
                      try {
                        await clearChat()
                        setDraft('')
                        setConfirmClear(false)
                        notify('Ein neues Gespräch ist bereit.')
                      } catch (error) {
                        setError(storageError(error))
                      } finally {
                        setSaving(false)
                      }
                    }}
                  >
                    Gespräch löschen
                  </button>
                </div>
              </div>
            )}
            {!state ? (
              <p role="status">Dein Gespräch wird geladen …</p>
            ) : (
              <>
                <div
                  className="chat-messages"
                  role="log"
                  aria-label="Gespräch mit deinem Stylisten"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {enabled && !messages.length && !busy && (
                    <div className="chat-empty">
                      <MessageCircle size={25} />
                      <h3>Frag einfach</h3>
                      <p className="muted">
                        Zum Beispiel: „Was passt zu meinem blauen Hemd?“ Danach
                        kannst du direkt nachfragen.
                      </p>
                      <div className="chat-starters">
                        {[
                          'Was passt heute zu meinem Stil?',
                          'Wie mache ich meinen Look eleganter?',
                          'Welche Farben kann ich kombinieren?',
                        ].map((text) => (
                          <button
                            key={text}
                            className="chip"
                            onClick={() => setDraft(text)}
                          >
                            {text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((message) => (
                    <article
                      key={message.id}
                      className={`chat-message ${message.role}`}
                      aria-label={
                        message.role === 'user'
                          ? 'Deine Nachricht'
                          : 'Antwort deines Stylisten'
                      }
                    >
                      <p className="chat-author">
                        {message.role === 'user' ? 'Du' : 'MyStyle'}
                      </p>
                      <p
                        className="chat-text"
                        ref={
                          message.id === lastReply?.id ? replyNotice : undefined
                        }
                      >
                        {message.text}
                      </p>
                      {message.look && (
                        <>
                          <OutfitPieces
                            ids={message.look.garmentIds}
                            items={state.garments}
                            onOpen={(id) => {
                              close()
                              onOpen(id)
                            }}
                          />
                          <button
                            className="button secondary"
                            disabled={
                              saving ||
                              busy ||
                              state.outfits.some(
                                (outfit) =>
                                  outfitKey(outfit.garmentIds) ===
                                  outfitKey(message.look!.garmentIds),
                              )
                            }
                            onClick={async () => {
                              setSaving(true)
                              setError('')
                              try {
                                await saveChatLook(message.id)
                                notify(
                                  'Der Look aus deinem Gespräch ist gespeichert.',
                                )
                              } catch (error) {
                                setError(storageError(error))
                              } finally {
                                setSaving(false)
                              }
                            }}
                          >
                            {state.outfits.some(
                              (outfit) =>
                                outfitKey(outfit.garmentIds) ===
                                outfitKey(message.look!.garmentIds),
                            ) ? (
                              <Check size={16} />
                            ) : (
                              <Bookmark size={16} />
                            )}{' '}
                            Look speichern
                          </button>
                        </>
                      )}
                      {message.role === 'assistant' &&
                        !!window.speechSynthesis && (
                          <button
                            className="text-button"
                            aria-label="Antwort vorlesen"
                            onClick={() => {
                              const started = readAnswer(
                                message.text,
                                () => setReading(false),
                                () =>
                                  setError(
                                    'Die Browserstimme konnte die Antwort nicht vorlesen. Du kannst sie weiterhin lesen.',
                                  ),
                              )
                              setReading(started)
                              if (!started)
                                setError(
                                  'Vorlesen ist in diesem Browser nicht verfügbar.',
                                )
                            }}
                          >
                            <Volume2 size={16} /> Vorlesen
                          </button>
                        )}
                    </article>
                  ))}
                  {busy && (
                    <>
                      <article className="chat-message user">
                        <p className="chat-author">Du</p>
                        <p className="chat-text">{pending}</p>
                      </article>
                      <p className="chat-thinking" role="status">
                        <LoaderCircle size={17} className="spin" /> MyStyle
                        überlegt …
                      </p>
                    </>
                  )}
                  <div ref={bottom} />
                </div>
                {enabled && (
                  <form
                    className="chat-composer"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void send()
                    }}
                  >
                    <label className="field">
                      Deine Nachricht
                      <textarea
                        value={draft}
                        maxLength={MAX_CHAT_INPUT}
                        rows={2}
                        disabled={busy || saving || speech.listening}
                        placeholder="Frag nach deinem nächsten Look …"
                        onChange={(event) => setDraft(event.target.value)}
                      />
                    </label>
                    <div className="chat-composer-actions">
                      <span className="micro-copy">
                        {draft.length}/{MAX_CHAT_INPUT}
                      </span>
                      {speech.supported && (
                        <button
                          type="button"
                          className={`icon-button ${speech.listening ? 'liked' : ''}`}
                          disabled={busy || saving}
                          aria-label={
                            speech.listening
                              ? 'Diktieren beenden'
                              : 'Nachricht diktieren'
                          }
                          aria-pressed={speech.listening}
                          onClick={() =>
                            speech.listening
                              ? speech.finish()
                              : speech.start(draft)
                          }
                        >
                          {speech.listening ? (
                            <Square size={18} />
                          ) : (
                            <Mic size={20} />
                          )}
                        </button>
                      )}
                      <button
                        className="button primary"
                        disabled={
                          !enabled ||
                          confirmClear ||
                          !draft.trim() ||
                          busy ||
                          saving ||
                          speech.listening ||
                          !navigator.onLine
                        }
                      >
                        <Send size={17} /> Senden
                      </button>
                      {busy && (
                        <button
                          type="button"
                          className="text-button"
                          onClick={cancel}
                        >
                          Antwort abbrechen
                        </button>
                      )}
                    </div>
                    {speech.listening && (
                      <p className="micro-copy" role="status">
                        Ich höre zu … Die Nachricht wird erst mit „Senden“
                        abgeschickt.
                      </p>
                    )}
                    <p className="micro-copy">
                      {speech.supported
                        ? 'Sprache nutzt Browserdienste; Audio oder Text kann an deren Anbieter gehen. Kein automatisches Senden.'
                        : window.speechSynthesis
                          ? 'Diktieren geht auch mit der Handy-Tastatur. Vorlesen nutzt Browserdienste; Text kann an deren Anbieter gehen.'
                          : 'Du kannst auch die Diktierfunktion deiner Handy-Tastatur verwenden.'}
                    </p>
                    {reading && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          stopVoice()
                          setReading(false)
                        }}
                      >
                        Vorlesen stoppen
                      </button>
                    )}
                    {!navigator.onLine && (
                      <p className="muted" role="status">
                        Zum Antworten braucht der Chat Internet. Dein Verlauf
                        bleibt lesbar.
                      </p>
                    )}
                    {speech.error && (
                      <ErrorMessage>{speech.error}</ErrorMessage>
                    )}
                  </form>
                )}
              </>
            )}
            {!enabled && (
              <section className="chat-welcome">
                <MessageCircle size={28} strokeWidth={1.4} />
                <h3>Was möchtest du heute tragen?</h3>
                <p className="muted">
                  Gesendet werden deine Frage, bis zu zwölf Fotos und passende
                  Angaben an kostenlose KI-Dienste.
                </p>
                <button
                  className="button primary full"
                  onClick={() => {
                    try {
                      setChatEnabled(true)
                      setEnabled(true)
                      setError('')
                    } catch {
                      setError(
                        'Die Chat-Freigabe konnte nicht auf diesem Gerät gespeichert werden.',
                      )
                    }
                  }}
                >
                  Kostenlosen Chat aktivieren
                </button>
              </section>
            )}
            {error && (
              <div ref={errorNotice}>
                <ErrorMessage>{error}</ErrorMessage>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  )
}
