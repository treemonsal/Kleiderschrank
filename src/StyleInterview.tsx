import { useEffect, useRef, useState } from 'react'
import type { Preferences } from './outfit-model'
import { storageError } from './db'
import {
  updateStyleInterview,
  type InterviewChange,
} from './style-interview-db'
import {
  MAX_STYLE_ANSWER,
  STYLE_QUESTIONS,
  interviewNotice,
  nextStyleQuestion,
  type StyleQuestionId,
} from './style-interview'
import { useVisibleNotice } from './stylist-inbox'
import { ErrorMessage } from './ui'

export function StyleInterviewPanel({
  preferences,
  markRead,
  notify,
  onActiveChange,
  disabled = false,
}: {
  preferences: Preferences
  markRead: (token: string) => void
  notify: (message: string) => void
  onActiveChange: (active: boolean) => void
  disabled?: boolean
}) {
  const interview = preferences.styleInterview
  const card = useRef<HTMLElement>(null)
  const visibleQuestion = useRef<HTMLHeadingElement>(null)
  const token = interviewNotice(preferences)
  const [expanded, setExpanded] = useState(false)
  useVisibleNotice(visibleQuestion, token, markRead, expanded)
  const expectedRevision = useRef<string | null>(interview?.updatedAt ?? null)
  const conflict =
    expanded && expectedRevision.current !== (interview?.updatedAt ?? null)
  const [editing, setEditing] = useState<StyleQuestionId>()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const next = nextStyleQuestion(interview)
  const question = editing
    ? STYLE_QUESTIONS.find((q) => q.id === editing)
    : next
  const answers = Object.entries(interview?.answers ?? {})
  const covered = answers.length + (interview?.skipped.length ?? 0)
  const completed = interview?.status === 'completed'
  useEffect(() => {
    if (expanded && question) {
      visibleQuestion.current?.focus({ preventScroll: true })
      visibleQuestion.current?.scrollIntoView({
        block: 'start',
        behavior: 'instant',
      })
    }
  }, [expanded, question?.id])
  async function act(change: InterviewChange) {
    setBusy(true)
    setError('')
    try {
      const updated = await updateStyleInterview(
        change,
        expanded ? expectedRevision.current : (interview?.updatedAt ?? null),
      )
      expectedRevision.current = updated.updatedAt
      setDraft('')
      setEditing(undefined)
      setConfirmReset(false)
      if (change.type === 'dismiss' || change.type === 'reset') {
        setExpanded(false)
        onActiveChange(false)
        notify(
          change.type === 'reset'
            ? 'Die vertieften Antworten wurden gelöscht.'
            : 'Die Einladung ist ausgeblendet. Du kannst das Stilgespräch jederzeit selbst öffnen.',
        )
      } else if (change.type === 'complete') {
        setExpanded(false)
        onActiveChange(false)
        notify('Dein vertieftes Stilprofil ist gespeichert.')
      }
      return updated
    } catch (error) {
      setError(storageError(error))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  async function begin() {
    if (!interview || interview.status === 'dismissed') {
      if (!(await act({ type: 'start' }))) return
    } else expectedRevision.current = interview.updatedAt
    setExpanded(true)
    onActiveChange(true)
  }
  if (interview?.status === 'dismissed' && !expanded)
    return (
      <section
        className="style-interview-dismissed"
        aria-label="Freiwilliges Stilgespräch"
      >
        <button
          className="text-button"
          disabled={disabled || busy}
          onClick={() => void begin()}
        >
          Stilgespräch starten
        </button>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </section>
    )
  return (
    <section
      className="style-interview"
      ref={card}
      aria-label="Freiwilliges Stilgespräch"
    >
      <p className="eyebrow">DEIN STIL · EIN BISSCHEN GENAUER</p>
      <h3 ref={!expanded ? visibleQuestion : undefined}>
        {completed
          ? 'Dein Stil, in deinen Worten.'
          : interview?.status === 'in-progress'
            ? !expanded && next
              ? next.title
              : 'Dein Stilgespräch.'
            : 'Mehr als drei kurze Antworten.'}
      </h3>
      {!expanded && (
        <p className="muted">
          {completed
            ? `${answers.length} bestätigte Antworten für persönlichere Beratung.`
            : 'Optional · acht Fragen zu deinem Alltag und Geschmack. Überspringen und Pausieren sind jederzeit möglich.'}
        </p>
      )}
      {expanded && (
        <p className="interview-disclosure">
          Bestätigte Antworten werden direkt gespeichert und bei einer bewusst
          gestarteten Online-Beratung mitgesendet. Das Stilgespräch funktioniert
          auch offline.
        </p>
      )}
      {!expanded ? (
        <div className="style-check-actions">
          <button
            className="button secondary"
            disabled={disabled || busy}
            onClick={() => void begin()}
          >
            {completed
              ? 'Antworten ansehen & ändern'
              : interview?.status === 'in-progress'
                ? 'Stilgespräch fortsetzen'
                : 'Stilgespräch starten'}
          </button>
          {!interview && (
            <button
              className="text-button"
              disabled={disabled || busy}
              onClick={() => void act({ type: 'dismiss' })}
            >
              Keine weiteren Fragen
            </button>
          )}
        </div>
      ) : (
        <div className="interview-conversation">
          {conflict && !busy && (
            <div role="alert">
              <p>
                Deine Antworten wurden in einem anderen Fenster geändert. Lade
                den gespeicherten Stand, bevor du weitermachst.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  expectedRevision.current = interview?.updatedAt ?? null
                  setDraft('')
                  setEditing(undefined)
                  setError('')
                }}
              >
                Neu laden und Entwurf verwerfen
              </button>
            </div>
          )}
          {!completed && (
            <p className="micro-copy">
              {covered} von {STYLE_QUESTIONS.length} Fragen bearbeitet ·{' '}
              {answers.length} beantwortet
            </p>
          )}
          {question && (!completed || editing) ? (
            <div
              className="interview-question"
              key={`${question.id}:${interview?.updatedAt}`}
            >
              <p className="chat-author">
                Stilgespräch · Frage {STYLE_QUESTIONS.indexOf(question) + 1}
              </p>
              <h4 ref={visibleQuestion} tabIndex={-1}>
                {question.title}
              </h4>
              <p className="muted">{question.hint}</p>
              {'choices' in question ? (
                <div
                  className="interview-choices"
                  role="group"
                  aria-label={question.title}
                >
                  {question.choices.map((choice) => (
                    <button
                      key={choice}
                      className={`chip ${draft === choice ? 'active' : ''}`}
                      aria-pressed={draft === choice}
                      disabled={busy || disabled || conflict}
                      onClick={() => setDraft(choice)}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="field">
                  Deine Antwort (freiwillig)
                  <textarea
                    rows={3}
                    maxLength={MAX_STYLE_ANSWER}
                    value={draft}
                    placeholder={question.placeholder}
                    disabled={busy || disabled || conflict}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <span className="micro-copy">
                    {draft.length}/{MAX_STYLE_ANSWER}
                  </span>
                </label>
              )}
              <div className="style-check-actions">
                <button
                  className="button primary"
                  disabled={busy || disabled || conflict || !draft.trim()}
                  onClick={() =>
                    void act({
                      type: 'answer',
                      question: question.id,
                      answer: draft,
                    })
                  }
                >
                  Antwort speichern
                </button>
                <button
                  className="text-button"
                  disabled={busy || disabled || conflict}
                  onClick={() =>
                    void act({
                      type: 'answer',
                      question: question.id,
                      answer: null,
                    })
                  }
                >
                  Frage überspringen
                </button>
                {editing && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(undefined)
                      setDraft('')
                    }}
                  >
                    Änderung abbrechen
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="muted">
              {completed
                ? 'Deine bestätigten Antworten:'
                : 'Das war die letzte Frage. Du kannst deine Antworten hier noch ändern oder das Gespräch abschliessen.'}
            </p>
          )}
          {(!!covered || completed) && (
            <details className="interview-answers" open={completed || !next}>
              <summary>Antworten &amp; offene Fragen ansehen</summary>
              {STYLE_QUESTIONS.filter(
                (q) =>
                  completed ||
                  !!interview?.answers[q.id] ||
                  interview?.skipped.includes(q.id),
              ).map((q) => (
                <div className="interview-answer" key={q.id}>
                  <p>{q.title}</p>
                  <strong>{interview?.answers[q.id] ?? 'Offengelassen'}</strong>
                  <button
                    className="text-button"
                    disabled={busy || disabled}
                    aria-label={`${q.title} ändern`}
                    onClick={() => {
                      setEditing(q.id)
                      setDraft(interview?.answers[q.id] ?? '')
                      card.current?.scrollIntoView({
                        block: 'start',
                        behavior: 'instant',
                      })
                    }}
                  >
                    Ändern
                  </button>
                </div>
              ))}
            </details>
          )}
          <div className="interview-footer">
            {!completed && (
              <button
                className="button secondary"
                disabled={busy || disabled || conflict}
                onClick={() => void act({ type: 'complete' })}
              >
                Stilgespräch abschliessen
              </button>
            )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (token) markRead(token)
                setExpanded(false)
                onActiveChange(false)
                setEditing(undefined)
                setDraft('')
              }}
            >
              {completed ? 'Antworten einklappen' : 'Später weiter'}
            </button>
            {!!covered && (
              <button
                className="text-button"
                disabled={busy || disabled}
                onClick={() => setConfirmReset(true)}
              >
                Vertiefte Antworten löschen
              </button>
            )}
          </div>
          {confirmReset && (
            <div className="discard-notice" role="alert">
              <p>
                Vertiefte Antworten löschen? Dein kurzer Stilcheck, Bewertungen
                und die Outfit-Auswahl bleiben erhalten. Bereits gesendete
                Antworten können weiterhin im Chat oder in älteren Sicherungen
                stehen.
              </p>
              <div className="photo-actions">
                <button
                  className="button secondary"
                  onClick={() => setConfirmReset(false)}
                >
                  Behalten
                </button>
                <button
                  className="button danger"
                  disabled={busy || disabled}
                  onClick={() => void act({ type: 'reset' })}
                >
                  Antworten löschen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </section>
  )
}
