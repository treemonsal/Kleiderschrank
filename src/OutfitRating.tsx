import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import { db, setOutfitFeedback, storageError, toggleOutfitLike } from './db'
import type { Occasion, OutfitFeedback } from './outfit-model'
import { FEEDBACK_REASONS } from './personalization'
import { ErrorMessage, Sheet } from './ui'

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
              : 'Bewertung gespeichert. Rückgängig geht unter Mehr → Dein Stilprofil.',
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
  return (
    <>
      <div
        className="outfit-rating"
        role="group"
        aria-label={`${label} bewerten`}
      >
        <button
          className={`icon-button ${liked ? 'liked' : ''}`}
          data-motion="pop"
          aria-label={`${label}: Gefällt mir`}
          aria-pressed={liked}
          disabled={disabled || busy}
          onClick={() => void rate()}
        >
          <ThumbsUp size={19} />
        </button>
        <button
          className={`icon-button ${relevant && rating?.verdict === 'rejected' ? 'liked' : ''}`}
          aria-label={`${label}: Passt nicht`}
          aria-pressed={relevant && rating?.verdict === 'rejected'}
          disabled={disabled || busy}
          onClick={() => {
            setError('')
            setOpen(true)
          }}
        >
          <ThumbsDown size={19} />
        </button>
        {liked && <span className="muted">Gefällt dir</span>}
      </div>
      {!open && error && <ErrorMessage>{error}</ErrorMessage>}
      {open && (
        <Sheet
          title="Was passt nicht?"
          eyebrow="DEIN FEEDBACK"
          onClose={() => setOpen(false)}
          closeDisabled={busy}
        >
          <p className="muted">
            Ein kurzer Hinweis macht die nächsten Vorschläge persönlicher. Du
            bewertest den Look für {occasion}, nicht jedes einzelne
            Kleidungsstück. Ein Grund ist freiwillig.
          </p>
          <div className="feedback-reasons">
            {Object.entries(FEEDBACK_REASONS).map(([reason, text]) => (
              <button
                key={reason}
                className="button secondary full"
                disabled={busy}
                onClick={() => void rate(reason as OutfitFeedback['reason'])}
              >
                {text}
              </button>
            ))}
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => void rate(undefined, true)}
            >
              Ohne Grund ablehnen
            </button>
          </div>
          <p className="micro-copy">
            „Zu auffällig“ berücksichtigt erfasste Farbakzente. Muster und
            Passform werden daraus nicht abgeleitet.
          </p>
          <p className="micro-copy">
            Nur heute Lust auf etwas anderes? Schliesse dieses Fenster und wähle
            „Anderer Look“ oder „Neu kombinieren“. Das zählt nicht als
            Ablehnung. Bewertungen lassen sich im Stilprofil zurücknehmen.
          </p>
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </Sheet>
      )}
    </>
  )
}
