import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarDays, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  dayLabel,
  isDay,
  localDay,
  wornCounts,
  type CalendarEntry,
} from './calendar'
import { db, storageError } from './db'
import { deleteCalendarEntry, saveCalendarEntry } from './calendar-db'
import type { Garment } from './model'
import type { SavedOutfit } from './outfit-model'
import { ErrorMessage, GarmentPicture, Sheet } from './ui'
import { DayCalendar } from './DayCalendar'
import { weatherFresh, weatherLabel } from './weather'
import { useClock } from './useWeather'
import { useViewState } from './view-memory'

export function PlanEditor({
  day,
  existing,
  outfits,
  onClose,
  notify,
  defaultStatus = 'planned',
}: {
  day: string
  existing?: CalendarEntry
  outfits: SavedOutfit[]
  onClose: () => void
  notify: (message: string) => void
  defaultStatus?: CalendarEntry['status']
}) {
  const [outfitId, setOutfitId] = useState(
    existing?.outfitId ?? outfits[0]?.id ?? '',
  )
  const [status, setStatus] = useState<CalendarEntry['status']>(
    existing?.status ?? defaultStatus,
  )
  const [note, setNote] = useState(existing?.note ?? '')
  const [baseline] = useState(() => JSON.stringify({ outfitId, status, note }))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Sheet
      title="Ein Look für deinen Tag."
      closeDisabled={busy}
      dirty={!busy && JSON.stringify({ outfitId, status, note }) !== baseline}
      eyebrow={dayLabel(day)}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className="plan-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            await saveCalendarEntry(
              { day, outfitId, status, note },
              existing?.updatedAt ?? null,
            )
            notify('Dein Kalender ist aktualisiert.')
            onClose()
          } catch (error) {
            setError(storageError(error))
          } finally {
            setBusy(false)
          }
        }}
      >
        <fieldset disabled={busy}>
          <label className="field">
            Gespeicherten Look wählen
            <select
              required
              value={outfitId}
              onChange={(event) => setOutfitId(event.target.value)}
            >
              {outfits.map((outfit) => (
                <option key={outfit.id} value={outfit.id}>
                  {outfit.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as CalendarEntry['status'])
              }
            >
              <option value="planned">Geplant</option>
              <option value="worn" disabled={day > localDay()}>
                Getragen
              </option>
            </select>
          </label>
          <label className="field">
            Notiz zum Tag
            <textarea
              maxLength={200}
              rows={3}
              placeholder="z. B. Abendessen mit Freunden"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
        </fieldset>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <p className="micro-copy">
          Ein gespeicherter Look pro Tag. Zukünftige Looks bleiben geplant.
        </p>
        <button className="button primary full" disabled={busy || !outfitId}>
          {busy ? 'Wird gespeichert …' : 'Tag speichern'}
        </button>
      </form>
    </Sheet>
  )
}

