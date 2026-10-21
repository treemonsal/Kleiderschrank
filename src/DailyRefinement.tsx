import { useState } from 'react'
import { Check, LockKeyhole } from 'lucide-react'
import type { Garment } from './model'
import type { CalendarEntry } from './calendar'
import type {
  OutfitCandidate,
  OutfitFeedback,
  OutfitOptions,
  Preferences,
  SavedOutfit,
} from './outfit-model'
import type { WeatherDay } from './weather'
import { Sheet, GarmentPicture, ErrorMessage } from './ui'
import { storageError } from './db'
import { refinementChoices, applyDailyRefinement } from './daily-refinement'
import { REFINEMENT_LABELS, type OutfitRefinement } from './refinement-model'

export function DailyRefinement(props: {
  day: string
  ids: string[]
  items: Garment[]
  options: OutfitOptions
  preferences: Preferences
  feedback: OutfitFeedback[]
  outfits: SavedOutfit[]
  calendar: CalendarEntry[]
  weather?: WeatherDay
  expectedEntry: string | null
  onClose: () => void
  notify: (text: string) => void
}) {
  // Keep the view the person opened; live changes must never silently replace
  // their draft. Applying revalidates the snapshot inside one transaction.
  const [snapshot] = useState(() => props)
  const [lockedIds, setLockedIds] = useState<string[]>([])
  const [preview, setPreview] = useState<{
    candidate: OutfitCandidate
    request: OutfitRefinement
  }>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const current = snapshot.ids.flatMap(
    (id) => snapshot.items.find((item) => item.id === id) ?? [],
  )
  const pieces = preview
    ? preview.candidate.garmentIds.flatMap(
        (id) => snapshot.items.find((item) => item.id === id) ?? [],
      )
    : []
  function suggest(intent: OutfitRefinement['intent']) {
    setError('')
    const request = { intent, currentIds: snapshot.ids, lockedIds }
    const candidate = refinementChoices(
      snapshot.items,
      snapshot.options,
      snapshot.preferences,
      snapshot.feedback,
      request,
      snapshot.outfits,
      snapshot.calendar,
      snapshot.day,
      snapshot.weather,
    )[0]
    setPreview(candidate ? { candidate, request } : undefined)
    setMessage(
      candidate
        ? ''
        : intent === 'warmer'
          ? 'Keine wärmere Variante mit diesen Vorgaben gefunden. Ergänze eine passende Jacke oder gib ein festgehaltenes Teil frei.'
          : intent === 'quieter'
            ? 'Keine Variante mit weniger bekannten Farbakzenten gefunden. Prüfe fehlende Farbangaben oder gib ein Teil frei.'
            : 'Keine andere vollständige Variante mit diesen Vorgaben gefunden. Gib ein Teil frei oder ergänze deinen Kleiderschrank.',
    )
  }
  return (
    <Sheet
      title="Deinen Tageslook verfeinern."
      eyebrow="NUR DAS NÖTIGE ÄNDERN"
      onClose={props.onClose}
      closeDisabled={busy}
    >
      <p className="muted">
        Halte Lieblingsteile fest. Wir suchen in deinem Kleiderschrank nach
        einer Variante mit möglichst wenigen Änderungen. Übernommen wird erst
        nach deiner Bestätigung.
      </p>
      <fieldset className="refinement-locks" disabled={busy}>
        <legend>Für diese Anpassung behalten</legend>
        {current.map((item) => (
          <label key={item.id} className="refinement-lock">
            <input
              type="checkbox"
              checked={lockedIds.includes(item.id)}
              onChange={(event) => {
                setLockedIds((previous) =>
                  event.target.checked
                    ? [...previous, item.id]
                    : previous.filter((id) => id !== item.id),
                )
                setPreview(undefined)
                setMessage('')
                setError('')
              }}
            />
            <GarmentPicture item={item} />
            <span>
              <strong>{item.category} behalten</strong>
              <small>{item.name}</small>
            </span>
            {lockedIds.includes(item.id) && (
              <LockKeyhole size={16} aria-hidden="true" />
            )}
          </label>
        ))}
      </fieldset>
      <div className="refinement-actions">
        {Object.entries(REFINEMENT_LABELS).map(([intent, label]) => (
          <button
            type="button"
            className="button secondary full"
            key={intent}
            disabled={busy}
            onClick={() => suggest(intent as OutfitRefinement['intent'])}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="micro-copy">
        Die Auswahl nutzt deine gespeicherten Angaben. „Wärmer“ bevorzugt eine
        zusätzliche Jacke oder winterliche Saisonangaben; „ruhiger“ weniger
        bekannte Farbakzente. Material, Muster und tatsächliche Wärme bleiben
        ungeprüft.
      </p>
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
      {preview && (
        <section
          className="refinement-preview"
          aria-label="Vorschau der Anpassung"
          aria-live="polite"
        >
          <h3>{REFINEMENT_LABELS[preview.request.intent]}</h3>
          <div className="refinement-pieces">
            {pieces.map((item) => (
              <figure key={item.id}>
                <GarmentPicture item={item} />
                <figcaption>
                  <strong>{item.name}</strong>
                  <small>
                    {snapshot.ids.includes(item.id)
                      ? 'Bleibt erhalten'
                      : 'Neu im Look'}
                  </small>
                </figcaption>
              </figure>
            ))}
          </div>
          {current.some(
            (item) => !preview.candidate.garmentIds.includes(item.id),
          ) && (
            <p className="micro-copy">
              Ersetzt:{' '}
              {current
                .filter(
                  (item) => !preview.candidate.garmentIds.includes(item.id),
                )
                .map((item) => item.name)
                .join(', ')}
              .
            </p>
          )}
          <button
            type="button"
            className="button primary full"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await applyDailyRefinement({
                  day: snapshot.day,
                  options: snapshot.options,
                  expectedPreferences: snapshot.preferences.updatedAt,
                  expectedEntry: snapshot.expectedEntry,
                  expectedSelection:
                    snapshot.preferences.dailySelection?.day === snapshot.day
                      ? snapshot.preferences.dailySelection.updatedAt
                      : null,
                  request: preview.request,
                  garmentIds: preview.candidate.garmentIds,
                  versions: snapshot.items.map((item) => ({
                    id: item.id,
                    updatedAt: item.updatedAt,
                  })),
                })
                props.notify(
                  'Dein Tageslook ist angepasst. Festgehaltene Teile bleiben erhalten.',
                )
                props.onClose()
              } catch (error) {
                setError(storageError(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Check size={18} />
            Für heute übernehmen
          </button>
        </section>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Sheet>
  )
}
