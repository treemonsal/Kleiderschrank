import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { db, setOutfitFeedback, storageError, toggleOutfitLike } from './db'
import type { Occasion, OutfitFeedback } from './outfit-model'
import { FEEDBACK_REASONS } from './personalization'
import { ErrorMessage } from './ui'

export function OutfitRating({
  ids,
  occasion,
  label,
  rating,
  notify,
  disabled = false,
}: {
  ids: string[]
  occasion: Occasion
  label: string
  rating?: OutfitFeedback
  notify: (message: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const relevant = !rating?.occasion || rating.occasion === occasion
  const liked = relevant && rating?.verdict === 'liked'
  async function rate(reason?: OutfitFeedback['reason'], rejected = false) {
    setBusy(true)
    setError('')
    try {
      if (reason || rejected) {
        await setOutfitFeedback(ids, 'rejected', db, { reason, occasion })
        notify(
          reason === 'occasion'
            ? `Für ${occasion} gemerkt. Dein allgemeiner Geschmack bleibt unverändert.`
            : reason === 'bold'
              ? 'Gemerkt: Ähnliche Looks mit weniger Farbakzenten werden stärker gewichtet.'
              : 'Bewertung gespeichert. Rückgängig geht unter Einstellungen → Dein Stilprofil.',
        )
      } else {
        const active = await toggleOutfitLike(ids, db, occasion)
        notify(
          active
            ? 'Gefällt dir: Ähnliche Looks werden stärker berücksichtigt.'
            : 'Positive Bewertung zurückgenommen.',
        )
      }
      setOpen(false)
    } catch (error) {
      setError(storageError(error))
    } finally {
      setBusy(false)
    }
  }
  const rejected = relevant && rating?.verdict === 'rejected'
  const chips: Record<keyof typeof FEEDBACK_REASONS, string> = {
    bold: FEEDBACK_REASONS.bold,
    combination: 'Kombination passt nicht',
    colors: 'Farben passen nicht',
    style: 'Nicht mein Stil',
    occasion: `Nicht für ${occasion}`,
  }
  return (
    <div className="outfit-rating-block">
      <div
        className="outfit-rating"
        role="group"
        aria-label={`${label} bewerten`}
      >
        <span className="rating-question">
          {liked
            ? 'Gefällt dir'
            : rejected
              ? 'Passt nicht'
              : 'Wie gefällt dir der Look?'}
        </span>
        <span className="rating-buttons">
          <button
            className={`icon-button ${liked ? 'liked' : ''}`}
            data-motion="pop"
            aria-label={`${label}: Gefällt mir`}
            aria-pressed={liked}
            disabled={disabled || busy}
            onClick={() => void rate()}
          >
            <ThumbsUp size={19} strokeWidth={1.5} />
          </button>
          <button
            className={`icon-button ${rejected ? 'liked' : ''}`}
            aria-label={`${label}: Passt nicht`}
            aria-pressed={rejected}
            aria-expanded={open}
            disabled={disabled || busy}
            onClick={() => {
              setError('')
              setOpen(!open)
            }}
          >
            <ThumbsDown size={19} strokeWidth={1.5} />
          </button>
        </span>
      </div>
      {open && (
        <div className="rating-reasons" role="group" aria-label="Grund angeben">
          <p>Grund angeben, freiwillig</p>
          <div className="rating-chips">
            {Object.entries(chips).map(([reason, text]) => (
              <button
                key={reason}
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => void rate(reason as OutfitFeedback['reason'])}
              >
                {text}
              </button>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void rate(undefined, true)}
            >
              Ohne Grund
            </button>
          </div>
          <p className="micro-copy">
            Nur heute Lust auf etwas anderes? Tausche ein Teil, das zählt nicht
            als Ablehnung.
          </p>
        </div>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  )
}
