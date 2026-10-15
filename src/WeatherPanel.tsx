import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CloudSun,
  LocateFixed,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { db, updatePreferences } from './db'
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
import { useClock } from './useWeather'
import { ErrorMessage } from './ui'

export function WeatherPanel({
  onContext,
  notify,
  initialOpen = false,
  onClose,
}: {
  onContext?: (day: WeatherDay | undefined) => void
  notify: (message: string) => void
  initialOpen?: boolean
  onClose?: () => void
}) {
  const state = useLiveQuery(() =>
    db.transaction('r', db.weather, db.preferences, async () => ({
      cache: await db.weather.get('local'),
      enabled: (await db.preferences.get('personal'))?.useWeather !== false,
    })),
  )
  const cache = state?.cache
  const [enabledChoice, setEnabledChoice] = useState<boolean>()
  useEffect(() => setEnabledChoice(state?.enabled), [state?.enabled])
  const enabled = enabledChoice ?? state?.enabled ?? true
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WeatherLocation[]>([])
  const [place, setPlace] = useState<WeatherLocation | null>(null)
  const [searched, setSearched] = useState(false)
  const [open, setOpen] = useState(initialOpen)
  const [day, setDay] = useState('')
  const now = useClock()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      controller.current?.abort()
    }
  }, [])
  const selected = place ?? cache?.location
  const today = localDay(new Date(now))
  const availableDays =
    cache?.report.days.filter((item) => item.day >= today) ?? []
  const selectedDay =
    availableDays.find((item) => item.day === day) ??
    availableDays.find((item) => item.day === today)
  const fresh = !!cache && weatherFresh(cache.report, now) && !!selectedDay
  useEffect(() => {
    onContext?.(enabled && fresh ? selectedDay : undefined)
  }, [enabled, fresh, selectedDay, onContext])
  function close() {
    controller.current?.abort()
    setBusy(false)
    setOpen(false)
    onClose?.()
  }
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
  async function saveLocation(
    location: WeatherLocation,
    signal: AbortSignal,
    activate: boolean,
  ) {
    const report = await loadWeather(location, signal)
    if (signal.aborted) return
    await db.transaction('rw', db.weather, db.preferences, async () => {
      if (signal.aborted) return
      await db.weather.put(report)
      if (activate) await updatePreferences({ useWeather: true })
    })
    if (signal.aborted || !mounted.current) return
    setPlace(null)
    setDay('')
    setOpen(false)
    setResults([])
    setSearched(false)
    notify(`Wetter für ${location.name} gespeichert.`)
    onClose?.()
  }
  function choose(location: WeatherLocation) {
    setPlace(location)
    void run((signal) => saveLocation(location, signal, true))
  }
  return (
    <details
      className="weather-panel"
      open={open}
      onToggle={(event) => {
        const expanded = event.currentTarget.open
        if (!expanded && open) {
          controller.current?.abort()
          setBusy(false)
        }
        setOpen(expanded)
      }}
    >
      <summary>
        <CloudSun size={21} strokeWidth={1.5} />
        <span>
          Wetter für deinen Look{' '}
          <small>
            {cache
              ? `${cache.location.name} · ${fresh && selectedDay ? `${Math.round(selectedDay.min)}–${Math.round(selectedDay.max)} °C` : 'gespeicherte Vorhersage'}`
              : 'Ort auswählen · Open-Meteo'}
          </small>
        </span>
      </summary>
      <div className="weather-content">
        <div className="weather-close-row">
          <span>Ort und Wetter</span>
          <button
            className="icon-button soft"
            aria-label="Wetterauswahl schliessen"
            onClick={close}
          >
            <X size={19} />
          </button>
        </div>
        <p className="weather-privacy">
          Die Ortssuche sendet den Ortsnamen an Open-Meteo. Mit der Ortsauswahl
          laden und speichern wir die Vorhersage und verwenden sie für deine
          Looks. Der gespeicherte Ort wird beim Öffnen bei Bedarf aktualisiert;
          nur gerundete Koordinaten (ungefähr 1 km), keine Fotos. Der
          Gerätestandort wird nur mit „Standort verwenden“ abgefragt.
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
        {!!results.length && (
          <div className="location-results">
            {results.map((result, index) => (
              <button
                key={`${result.latitude}:${result.longitude}:${index}`}
                disabled={busy}
                onClick={() => choose(result)}
              >
                {result.name}
              </button>
            ))}
          </div>
        )}
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            void run(async (signal) => {
              if (!navigator.geolocation)
                throw new Error(
                  'Dieser Browser bietet keinen Standortzugriff. Du kannst den Ort manuell suchen.',
                )
              const position = await new Promise<GeolocationPosition>(
                (resolve, reject) =>
                  navigator.geolocation.getCurrentPosition(
                    resolve,
                    () =>
                      reject(
                        new Error(
                          'Keine Standortfreigabe oder kein Standort verfügbar. Du kannst den Ort manuell suchen.',
                        ),
                      ),
                    {
                      enableHighAccuracy: false,
                      timeout: 10000,
                      maximumAge: 0,
                    },
                  ),
              )
              if (signal.aborted) return
              const location = roundedLocation(
                'Mein Standort',
                position.coords.latitude,
                position.coords.longitude,
              )
              setPlace(location)
              await saveLocation(location, signal, true)
            })
          }
        >
          <LocateFixed size={17} />
          Standort verwenden
        </button>
        {selected && (
          <div className="chosen-location">
            <p>
              {place ? 'Noch nicht gespeichert:' : 'Gespeichert:'}{' '}
              <strong>{selected.name}</strong>
            </p>
            <button
              className="button secondary full"
              disabled={busy}
              onClick={() =>
                void run((signal) => saveLocation(selected, signal, !!place))
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
                disabled={busy}
                checked={enabled}
                onChange={(event) => {
                  const value = event.target.checked
                  setEnabledChoice(value)
                  void run(async () => {
                    try {
                      await updatePreferences({ useWeather: value })
                    } catch (error) {
                      setEnabledChoice(enabled)
                      throw error
                    }
                    notify(
                      value
                        ? 'Wetter wird für deine Looks berücksichtigt.'
                        : 'Wetter für Looks ausgeschaltet.',
                    )
                  })
                }}
              />
              Wetter für Vorschläge verwenden
            </label>
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await db.transaction(
                    'rw',
                    db.weather,
                    db.preferences,
                    async () => {
                      await db.weather.delete('local')
                      await updatePreferences({ useWeather: false })
                    },
                  )
                  setPlace(null)
                  setQuery('')
                  setResults([])
                  setSearched(false)
                  setDay('')
                  setOpen(false)
                  notify('Ort und Wetter entfernt.')
                  onClose?.()
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
          . Kostenlos für private, nicht kommerzielle Nutzung.
        </p>
      </div>
    </details>
  )
}
