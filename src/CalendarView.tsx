import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { dayLabel, localDay, type CalendarEntry } from './calendar'
import { db, storageError } from './db'
import { deleteCalendarEntry, saveCalendarEntry } from './calendar-db'
import type { Garment } from './model'
import type { SavedOutfit } from './outfit-model'
import { ErrorMessage, Sheet } from './ui'
import { DayCalendar } from './DayCalendar'
import { LookBands } from './LookBands'
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
      title="Tag planen"
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
            notify('Im Journal gespeichert.')
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
      db.transaction('r', db.calendar, db.outfits, async () => ({
        entries: await db.calendar.toArray(),
        outfits: await db.outfits.toArray(),
      })),
    [],
    null,
  )
  if (!data) return <p className="muted">Dein Journal wird geladen …</p>
  const entry = data.entries.find((entry) => entry.day === day)
  const outfit = data.outfits.find((outfit) => outfit.id === entry?.outfitId)
  const pieces =
    outfit?.garmentIds.flatMap((id) =>
      items.filter((item) => item.id === id),
    ) ?? []
  const today = localDay(new Date(now))
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
      <div className="calendar-day-card journal-day">
        <div className="journal-day-row">
          <h3>
            {new Intl.DateTimeFormat('de-CH', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              ...(day.slice(0, 4) !== today.slice(0, 4)
                ? { year: 'numeric' as const }
                : {}),
            }).format(new Date(`${day}T12:00:00`))}
          </h3>
          {entry && outfit ? (
            <span className={`calendar-status ${entry.status}`}>
              {entry.status === 'worn' ? 'Getragen' : 'Geplant'}
            </span>
          ) : day === today ? (
            <span className="calendar-status">Offen</span>
          ) : (
            <button className="text-button" onClick={() => select(today)}>
              Zu heute
            </button>
          )}
        </div>
        {outfit && entry ? (
          <>
            <LookBands ids={outfit.garmentIds} items={items} height={40} />
            <p className="journal-day-text">
              {outfit.name} ·{' '}
              {pieces.map((item, index) => (
                <span key={item.id}>
                  {index > 0 && ', '}
                  <button
                    className="inline-link"
                    aria-label={`${item.name} öffnen`}
                    onClick={() => onOpen(item.id)}
                  >
                    {item.name}
                  </button>
                </span>
              ))}
              {entry.note && (
                <>
                  {' · '}
                  <span className="journal-note">{entry.note}</span>
                </>
              )}
            </p>
            {confirm ? (
              <div className="delete-confirm" role="alert">
                <p>
                  Diesen Eintrag entfernen? Der gespeicherte Look und deine
                  Kleidung bleiben erhalten.
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
                        notify('Der Eintrag wurde entfernt.')
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
              <div className="journal-day-actions">
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => setEditing({ day, entry })}
                >
                  <Pencil size={15} />
                  Plan bearbeiten
                </button>
                {entry.status === 'planned' && day <= today && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true)
                      setError('')
                      try {
                        await saveCalendarEntry(
                          { ...entry, status: 'worn' },
                          entry.updatedAt,
                        )
                        notify('Als getragen vermerkt.')
                      } catch (error) {
                        setError(storageError(error))
                      } finally {
                        setBusy(false)
                      }
                    }}
                  >
                    <Check size={15} />
                    Getragen
                  </button>
                )}
                <button
                  className="text-button muted-action"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={15} />
                  Eintrag löschen
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="journal-day-none">
              {entry
                ? 'Der verknüpfte Look ist nicht mehr verfügbar.'
                : day < today
                  ? 'Kein Eintrag. Nachträglich wird nichts erfunden.'
                  : 'Noch nichts geplant.'}
            </p>
            <div className="journal-day-actions">
              <button
                className="text-button"
                onClick={() =>
                  data.outfits.length
                    ? setEditing({ day, entry })
                    : onDiscover()
                }
              >
                {data.outfits.length ? (
                  <>
                    <Plus size={15} />
                    {entry
                      ? 'Tag bearbeiten'
                      : day < today
                        ? 'Getragenen Look eintragen'
                        : 'Look einplanen'}
                  </>
                ) : (
                  'Looks zusammenstellen'
                )}
              </button>
            </div>
          </>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
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
