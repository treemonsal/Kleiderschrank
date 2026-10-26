import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Check,
  ArrowRight,
  Plus,
  CloudSun,
  CloudOff,
  Leaf,
  Tag,
} from 'lucide-react'
import type { Garment } from './model'
import { db, storageError } from './db'
import { OutfitRating } from './OutfitRating'
import { StyleProfileCard } from './StyleProfile'
import {
  DEFAULT_PREFERENCES,
  isCompleteOutfit,
  outfitKey,
} from './outfit-model'
import { chooseDailyOutfit } from './daily-outfit'
import { localDay, weekDays, type CalendarEntry } from './calendar'
import { dayColors } from './calendar-colors'
import { DayNumber, calendarDayDescription } from './DayCalendar'
import { PlanEditor } from './CalendarView'
import { recordWornOutfit } from './calendar-db'
import { weatherFresh, weatherLabel } from './weather'
import { useClock } from './useWeather'
import { WeatherPanel } from './WeatherPanel'
import { DailyRefinement } from './DailyRefinement'
import { OutfitSwap } from './OutfitSwap'
import { WeatherSymbol } from './WeatherSymbol'
import { recentWear } from './wear-history'
import { OutfitPieces } from './OutfitPieces'
import { EmptyIllustration } from './EmptyIllustration'
import { ErrorMessage, Sheet } from './ui'
import { figureOrder } from './swatch'

