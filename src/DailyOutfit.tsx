import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bookmark,
  Check,
  ArrowRight,
  CloudSun,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react'
import type { Garment } from './model'
import { db, saveOutfit, storageError } from './db'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  outfitKey,
} from './outfit-model'
import { chooseDailyOutfit } from './daily-outfit'
import { isDay, localDay, shiftDay, weekDays } from './calendar'
import { dayColors } from './calendar-colors'
import { DayCalendar, DayNumber, calendarDayDescription } from './DayCalendar'
import { PlanEditor } from './CalendarView'
import { recordWornOutfit } from './calendar-db'
import { weatherFresh, weatherLabel } from './weather'
import { useClock } from './useWeather'
import { WeatherPanel } from './WeatherPanel'
import { OutfitPieces } from './OutfitPieces'
import { ErrorMessage, Sheet } from './ui'

export function DailyOutfit({
  items,
  day,
  onSelectDay,
  onOpen,
  onOutfits,
  notify,
}: {
  items: Garment[]
  day: string
  onSelectDay: (day: string) => void
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
  const now = useClock(),
    today = localDay(new Date(now))
  const isToday = day === today,
    past = day < today
  const forecast =
    day >= today
      ? state?.weather?.report.days.find((item) => item.day === day)
      : undefined
  const fresh =
    !!state?.weather && weatherFresh(state.weather.report, now) && !!forecast
  const entry = state?.calendar.find((entry) => entry.day === day)
  const recorded = state?.outfits.find(
    (outfit) => outfit.id === entry?.outfitId,
  )
  const automatic = useMemo(
    () =>
      state && isToday && !entry
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
    [state, items, day, isToday, entry, fresh, forecast],
  )
  const look = recorded
    ? {
        garmentIds: recorded.garmentIds,
        options: {
          occasion: recorded.occasion,
          season: recorded.season,
          style: recorded.style,
          includeAccessory: recorded.garmentIds.some(
            (id) =>
              items.find((item) => item.id === id)?.category === 'Accessoires',
          ),
        },
        reasons: [] as string[],
        missing: undefined,
      }
    : automatic
  const complete =
    !!look &&
    isCompleteOutfit(
      look.garmentIds.flatMap(
        (id) => items.find((item) => item.id === id) ?? [],
      ),
    ) &&
    look.garmentIds.every((id) => items.some((item) => item.id === id))
  const [weatherOpen, setWeatherOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => setError(''), [day])
  const saved =
    !!look?.garmentIds.length &&
    state?.outfits.some(
      (outfit) => outfitKey(outfit.garmentIds) === outfitKey(look.garmentIds),
    )
  const date = new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(day.slice(0, 4) !== today.slice(0, 4)
      ? { year: 'numeric' as const }
      : {}),
  }).format(new Date(`${day}T12:00:00`))
  const worn = entry?.status === 'worn' && day <= today
  function move(offset: number) {
    const next = shiftDay(day, offset)
    if (next && !busy) onSelectDay(next)
  }
  function select(next: string) {
    if (!busy) {
      onSelectDay(next)
      setCalendarOpen(false)
    }
  }
  const badge = entry
    ? worn
      ? 'GETRAGEN'
      : past
        ? 'GEPLANT · NICHT BESTÄTIGT'
        : 'EINGEPLANT'
    : isToday
      ? 'FÜR DICH ZUSAMMENGESTELLT'
      : past
        ? 'DEIN RÜCKBLICK'
        : 'DEINE PLANUNG'
  return (
    <>
      <section
        className="home-timeline"
        aria-label="Deine Tage"
        data-day-busy={busy ? 'true' : undefined}
      >
        <div className="day-navigation">
          <button
            className="icon-button"
            aria-label="Vorheriger Tag"
            disabled={busy || !shiftDay(day, -1)}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="day-calendar-trigger"
            aria-label="Tageskalender öffnen"
            disabled={busy}
            onClick={() => setCalendarOpen(true)}
          >
            <CalendarDays size={17} />
            {isToday
              ? 'Heute'
              : day === shiftDay(today, -1)
                ? 'Gestern'
                : day === shiftDay(today, 1)
                  ? 'Morgen'
                  : new Date(`${day}T12:00:00`).toLocaleDateString('de-CH', {
                      day: 'numeric',
                      month: 'long',
                    })}
          </button>
          <button
            className="icon-button"
            aria-label="Nächster Tag"
            disabled={busy || !shiftDay(day, 1)}
            onClick={() => move(1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div
          className="home-week-strip"
          role="group"
          aria-label="Tage auswählen"
        >
          {weekDays(day).map((value, index) => {
            if (!value) return <span key={index} />
            const record = state?.calendar.find((entry) => entry.day === value),
              colors = dayColors(record, state?.outfits ?? [], items, today)
            return (
              <button
                key={value}
                disabled={busy}
                aria-label={calendarDayDescription(
                  value,
                  record,
                  colors,
                  today,
                )}
                aria-current={value === today ? 'date' : undefined}
                aria-pressed={value === day}
                className={value === day ? 'selected' : ''}
                onClick={() => select(value)}
              >
                <small aria-hidden="true">
                  {new Date(`${value}T12:00:00`).toLocaleDateString('de-CH', {
                    weekday: 'short',
                  })}
                </small>
                <DayNumber
                  day={value}
                  entry={record}
                  colors={colors}
                  today={today}
                />
              </button>
            )
          })}
        </div>
        {!isToday && (
          <button
            className="text-button return-today"
            disabled={busy}
            onClick={() => select(today)}
          >
            Zu heute
          </button>
        )}
      </section>
      <div className="home-greeting home-day-summary">
        {past ? (
          <div className="home-history-date">
            <span className="home-date">{date}</span>
            <span>Dein Outfit-Rückblick</span>
          </div>
        ) : (
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
                    : isToday
                      ? 'Vorhersage nicht aktuell'
                      : 'Keine Vorhersage für diesen Tag'}
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
        )}
      </div>
      <section
        className="daily-look"
        aria-label="Dein Tageslook"
        data-day={day}
        data-day-busy={busy ? 'true' : undefined}
      >
        <header>
          <p className="eyebrow">{badge}</p>
          <h1>
            {recorded?.name ??
              (isToday
                ? 'Dein Look für heute.'
                : past
                  ? 'Was du getragen hast.'
                  : 'Dein nächster Look.')}
          </h1>
          <p className="muted">
            {entry
              ? worn
                ? 'Dein bestätigter Look für diesen Tag.'
                : past
                  ? 'Dieser Look war geplant. Ob du ihn getragen hast, ist noch nicht bestätigt.'
                  : 'Deine Auswahl aus dem Kalender.'
              : isToday
                ? 'Automatisch aus deinen Stücken, Vorlieben und der Saison kombiniert.'
                : past
                  ? 'Hier erscheinen deine bestätigten Tragetage.'
                  : 'Hier erscheinen deine eingeplanten Looks.'}
          </p>
        </header>
        {!state ? (
          <p role="status">Dein Tageslook wird geladen …</p>
        ) : look?.garmentIds.length ? (
          <>
            <OutfitPieces ids={look.garmentIds} items={items} onOpen={onOpen} />
            {!complete && (
              <p className="muted">
                Die Angaben dieses Looks haben sich geändert oder ein Stück
                fehlt. Prüfe den Eintrag im Kalender.
              </p>
            )}
            {entry?.note && <p className="calendar-note">{entry.note}</p>}
            {!!look.reasons.length && (
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
            )}
            <div className="daily-look-actions">
              {day <= today && (
                <button
                  className={`button ${worn ? 'secondary' : 'primary'}`}
                  disabled={busy || worn || !complete}
                  onClick={async () => {
                    setBusy(true)
                    setError('')
                    try {
                      await recordWornOutfit(
                        look.garmentIds,
                        look.options,
                        day,
                        entry?.updatedAt ?? null,
                      )
                      notify('Als getragen im Kalender vermerkt.')
                    } catch (error) {
                      setError(storageError(error))
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  <Check size={16} />
                  {worn
                    ? 'Getragen'
                    : isToday
                      ? 'Heute getragen'
                      : 'Als getragen bestätigen'}
                </button>
              )}
              {!entry && (
                <button
                  className="button secondary"
                  disabled={saved || busy || !complete}
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
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => (entry ? setEditing(true) : onOutfits())}
              >
                {entry ? 'Tag bearbeiten' : 'Looks anpassen'}{' '}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="daily-look-empty">
            <p>
              {entry
                ? 'Der verknüpfte Look ist nicht mehr verfügbar.'
                : isToday
                  ? automatic?.missing
                  : past
                    ? 'Für diesen Tag ist kein Look vermerkt.'
                    : 'Für diesen Tag ist noch kein Look eingeplant.'}
            </p>
            <button
              className="text-button"
              onClick={() =>
                !isToday && state.outfits.length
                  ? setEditing(true)
                  : onOutfits()
              }
            >
              {!isToday && state.outfits.length
                ? past
                  ? 'Getragenen Look eintragen'
                  : 'Look einplanen'
                : 'Auswahl anpassen'}{' '}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </section>
      {weatherOpen && (
        <Sheet title="Ort und Wetter" onClose={() => setWeatherOpen(false)}>
          <WeatherPanel
            initialOpen
            notify={notify}
            onClose={() => setWeatherOpen(false)}
          />
        </Sheet>
      )}
      {calendarOpen && state && (
        <Sheet title="Deine Tage." onClose={() => setCalendarOpen(false)}>
          <div className="home-calendar-picker">
            <DayCalendar
              day={day}
              today={today}
              entries={state.calendar}
              outfits={state.outfits}
              items={items}
              onSelect={select}
            />
            <label className="field">
              Direkt zu einem Tag
              <input
                type="date"
                min="1900-01-01"
                max="2200-12-31"
                value={day}
                onChange={(event) => {
                  if (isDay(event.target.value)) select(event.target.value)
                }}
              />
            </label>
          </div>
        </Sheet>
      )}
      {editing && state && (
        <PlanEditor
          key={`${day}:${entry?.updatedAt ?? 'new'}`}
          day={day}
          existing={entry}
          outfits={state.outfits}
          defaultStatus={day <= today ? 'worn' : 'planned'}
          onClose={() => setEditing(false)}
          notify={notify}
        />
      )}
    </>
  )
}
