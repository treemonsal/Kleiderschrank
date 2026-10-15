import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CloudSun, LocateFixed, RefreshCw, Search, Trash2 } from 'lucide-react'
import { db } from './db'
import { localDay } from './calendar'
import {
  loadWeather,
  roundedLocation,
  searchLocations,
  weatherFresh,
  weatherLabel,
  type WeatherDay,
  type WeatherLocation,
} from './weather'
import { ErrorMessage } from './ui'

export function WeatherPanel({
  onContext,
}: {
  onContext: (day: WeatherDay | undefined) => void
}) {
  const cache = useLiveQuery(() => db.weather.get('local'))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WeatherLocation[]>([])
  const [place, setPlace] = useState<WeatherLocation | null>(null)
  const [searched, setSearched] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [day, setDay] = useState('')
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => {
      mounted.current = false
      controller.current?.abort()
      window.clearInterval(timer)
      onContext(undefined)
    }
  }, [onContext])
  const selected = place ?? cache?.location
  const today = cache
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: cache.report.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(now))
    : localDay()
  const availableDays =
    cache?.report.days.filter((item) => item.day >= today) ?? []
  const selectedDay =
    availableDays.find((item) => item.day === day) ?? availableDays[0]
  const fresh = cache && weatherFresh(cache.report, now) && !!selectedDay
  useEffect(() => {
    onContext(enabled && fresh ? selectedDay : undefined)
  }, [enabled, fresh, selectedDay, onContext])
  async function run(task: (signal: AbortSignal) => Promise<void>) {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setBusy(true)
    setError('')
    try {
      await task(current.signal)
    } catch (error) {
      if (!current.signal.aborted && mounted.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Die Anfrage konnte nicht abgeschlossen werden.',
        )
    } finally {
      if (mounted.current && !current.signal.aborted) setBusy(false)
    }
  }
  return (
    <details className="weather-panel">
      <summary>
        <CloudSun size={21} strokeWidth={1.5} />
        <span>
          Wetter für deinen Look <small>Optional · Open-Meteo</small>
        </span>
      </summary>
      <div className="weather-content">
        <p className="weather-privacy">
          Nur nach deinem Klick: Die Ortssuche sendet den Ortsnamen an
          Open-Meteo, die Wetterabfrage gerundete Koordinaten (ungefähr 1 km).
          Keine Fotos oder Kleidungsdaten. Kein Konto, kein Schlüssel.
        </p>
        <form
          className="weather-search"
          onSubmit={(event) => {
            event.preventDefault()
            void run(async (signal) => {
              const places = await searchLocations(query, signal)
              if (!signal.aborted) {
                setResults(places)
                setSearched(true)
              }
            })
          }}
        >
          <label className="field">
            Ort manuell suchen
            <input
              maxLength={100}
              minLength={2}
              disabled={busy}
              required
              placeholder="z. B. Zürich"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSearched(false)
                setResults([])
              }}
            />
          </label>
          <button
            className="icon-button"
            aria-label="Ort suchen"
            disabled={busy || query.trim().length < 2}
          >
            <Search size={20} />
          </button>
        </form>
        {searched && !results.length && (
          <p className="weather-message" role="status">
            Kein Ort gefunden. Versuche einen anderen Ortsnamen.
          </p>
        )}
        {results.length > 0 && (
          <div className="location-results">
            {results.map((result, index) => (
              <button
                key={`${result.latitude}:${result.longitude}:${index}`}
                disabled={busy}
                onClick={() => {
                  setPlace(result)
                  setEnabled(false)
                  setResults([])
                  setSearched(false)
                }}
              >
                {result.name}
              </button>
            ))}
          </div>
        )}
        <button
          className="text-button"
          disabled={busy}
          onClick={() => {
            setError('')
            if (!navigator.geolocation) {
              setError(
                'Dieser Browser bietet keinen Standortzugriff. Du kannst den Ort manuell suchen.',
              )
              return
            }
            setBusy(true)
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (!mounted.current) return
                setPlace(
                  roundedLocation(
                    'Mein Standort',
                    position.coords.latitude,
                    position.coords.longitude,
                  ),
                )
                setEnabled(false)
                setBusy(false)
              },
              () => {
                if (mounted.current) {
                  setBusy(false)
                  setError(
                    'Keine Standortfreigabe oder kein Standort verfügbar. Du kannst den Ort manuell suchen.',
                  )
                }
              },
              { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 },
            )
          }}
        >
          <LocateFixed size={17} />
          Standort verwenden
        </button>
        {selected && (
          <div className="chosen-location">
            <p>
              Ausgewählt: <strong>{selected.name}</strong>
            </p>
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() =>
                void run(async (signal) => {
                  const report = await loadWeather(selected, signal)
                  if (!signal.aborted) {
                    await db.weather.put(report)
                    setNow(Date.now())
                    setDay('')
                  }
                })
              }
            >
              <RefreshCw size={16} />
              {busy ? 'Bitte einen Moment …' : 'Wetter laden'}
            </button>
          </div>
        )}
        {cache && (
          <div className="weather-report" role="status">
            <div className="weather-report-heading">
              <CloudSun size={25} />
              <div>
                <strong>{cache.location.name}</strong>
                <small>
                  Stand:{' '}
                  {new Date(cache.report.fetchedAt).toLocaleString('de-CH')} ·{' '}
                  {cache.report.timezone}
                </small>
              </div>
            </div>
            {selectedDay && (
              <>
                <label className="field">
                  Datum am Wetterort
                  <select
                    value={selectedDay.day}
                    onChange={(event) => setDay(event.target.value)}
                  >
                    {availableDays.map((item) => (
                      <option key={item.day} value={item.day}>
                        {new Date(`${item.day}T12:00:00`).toLocaleDateString(
                          'de-CH',
                          { weekday: 'short', day: 'numeric', month: 'short' },
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="weather-temperature">
                  {Math.round(selectedDay.min)}–{Math.round(selectedDay.max)} °C{' '}
                  <span>{weatherLabel(selectedDay.code)}</span>
                </p>
                <p className="weather-message">
                  Regenwahrscheinlichkeit: {Math.round(selectedDay.rain)} %
                </p>
              </>
            )}
            {!fresh && (
              <p className="weather-stale">
                Gespeicherte Vorhersage veraltet oder ohne passenden Tag. Sie
                wird nicht für Vorschläge verwendet. Bitte online neu laden.
              </p>
            )}
            <label className="accessory-option">
              <input
                type="checkbox"
                disabled={!fresh}
                checked={enabled && !!fresh}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Wetter für Vorschläge verwenden
            </label>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await db.weather.delete('local')
                  setPlace(null)
                  setEnabled(false)
                  setQuery('')
                  setResults([])
                  setSearched(false)
                })
              }
            >
              <Trash2 size={15} />
              Ort und Wetter vergessen
            </button>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <p className="weather-credit">
          Wetterdaten:{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          · CC BY 4.0. Ortssuche:{' '}
          <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
            GeoNames
          </a>
          . Kostenlos für private, nicht kommerzielle Nutzung. Ein gespeicherter
          Ort löst keine automatischen Abfragen aus.
        </p>
      </div>
    </details>
  )
}