export function DailyOutfit({
  items,
  day,
  onSelectDay,
  onOpen,
  onOutfits,
  onAdd,
  notify,
}: {
  items: Garment[]
  day: string
  onSelectDay: (day: string) => void
  onOpen: (id: string) => void
  onOutfits: () => void
  onAdd: () => void
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
  const [editing, setEditing] = useState<{
    day: string
    entry?: CalendarEntry
  } | null>(null)
  const [previewIds, setPreviewIds] = useState<string[]>()
  const [swapping, setSwapping] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    setError('')
  }, [day])
  const date = new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(day.slice(0, 4) !== today.slice(0, 4)
      ? { year: 'numeric' as const }
      : {}),
  }).format(new Date(`${day}T12:00:00`))
  const worn = entry?.status === 'worn' && day <= today
  const weekday = new Intl.DateTimeFormat('de-CH', { weekday: 'long' }).format(
    new Date(`${day}T12:00:00`),
  )
  const shortDate = new Intl.DateTimeFormat('de-CH', {
    day: 'numeric',
    month: 'long',
    ...(day.slice(0, 4) !== today.slice(0, 4)
      ? { year: 'numeric' as const }
      : {}),
  }).format(new Date(`${day}T12:00:00`))
  function select(next: string) {
    if (!busy) {
      onSelectDay(next)
    }
  }
  function editDay() {
    // Keep the revision that the user opened. A live update from another
    // window must not remount this form and replace its unsaved draft.
    setEditing({ day, entry })
  }
  // Name today's suggestion after its two leading colours, like a plate title.
  const leadColors = [
    ...new Set(
      figureOrder(
        (look?.garmentIds ?? []).flatMap(
          (id) => items.find((item) => item.id === id) ?? [],
        ),
      )
        .map((item) => item.color)
        .filter(Boolean),
    ),
  ]
  const colorTitle =
    leadColors.length >= 2 ? `${leadColors[0]} & ${leadColors[1]}` : undefined
  const badge = entry
    ? worn
      ? 'Bestätigt getragen'
      : past
        ? 'Geplant · nicht bestätigt'
        : 'Eingeplant'
    : isToday
      ? items.length
        ? 'Für dich zusammengestellt'
        : 'Erster Schritt'
      : past
        ? 'Rückblick'
        : 'Planung'
  return (
    <>
      <div className="home-greeting home-day-summary journal-day-head">
        <div className="journal-date">
          <span className="kicker">
            {weekday}
            {isToday ? ' · heute' : ''}
          </span>
          <span className="home-date">{shortDate}</span>
        </div>
        {!isToday ? (
          <button
            className="text-button return-today"
            disabled={busy}
            onClick={() => select(today)}
          >
            Zu heute
          </button>
        ) : (
          <button
            className="home-weather"
            onClick={() => setWeatherOpen(true)}
            aria-label="Wetter anzeigen und Ort ändern"
          >
            {state?.weather && forecast ? (
              <>
                <span className="home-weather-line">
                  <WeatherSymbol code={forecast.code} size={20} />
                  <span className="weather-range">
                    {Math.round(forecast.min)}°–{Math.round(forecast.max)}°
                  </span>
                </span>
                <small>
                  {weatherLabel(forecast.code)} ·{' '}
                  {fresh
                    ? state.weather.location.name
                    : 'Gespeichert · veraltet'}
                </small>
              </>
            ) : (
              <>
                <span className="home-weather-line">
                  <WeatherSymbol code={forecast?.code} size={20} />
                  <span className="weather-range">Wetter</span>
                </span>
                <small>
                  {state?.weather
                    ? isToday
                      ? 'Vorhersage nicht aktuell'
                      : 'Keine Vorhersage für diesen Tag'
                    : 'Ort auswählen'}
                </small>
              </>
            )}
          </button>
        )}
      </div>
      <section
        className="home-timeline"
        aria-label="Deine Tage"
        data-day-busy={busy ? 'true' : undefined}
      >
        <span className="sr-only" role="status">
          {date}
        </span>
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
        <p className="calendar-ring-legend week-legend" aria-hidden="true">
          <span>
            <i className="legend-worn" />
            getragen, in seinen Farben
          </span>
          <span>
            <i className="legend-plan" />
            geplant
          </span>
        </p>
      </section>
      <div className="day-slide-viewport">
        <section
          className="daily-look day-slide"
          aria-label="Dein Tageslook"
          data-day={day}
          data-day-busy={busy ? 'true' : undefined}
        >
          <header>
            <p className="eyebrow">
              <span>{badge}</span>
              {!!look?.garmentIds.length && (
                <span className="look-count">
                  {look.garmentIds.length}{' '}
                  {look.garmentIds.length === 1 ? 'Teil' : 'Teile'}
                </span>
              )}
            </p>
            <h1>
              {recorded?.name ??
                (isToday
                  ? (colorTitle ?? 'Dein Look für heute')
                  : past
                    ? 'Vergangener Tag'
                    : 'Geplanter Look')}
            </h1>
            {(entry && !worn && past) ||
            (isToday && !entry && !items.length) ? (
              <p className="muted">
                {entry
                  ? 'Geplant, noch nicht bestätigt.'
                  : 'Für deinen ersten Look brauchst du Schuhe und ein Oberteil mit Hose oder ein Kleid.'}
              </p>
            ) : null}
          </header>
          {!state && items.length > 0 ? (
            <p role="status">Dein Tageslook wird geladen …</p>
          ) : state && look?.garmentIds.length ? (
            <>
              <div className="daily-context">
                {[
                  look.options.occasion,
                  look.options.season !== 'Alle' ? look.options.season : '',
                  !entry && state.preferences.useWeather !== false && fresh
                    ? 'Wetter berücksichtigt'
                    : !entry &&
                        state.preferences.useWeather !== false &&
                        state.weather &&
                        !fresh
                      ? 'Wetter veraltet · nicht verwendet'
                      : !entry
                        ? 'Ohne Wetter'
                        : '',
                ]
                  .filter(Boolean)
                  .map((label) => (
                    <span key={label} className="context-chip">
                      {label.startsWith('Wetter berücksichtigt') ? (
                        <CloudSun size={14} />
                      ) : label.includes('Wetter') ? (
                        <CloudOff size={14} />
                      ) : label === look.options.occasion ? (
                        <Tag size={14} />
                      ) : (
                        <Leaf size={14} />
                      )}
                      {label}
                    </span>
                  ))}
              </div>
              <div className="daily-quick-actions">
                {day <= today && (
                  <button
                    className={`button ${worn ? 'secondary' : 'primary'}`}
                    disabled={busy || worn || !complete}
                    onClick={async () => {
                      setBusy(true)
                      setError('')
                      try {
                        const washed = await recordWornOutfit(
                          look.garmentIds,
                          look.options,
                          day,
                          entry?.updatedAt ?? null,
                        )
                        notify(
                          washed.length
                            ? `Als getragen vermerkt. ${washed.join(', ')} ${washed.length === 1 ? 'liegt' : 'liegen'} jetzt in der Wäsche.`
                            : 'Als getragen im Kalender vermerkt.',
                        )
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
              </div>
              <OutfitPieces
                ids={previewIds ?? look.garmentIds}
                changedIds={
                  previewIds?.filter((id) => !look.garmentIds.includes(id)) ??
                  []
                }
                figure
                items={items}
                onOpen={onOpen}
                onSwap={isToday && !worn ? setSwapping : undefined}
              />
              {!!look.reasons.length && (
                <details className="outfit-reasons">
                  <summary>Warum diese Kombination?</summary>
                  <p>{look.reasons.join(' ')}</p>
                </details>
              )}
              {isToday && !worn && complete && (
                <DailyRefinement
                  key={`${day}:${outfitKey(look.garmentIds)}`}
                  items={items}
                  ids={look.garmentIds}
                  options={look.options}
                  preferences={state.preferences}
                  feedback={state.feedback}
                  outfits={state.outfits}
                  calendar={state.calendar}
                  day={day}
                  expectedEntry={entry?.updatedAt ?? null}
                  weather={
                    state.preferences.useWeather !== false && fresh
                      ? forecast
                      : undefined
                  }
                  disabled={busy}
                  onPreview={setPreviewIds}
                  notify={notify}
                />
              )}
              {isToday &&
                !worn &&
                look.garmentIds.some(
                  (id) => items.find((item) => item.id === id)?.inLaundry,
                ) && <p className="muted">Ein Teil liegt in der Wäsche.</p>}
              {!complete && (
                <p className="muted">
                  Die Angaben dieses Looks haben sich geändert oder ein Stück
                  fehlt. Prüfe den Eintrag im Kalender.
                </p>
              )}
              {entry?.note && <p className="calendar-note">{entry.note}</p>}
              {day <= today && complete && (
                <OutfitRating
                  key={outfitKey(look.garmentIds)}
                  ids={look.garmentIds}
                  occasion={look.options.occasion}
                  label="Tageslook"
                  rating={state.feedback.find(
                    (item) => item.id === outfitKey(look.garmentIds),
                  )}
                  disabled={busy}
                  notify={notify}
                />
              )}
            </>
          ) : (
            <div className="daily-look-empty">
              {isToday && !items.length && <EmptyIllustration />}
              {isToday && !entry && (
                <button className="button primary daily-add" onClick={onAdd}>
                  <Plus size={18} />
                  {items.length
                    ? 'Stück hinzufügen'
                    : 'Erstes Stück hinzufügen'}
                </button>
              )}
              <p>
                {entry
                  ? 'Der verknüpfte Look ist nicht mehr verfügbar.'
                  : isToday
                    ? items.length
                      ? automatic?.missing
                      : 'Starte mit einem Foto.'
                    : past
                      ? 'Für diesen Tag ist kein Look vermerkt.'
                      : 'Für diesen Tag ist noch kein Look eingeplant.'}
              </p>
              {items.length > 0 && (
                <button
                  className="text-button"
                  onClick={() =>
                    !isToday && state?.outfits.length ? editDay() : onOutfits()
                  }
                >
                  {!isToday && state?.outfits.length
                    ? past
                      ? 'Getragenen Look eintragen'
                      : 'Look einplanen'
                    : 'Auswahl anpassen'}{' '}
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
          {error && <ErrorMessage>{error}</ErrorMessage>}
        </section>
      </div>
      {isToday && <StyleProfileCard items={items} notify={notify} invitation />}
      {swapping && state && look && isToday && !worn && (
        <OutfitSwap
          items={items}
          ids={look.garmentIds}
          targetId={swapping}
          day={day}
          options={look.options}
          preferences={state.preferences}
          feedback={state.feedback}
          weather={
            state.preferences.useWeather !== false && fresh
              ? forecast
              : undefined
          }
          history={recentWear(state.calendar, state.outfits, day)}
          expectedEntry={entry?.updatedAt ?? null}
          onClose={() => setSwapping(null)}
          notify={notify}
        />
      )}
      {weatherOpen && (
        <Sheet title="Ort und Wetter" onClose={() => setWeatherOpen(false)}>
          <WeatherPanel
            initialOpen
            notify={notify}
            onClose={() => setWeatherOpen(false)}
          />
        </Sheet>
      )}
      {editing && state && (
        <PlanEditor
          key={editing.day}
          day={editing.day}
          existing={editing.entry}
          outfits={state.outfits}
          defaultStatus={editing.day <= today ? 'worn' : 'planned'}
          onClose={() => setEditing(null)}
          notify={notify}
        />
      )}
    </>
  )
}
