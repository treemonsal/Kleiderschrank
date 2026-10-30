import { useEffect, useState } from 'react'
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
import { ErrorMessage } from './ui'
import { storageError } from './db'
import { refinementChoices, applyDailyRefinement } from './daily-refinement'
import type { OutfitRefinement } from './refinement-model'

type Intent = OutfitRefinement['intent']
const SHORT: Record<Intent, string> = {
  warmer: 'Wärmer',
  quieter: 'Ruhiger',
  similar: 'Ähnlich',
}
const ORDER: Intent[] = ['warmer', 'quieter', 'similar']
/** How many alternatives „Weitere Variante“ steps through. */
const MAX_CHOICES = 5

export interface RefinementProps {
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
  disabled?: boolean
  /** Shows the previewed look in the plate; undefined restores today's. */
  onPreview: (ids: string[] | undefined) => void
  notify: (text: string) => void
}

/**
 * Wärmer · Ruhiger · Ähnlich as an inline preview under today's plate.
 * Nothing is written until „Übernehmen“; applying revalidates the snapshot
 * taken when the variant was requested.
 */
export function DailyRefinement(props: RefinementProps) {
  const [preview, setPreview] = useState<{
    choices: OutfitCandidate[]
    index: number
    request: OutfitRefinement
    snapshot: RefinementProps
  }>()
  const candidate = preview?.choices[preview.index]
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { onPreview } = props
  useEffect(() => onPreview(candidate?.garmentIds), [candidate, onPreview])
  useEffect(() => () => onPreview(undefined), [onPreview])
  function suggest(intent: Intent) {
    setError('')
    if (preview?.request.intent === intent) {
      setPreview(undefined)
      setMessage('')
      return
    }
    const snapshot = props
    const request = { intent, currentIds: snapshot.ids, lockedIds: [] }
    const choices = refinementChoices(
      snapshot.items,
      snapshot.options,
      snapshot.preferences,
      snapshot.feedback,
      request,
      snapshot.outfits,
      snapshot.calendar,
      snapshot.day,
      snapshot.weather,
    ).slice(0, MAX_CHOICES)
    setPreview(
      choices.length ? { choices, index: 0, request, snapshot } : undefined,
    )
    setMessage(
      choices.length
        ? ''
        : intent === 'warmer'
          ? 'Keine wärmere Variante gefunden. Ergänze eine passende Jacke.'
          : intent === 'quieter'
            ? 'Keine ruhigere Variante gefunden.'
            : 'Keine andere vollständige Variante gefunden.',
    )
  }
  const name = (id: string) =>
    props.items.find((item) => item.id === id)?.name ?? ''
  const added =
    preview && candidate
      ? candidate.garmentIds.filter((id) => !preview.snapshot.ids.includes(id))
      : []
  const removed =
    preview && candidate
      ? preview.snapshot.ids.filter((id) => !candidate.garmentIds.includes(id))
      : []
  return (
    <>
      {preview && candidate && (
        <section
          className="card refinement-preview"
          aria-label="Vorschau der Anpassung"
          aria-live="polite"
        >
          <p className="card-kicker">
            Vorschau · {SHORT[preview.request.intent]}
            {preview.choices.length > 1 &&
              ` · ${preview.index + 1} von ${preview.choices.length}`}
          </p>
          <p>
            {added.map(name).join(', ') || 'Gleiche Teile'}
            {removed.length ? ` statt ${removed.map(name).join(', ')}` : ''}.
          </p>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <div className="refinement-buttons">
            {preview.choices.length > 1 && (
              <button
                type="button"
                className="text-button refinement-next"
                disabled={busy}
                onClick={() => {
                  setError('')
                  setPreview({
                    ...preview,
                    index: (preview.index + 1) % preview.choices.length,
                  })
                }}
              >
                Weitere Variante
              </button>
            )}
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setPreview(undefined)
                setError('')
              }}
            >
              Verwerfen
            </button>
            <button
              type="button"
              className="button primary"
              disabled={busy}
              onClick={async () => {
                const { snapshot, request } = preview
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
                    request,
                    garmentIds: candidate.garmentIds,
                    versions: snapshot.items.map((item) => ({
                      id: item.id,
                      updatedAt: item.updatedAt,
                    })),
                  })
                  setPreview(undefined)
                  props.notify('Look angepasst.')
                } catch (error) {
                  setError(storageError(error))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Übernehmen
            </button>
          </div>
        </section>
      )}
      <div className="refine-row" role="group" aria-label="Verfeinern">
        <span aria-hidden="true">Verfeinern</span>
        {ORDER.map((intent) => (
          <button
            type="button"
            key={intent}
            className="button secondary"
            aria-pressed={preview?.request.intent === intent}
            disabled={busy || props.disabled}
            onClick={() => suggest(intent)}
          >
            {SHORT[intent]}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="muted">
          {message}
        </p>
      )}
    </>
  )
}