export function CalendarView({
  items,
  onOpen,
  onDiscover,
  notify,
}: {
  items: Garment[]
  onOpen: (id: string) => void
  onDiscover: () => void
  notify: (message: string) => void
}) {
  const now = useClock()
  const [day, setDay] = useViewState('calendar.day', localDay)
  const [editing, setEditing] = useState<{
    day: string
    entry?: CalendarEntry
  } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const data = useLiveQuery(
    () =>
      db.transaction('r', db.calendar, db.outfits, db.weather, async () => ({
        entries: await db.calendar.toArray(),
        outfits: await db.outfits.toArray(),
        weather: await db.weather.get('local'),
      })),
    [],
    null,
  )
  if (!data) return <p className="muted">Dein Kalender wird geladen …</p>
  const entry = data.entries.find((entry) => entry.day === day)
  const outfit = data.outfits.find((outfit) => outfit.id === entry?.outfitId)
  const pieces =
    outfit?.garmentIds.flatMap((id) =>
      items.filter((item) => item.id === id),
    ) ?? []
  const today = localDay(new Date(now))
  const counts = wornCounts(data.entries, data.outfits, today)
  const wornDays = data.entries.filter(
    (entry) => entry.status === 'worn' && entry.day <= today,
  ).length
  const weather =
    data.weather && weatherFresh(data.weather.report, now)
      ? data.weather.report.days.find((item) => item.day === day)
      : undefined
  function select(next: string) {
    setDay(next)
    setConfirm(false)
    setError('')
  }
  return (
    <section className="calendar-view" aria-label="Outfit-Kalender">
      <DayCalendar
        day={day}
        today={today}
        entries={data.entries}
        outfits={data.outfits}
        items={items}
        onSelect={select}
      />
      <div className="calendar-day-picker">
        <label className="field">
          Tag auswählen
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
        <button className="text-button" onClick={() => select(today)}>
          Heute
        </button>
      </div>
      <div className="calendar-day-card">
        <p className="eyebrow">{dayLabel(day)}</p>
        {outfit && entry ? (
          <>
            <div className="calendar-outfit-heading">
              <h3>{outfit.name}</h3>
              <span className={`calendar-status ${entry.status}`}>
                {entry.status === 'worn' ? 'Getragen' : 'Geplant'}
              </span>
            </div>
            <div className="outfit-pieces">
              {pieces.map((item) => (
                <button
                  key={item.id}
                  className="outfit-piece"
                  aria-label={`${item.name} öffnen`}
                  onClick={() => onOpen(item.id)}
                >
                  <GarmentPicture item={item} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
            {entry.note && <p className="calendar-note">{entry.note}</p>}
            <div className="calendar-entry-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setEditing({ day, entry })}
              >
                <Pencil size={16} />
                Plan bearbeiten
              </button>
              {entry.status === 'planned' && day <= today && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    setError('')
                    try {
                      await saveCalendarEntry(
                        { ...entry, status: 'worn' },
                        entry.updatedAt,
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
                  Getragen
                </button>
              )}
            </div>
            {confirm ? (
              <div className="delete-confirm" role="alert">
                <p>
                  Diesen Kalendereintrag entfernen? Der gespeicherte Look und
                  deine Kleidung bleiben erhalten.
                </p>
                <div className="photo-actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setConfirm(false)}
                  >
                    Behalten
                  </button>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      try {
                        await deleteCalendarEntry(day, entry.updatedAt)
                        setConfirm(false)
                        notify('Der Kalendereintrag wurde entfernt.')
                      } catch (error) {
                        setError(storageError(error))
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    Eintrag entfernen
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="text-button outfit-delete"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                <Trash2 size={15} />
                Kalendereintrag löschen
              </button>
            )}
          </>
        ) : (
          <div className="calendar-empty">
            <CalendarDays size={27} strokeWidth={1.2} />
            <h3>Dein Tag, dein Look.</h3>
            <p>
              {data.outfits.length
                ? 'Plane einen deiner gespeicherten Looks für diesen Tag.'
                : 'Speichere zuerst einen Look unter Entdecken. Danach kannst du ihn hier einplanen.'}
            </p>
            <button
              className="button primary"
              onClick={() =>
                data.outfits.length ? setEditing({ day, entry }) : onDiscover()
              }
            >
              <Plus size={16} />
              {data.outfits.length ? 'Look einplanen' : 'Looks entdecken'}
            </button>
          </div>
        )}
        {weather && data.weather && (
          <p className="calendar-weather">
            {data.weather.location.name}: {Math.round(weather.min)}–
            {Math.round(weather.max)} °C · {weatherLabel(weather.code)}. Stand{' '}
            {new Date(data.weather.report.fetchedAt).toLocaleString('de-CH')}.
          </p>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
      <section className="wear-summary">
        <h3>Was du wirklich trägst</h3>
        <p>
          {wornDays} {wornDays === 1 ? 'Tag' : 'Tage'} als getragen vermerkt.
          Nur bestätigte Tage bis heute zählen.
        </p>
        {[...counts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => (
            <div key={id}>
              <span>{items.find((item) => item.id === id)?.name}</span>
              <strong>{count}×</strong>
            </div>
          ))}
        <small>
          Die Häufigkeit wird aus dem Kalender berechnet. Entfernst du einen
          Eintrag oder Look, passt sie sich an.
        </small>
      </section>
      {editing && (
        <PlanEditor
          key={`${editing.day}:${editing.entry?.updatedAt ?? 'new'}`}
          day={editing.day}
          existing={editing.entry}
          outfits={data.outfits}
          onClose={() => setEditing(null)}
          notify={notify}
        />
      )}
    </section>
  )
}
