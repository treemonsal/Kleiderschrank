import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArrowLeft,
  Check,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { COLORS, STYLES, type Garment } from './model'
import {
  DEFAULT_PREFERENCES,
  OCCASIONS,
  type Preferences,
  type StyleProfile,
} from './outfit-model'
import {
  db,
  removeOutfitFeedback,
  saveStyleProfile,
  storageError,
  styleProfileRevision,
} from './db'
import { DEFAULT_STYLE_PROFILE, FEEDBACK_REASONS } from './personalization'
import { ErrorMessage, Sheet } from './ui'

function StyleCheck({
  current,
  onClose,
  notify,
}: {
  current: Preferences
  onClose: () => void
  notify: (message: string) => void
}) {
  const [revision] = useState(() => styleProfileRevision(current))
  const [profile, setProfile] = useState<StyleProfile>(() => ({
    ...DEFAULT_STYLE_PROFILE,
    ...current.styleProfile,
    status: 'completed',
    usualOccasion:
      current.outfitOptions?.occasion ??
      current.styleProfile?.usualOccasion ??
      'Alltag',
  }))
  const [styles, setStyles] = useState(current.styles)
  const [colors, setColors] = useState(current.colors)
  const [baseline] = useState(() => JSON.stringify({ profile, styles, colors }))
  const [step, setStep] = useState(0)
  const stepStart = useRef<HTMLFieldSetElement>(null)
  const firstStep = useRef(true)
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false
      return
    }
    stepStart.current
      ?.closest('dialog')
      ?.scrollTo({ top: 0, behavior: 'instant' })
    stepStart.current?.focus({ preventScroll: true })
  }, [step])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save(skip = false) {
    setBusy(true)
    setError('')
    try {
      await saveStyleProfile(
        { ...profile, status: skip ? 'skipped' : 'completed' },
        styles,
        colors,
        revision,
      )
      notify(
        skip
          ? 'Du kannst den Stilcheck jederzeit unter Mehr starten.'
          : 'Dein Stilprofil ist gespeichert. Neue Vorschläge berücksichtigen deine Antworten.',
      )
      onClose()
    } catch (error) {
      setError(storageError(error))
    } finally {
      setBusy(false)
    }
  }
  const toggleStyle = (style: (typeof STYLES)[number]) =>
    setStyles((previous) =>
      previous.includes(style)
        ? previous.filter((s) => s !== style)
        : [...previous, style],
    )
  const toggleColor = (color: string, avoid: boolean) => {
    if (avoid) {
      setProfile((previous) => ({
        ...previous,
        avoidColors: previous.avoidColors.includes(color)
          ? previous.avoidColors.filter((c) => c !== color)
          : [...previous.avoidColors, color],
      }))
      setColors((previous) => previous.filter((c) => c !== color))
    } else {
      setColors((previous) =>
        previous.includes(color)
          ? previous.filter((c) => c !== color)
          : [...previous, color],
      )
      setProfile((previous) => ({
        ...previous,
        avoidColors: previous.avoidColors.filter((c) => c !== color),
      }))
    }
  }
  const colorChoices = (avoid: boolean) => (
    <div className="color-options">
      {COLORS.map((color) => {
        const selected = (avoid ? profile.avoidColors : colors).includes(
          color.name,
        )
        return (
          <button
            type="button"
            key={color.name}
            className={`color-option ${selected ? 'selected' : ''}`}
            aria-label={`${avoid ? 'Seltener' : 'Lieblingsfarbe'}: ${color.name}`}
            aria-pressed={selected}
            onClick={() => toggleColor(color.name, avoid)}
          >
            <span style={{ background: color.hex }} />
            <span>{color.name}</span>
          </button>
        )
      })}
    </div>
  )
  return (
    <Sheet
      closeDisabled={busy}
      dirty={!busy && JSON.stringify({ profile, styles, colors }) !== baseline}
      title={
        [
          'Was fühlt sich nach dir an?',
          'Welche Farben magst du?',
          'Wie sieht dein Alltag aus?',
        ][step]
      }
      eyebrow={`Stilcheck · ${step + 1} von 3`}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className="style-check"
        onSubmit={(event) => {
          event.preventDefault()
          if (step < 2) setStep(step + 1)
          else void save()
        }}
      >
        <div className="style-progress" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className={index <= step ? 'active' : ''} />
          ))}
        </div>
        <p className="muted">
          Etwa eine Minute. Jede Frage ist freiwillig. Deine Antworten lassen
          sich später ändern.
        </p>
        <fieldset
          disabled={busy}
          className="style-step"
          key={step}
          ref={stepStart}
          tabIndex={-1}
        >
          {step === 0 && (
            <>
              <legend>Welche Stilrichtungen trägst du gern?</legend>
              <p className="micro-copy">
                Mehrere oder keine auswählen. Du musst dich nicht auf einen Stil
                festlegen.
              </p>
              <div className="chips wrap">
                {STYLES.map((style) => (
                  <button
                    type="button"
                    key={style}
                    className={`chip ${styles.includes(style) ? 'active' : ''}`}
                    aria-pressed={styles.includes(style)}
                    onClick={() => toggleStyle(style)}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <legend>Lieblingsfarben</legend>
              {colorChoices(false)}
              <p className="preference-label">Diese Farben lieber seltener</p>
              {colorChoices(true)}
              <label className="field">
                Wie farbig sollen deine Looks sein?
                <select
                  value={profile.colorMood}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      colorMood: event.target
                        .value as StyleProfile['colorMood'],
                    })
                  }
                >
                  <option value="balanced">Ausgewogen / noch offen</option>
                  <option value="neutral">
                    Ruhig, mit wenigen Farbakzenten
                  </option>
                  <option value="colorful">Gern mehrere Farbakzente</option>
                </select>
              </label>
            </>
          )}
          {step === 2 && (
            <>
              <legend>Deine nächsten Vorschläge</legend>
              <label className="field">
                Wofür suchst du meistens Outfits?
                <select
                  value={profile.usualOccasion}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      usualOccasion: event.target
                        .value as StyleProfile['usualOccasion'],
                    })
                  }
                >
                  {OCCASIONS.map((occasion) => (
                    <option key={occasion}>{occasion}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Wie viel Abwechslung möchtest du?
                <select
                  value={profile.variety}
                  onChange={(event) =>
                    setProfile({
                      ...profile,
                      variety: event.target.value as StyleProfile['variety'],
                    })
                  }
                >
                  <option value="balanced">
                    Eine Mischung aus Bewährtem und Neuem
                  </option>
                  <option value="familiar">
                    Lieber vertraute Lieblingslooks
                  </option>
                  <option value="explore">
                    Öfter neue Kombinationen entdecken
                  </option>
                </select>
              </label>
              <div className="style-check-summary">
                <Check size={18} />
                <p>
                  Deine Auswahl gibt passenden Looks mehr Gewicht. Wetter,
                  saubere Kleidung und dein aktueller Anlass bleiben
                  entscheidend. Mit Daumen hoch oder runter verfeinerst du die
                  Auswahl.
                </p>
              </div>
            </>
          )}
        </fieldset>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <div className="style-check-actions">
          {step > 0 && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} /> Zurück
            </button>
          )}
          <button type="submit" className="button primary" disabled={busy}>
            {busy
              ? 'Wird gespeichert …'
              : step < 2
                ? 'Weiter'
                : 'Stilprofil speichern'}
          </button>
        </div>
        {!current.styleProfile && (
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => void save(true)}
          >
            Stilcheck überspringen
          </button>
        )}
      </form>
    </Sheet>
  )
}

