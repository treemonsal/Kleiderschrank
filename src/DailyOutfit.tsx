import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bookmark, Check, ArrowRight, CloudSun } from 'lucide-react'
import type { Garment } from './model'
import { db, saveOutfit, storageError } from './db'
import { DEFAULT_PREFERENCES, outfitKey } from './outfit-model'
import { chooseDailyOutfit } from './daily-outfit'
import { localDay } from './calendar'
import { weatherFresh, weatherLabel } from './weather'
import { useClock, weatherForToday } from './useWeather'
import { WeatherPanel } from './WeatherPanel'
import { OutfitPieces } from './OutfitPieces'
import { ErrorMessage, Sheet } from './ui'

export function DailyOutfit({
  items,
  onOpen,
  onOutfits,
  notify,
}: {
  items: Garment[]
  onOpen: (id: string) => void
  onOutfits: () => void
  notify: (message: string) => void
}) {
  const state = useLiveQuery(() =>
    db.transaction(
      'r',
      db.preferences,
      db.feedback,
      db.outfits,
      db.calendar,
      db.weather,
      async () => ({
        preferences:
          (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
        feedback: await db.feedback.toArray(),
        outfits: await db.outfits.toArray(),
        calendar: await db.calendar.toArray(),
        weather: await db.weather.get('local'),
      }),
    ),
  )
  const now = useClock()
  const day = localDay(new Date(now))
  const forecast = weatherForToday(state?.weather, now)
  const fresh =
    !!state?.weather && weatherFresh(state.weather.report, now) && !!forecast
  const look = useMemo(
    () =>
      state
        ? chooseDailyOutfit(
            items,
            state.preferences,
            state.feedback,
            state.outfits,
            state.calendar,
            day,
            state.preferences.useWeather !== false && fresh
              ? forecast
              : undefined,
          )
        : undefined,
    [state, items, day, fresh, forecast],
  )
  const [weatherOpen, setWeatherOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const saved =
    !!look?.garmentIds.length &&
    state?.outfits.some(
      (outfit) => outfitKey(outfit.garmentIds) === outfitKey(look.garmentIds),
    )
  const date = new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(now))
  return (
    <>
      <div className="home-greeting home-day-summary">
        <button
          className="home-weather"
          onClick={() => setWeatherOpen(true)}
          aria-label="Wetter anzeigen und Ort ändern"
        >
          <span className="home-date">{date}</span>
          <span className="home-weather-line">
            <CloudSun size={20} />
            {state?.weather ? (
              <span>
                {forecast
                  ? `${Math.round(forecast.min)}–${Math.round(forecast.max)} °C · ${weatherLabel(forecast.code)}`
                  : 'Vorhersage nicht aktuell'}
                <small>
                  {state.weather.location.name} ·{' '}
                  {fresh ? 'Tagesvorhersage' : 'Gespeichert · veraltet'}
                </small>
              </span>
            ) : (
              <span>
                Dein Wetter<small>Ort auswählen</small>
              </span>
            )}
          </span>
        </button>
      </div>
      <section className="daily-look" aria-label="Dein Tageslook">
        <header>
          <p className="eyebrow">
            {look?.planned
              ? 'FÜR HEUTE EINGEPLANT'
              : 'FÜR DICH ZUSAMMENGESTELLT'}
          </p>
          <h1>{look?.planned ? look.name : 'Dein Look für heute.'}</h1>
          <p className="muted">
            {look?.planned
              ? 'Deine Auswahl aus dem Kalender.'
              : 'Automatisch aus deinen Stücken, Vorlieben und der Saison kombiniert.'}
          </p>
        </header>
        {!look ? (
          <p role="status">Dein Tageslook wird zusammengestellt …</p>
        ) : look.garmentIds.length ? (
          <>
            <OutfitPieces ids={look.garmentIds} items={items} onOpen={onOpen} />
            <details className="outfit-reasons">
              <summary>Warum diese Kombination?</summary>
              <ul>
                {look.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <p className="generator-disclosure">
                Lokale Kombinationsregeln mit deinen erfassten
                Kleidungsmerkmalen. Passform, Wärme und Dresscode bitte selbst
                prüfen.
              </p>
            </details>
            <div className="daily-look-actions">
              <button
                className="button secondary"
                disabled={saved || busy}
                onClick={async () => {
                  setBusy(true)
                  setError('')
                  try {
                    await saveOutfit(look.garmentIds, look.options)
                    notify('Dein Tageslook ist gespeichert.')
                  } catch (error) {
                    setError(storageError(error))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {saved ? <Check size={16} /> : <Bookmark size={16} />}{' '}
                {saved ? 'Gespeichert' : 'Look speichern'}
              </button>
              <button className="text-button" onClick={onOutfits}>
                Looks anpassen <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="daily-look-empty">
            <p>{look.missing}</p>
            <button className="text-button" onClick={onOutfits}>
              Auswahl anpassen <ArrowRight size={16} />
            </button>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </section>
      {weatherOpen && (
        <Sheet title="Wetter für heute" onClose={() => setWeatherOpen(false)}>
          <WeatherPanel
            initialOpen
            notify={notify}
            onClose={() => setWeatherOpen(false)}
          />
        </Sheet>
      )}
    </>
  )
}
