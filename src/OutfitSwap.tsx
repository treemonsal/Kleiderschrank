import { useMemo, useState } from 'react'
import { Sheet, GarmentPicture, ErrorMessage } from './ui'
import type { Garment } from './model'
import type { OutfitOptions, OutfitFeedback, Preferences } from './outfit-model'
import type { WeatherDay } from './weather'
import type { RecentWear } from './wear-history'
import { replacementChoices, swapDailyPiece } from './outfit-customization'
import { storageError } from './db'
export function OutfitSwap({
  items,
  ids,
  targetId,
  day,
  options,
  preferences,
  feedback,
  weather,
  history,
  expectedEntry,
  onClose,
  notify,
}: {
  items: Garment[]
  ids: string[]
  targetId: string
  day: string
  options: OutfitOptions
  preferences: Preferences
  feedback: OutfitFeedback[]
  weather?: WeatherDay
  history: RecentWear
  expectedEntry: string | null
  onClose: () => void
  notify: (text: string) => void
}) {
  const [query, setQuery] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const target = items.find((item) => item.id === targetId)
  const choices = useMemo(
    () =>
      replacementChoices(
        items,
        ids,
        targetId,
        options,
        preferences,
        feedback,
        weather,
        history,
      ).filter((item) =>
        `${item.name} ${item.brand} ${item.color}`
          .toLocaleLowerCase('de')
          .includes(query.trim().toLocaleLowerCase('de')),
      ),
    [
      items,
      ids,
      targetId,
      options,
      preferences,
      feedback,
      weather,
      history,
      query,
    ],
  )
  return (
    <Sheet
      title={`${target?.name ?? 'Stück'} austauschen`}
      eyebrow="Austauschen"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <p className="muted swap-intro">
        Wähle ein verfügbares Stück derselben Kategorie. Der restliche Look
        bleibt erhalten. Getragene Tage werden hier nicht geändert.
      </p>
      <label className="field">
        Alternative suchen
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, Marke oder Farbe"
        />
      </label>
      <div className="swap-choices">
        {choices.slice(0, 50).map((item) => (
          <button
            key={item.id}
            className="swap-choice"
            disabled={busy}
            aria-label={`${item.name} übernehmen`}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await swapDailyPiece({
                  day,
                  ids,
                  targetId,
                  replacementId: item.id,
                  options,
                  expectedEntry,
                  expectedSelection:
                    preferences.dailySelection?.day === day
                      ? preferences.dailySelection.updatedAt
                      : null,
                })
                notify(
                  'Dein Stück ist ausgetauscht. Der Rest des Looks bleibt erhalten.',
                )
                onClose()
              } catch (error) {
                setError(storageError(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            <GarmentPicture item={item} />
            <span>
              <strong>{item.name}</strong>
              <small>
                {[item.brand, item.color].filter(Boolean).join(' · ') ||
                  item.category}
              </small>
            </span>
          </button>
        ))}
      </div>
      {!choices.length && (
        <p role="status" className="muted">
          Keine verfügbare Alternative für diese Auswahl. Prüfe deinen
          Suchbegriff, ergänze ein Stück oder markiere gewaschene Kleidung als
          sauber.
        </p>
      )}
      {choices.length > 50 && (
        <p className="micro-copy">
          Die ersten 50 Alternativen. Mit der Suche kannst du weiter eingrenzen.
        </p>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Sheet>
  )
}