export function StyleProfileCard({
  notify,
  items,
  invitation = false,
}: {
  notify: (message: string) => void
  items: Garment[]
  invitation?: boolean
}) {
  const state = useLiveQuery(() =>
    db.transaction('r', db.preferences, db.feedback, async () => ({
      preferences:
        (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
      feedback: await db.feedback.orderBy('updatedAt').reverse().toArray(),
    })),
  )
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!state || (invitation && state.preferences.styleProfile && !open))
    return null
  const completed = state.preferences.styleProfile?.status === 'completed'
  async function act(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (error) {
      setError(storageError(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <section
        className={`style-profile-card ${invitation ? 'style-invitation' : 'settings-section'}`}
        aria-label={invitation ? 'Persönlicher Stilcheck' : 'Dein Stilprofil'}
      >
        <h2>
          <SlidersHorizontal size={20} />
          {invitation ? 'Stilcheck' : 'Dein Stilprofil'}
        </h2>
        <p className="muted">
          {invitation
            ? 'Eine Minute für passendere Looks.'
            : completed
              ? `${state.preferences.styles.join(', ') || 'Stil bleibt offen'} · ${state.preferences.colors.join(', ') || 'Farben bleiben offen'}`
              : 'Sag uns, was du gern trägst. Den Stilcheck kannst du jederzeit nachholen.'}
        </p>
        <div className="style-check-actions">
          <button className="button secondary" onClick={() => setOpen(true)}>
            {completed ? 'Stilprofil bearbeiten' : 'Stilcheck starten'}
          </button>
          {invitation ? (
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await saveStyleProfile(
                    { ...DEFAULT_STYLE_PROFILE, status: 'skipped' },
                    state.preferences.styles,
                    state.preferences.colors,
                    styleProfileRevision(state.preferences),
                  )
                  notify('Den Stilcheck findest du später unter Mehr.')
                })
              }
            >
              Später
            </button>
          ) : (
            <button className="text-button" onClick={() => setHistory(true)}>
              Bewertungen ansehen ({state.feedback.length})
            </button>
          )}
        </div>
        {!invitation && (
          <p className="micro-copy">
            Bewertungen gewichten ähnliche erfasste Farben und Stile. Deine
            Profilantworten werden zusätzlich berücksichtigt. Einzelne
            Bewertungen sind nur Hinweise auf ähnliche Looks. Profil und
            Bewertungen bleiben gespeichert und sind Teil deiner Sicherung. Die
            Online-Beratung erhält sie erst beim bewussten Start.
          </p>
        )}
        {!history && error && <ErrorMessage>{error}</ErrorMessage>}
      </section>
      {open && (
        <StyleCheck
          current={state.preferences}
          notify={notify}
          onClose={() => setOpen(false)}
        />
      )}
      {history && (
        <Sheet
          title="Deine Bewertungen"
          eyebrow="Profil"
          onClose={() => {
            if (!busy) {
              setHistory(false)
              setConfirm(false)
              setError('')
            }
          }}
        >
          <p className="muted">
            Jeder Look hat eine aktuelle Bewertung. Zurücknehmen entfernt auch
            seinen Einfluss auf ähnliche Vorschläge. Gespeicherte und getragene
            Outfits bleiben erhalten.
          </p>
          {!state.feedback.length && (
            <p>Noch keine Bewertungen. Nutze die Daumen an deinen Looks.</p>
          )}
          <div className="feedback-history">
            {state.feedback.slice(0, 20).map((entry) => (
              <article key={entry.id}>
                {entry.verdict === 'liked' ? (
                  <ThumbsUp size={18} />
                ) : (
                  <ThumbsDown size={18} />
                )}
                <div>
                  <p>
                    {entry.garmentIds
                      .map(
                        (id) =>
                          items.find((item) => item.id === id)?.name ??
                          'Entferntes Stück',
                      )
                      .join(' · ')}
                  </p>
                  <span className="micro-copy">
                    {entry.occasion ?? 'Alle Anlässe'} ·{' '}
                    {entry.verdict === 'liked'
                      ? 'Gefällt dir'
                      : entry.reason
                        ? FEEDBACK_REASONS[entry.reason]
                        : 'Abgelehnt'}
                  </span>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await removeOutfitFeedback(entry.id, entry.updatedAt)
                        notify('Bewertung zurückgenommen.')
                      })
                    }
                  >
                    Bewertung zurücknehmen
                  </button>
                </div>
              </article>
            ))}
          </div>
          {state.feedback.length > 20 && (
            <p className="micro-copy">
              Die 20 neuesten Bewertungen. Nach dem Zurücknehmen rücken ältere
              nach. Bis zu 1000 Bewertungen bleiben erhalten.
            </p>
          )}
          {!!state.feedback.length &&
            (confirm ? (
              <div className="delete-confirm">
                <p>
                  Alle Bewertungen und ihren gelernten Einfluss zurücksetzen?
                  Dein Stilprofil bleibt erhalten.
                </p>
                <div className="style-check-actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Behalten
                  </button>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        await db.feedback.clear()
                        setConfirm(false)
                        notify('Alle Bewertungen wurden zurückgesetzt.')
                      })
                    }
                  >
                    Alle Bewertungen zurücksetzen
                  </button>
                </div>
              </div>
            ) : (
              <button className="text-button" onClick={() => setConfirm(true)}>
                Gelerntes zurücksetzen
              </button>
            ))}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Sheet>
      )}
    </>
  )
}
