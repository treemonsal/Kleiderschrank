import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight } from 'lucide-react'
import { db } from './db'
import { localDay } from './calendar'
import type { Garment } from './model'
import { CalendarView } from './CalendarView'
import { ShoppingCard } from './Shopping'
import { useClock } from './useWeather'
import { describeWear, wearStats, type WearStats } from './wear-stats'
import { GarmentPicture } from './ui'

export function JournalView({
  items,
  wear,
  onOpen,
  onLooks,
  onWardrobe,
  onBackup,
  notify,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  onOpen: (id: string) => void
  onLooks: () => void
  onWardrobe: (sort: 'least-worn' | 'newest') => void
  onBackup: () => void
  notify: (message: string) => void
}) {
  const today = localDay(new Date(useClock()))
  const month = today.slice(0, 7)
  const data = useLiveQuery(
    () =>
      db.transaction(
        'r',
        db.calendar,
        db.outfits,
        db.preferences,
        async () => ({
          calendar: await db.calendar.toArray(),
          outfits: await db.outfits.toArray(),
          reminder: (await db.preferences.get('personal'))?.backupReminder,
        }),
      ),
    [],
  )
  const monthEntries =
    data?.calendar.filter(
      (entry) => entry.status === 'worn' && entry.day.startsWith(month),
    ) ?? []
  const monthPieces = data
    ? wearStats(monthEntries, data.outfits, today).size
    : 0
  const monthName = new Date(`${month}-01T12:00:00`).toLocaleDateString(
    'de-CH',
    { month: 'long' },
  )
  // With wear days the list surfaces pieces that waited longest (never-worn
  // first); before that it confirms what was added recently.
  const forgottenMode = wear.size > 0
  const shelfTitle = forgottenMode
    ? 'Lange nicht getragen'
    : 'Zuletzt hinzugefügt'
  const forgotten = (
    forgottenMode
      ? items
          .filter((item) => !item.inLaundry)
          .sort(
            (a, b) =>
              (wear.get(a.id)?.lastWorn ?? '').localeCompare(
                wear.get(b.id)?.lastWorn ?? '',
              ) || a.name.localeCompare(b.name, 'de'),
          )
      : [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  ).slice(0, 4)
  const lastExport = data?.reminder?.lastExportedAt
  return (
    <div className="view journal-view">
      <header className="page-heading journal-heading">
        <div className="heading-row">
          <h1>Journal</h1>
        </div>
      </header>
      <CalendarView
        items={items}
        onOpen={onOpen}
        onDiscover={onLooks}
        notify={notify}
      />
      <div className="journal-stats">
        <div>
          <strong>{monthEntries.length}</strong>
          <span>Tragetage im {monthName}</span>
        </div>
        <div>
          <strong>{monthPieces}</strong>
          <span>verschiedene Stücke getragen</span>
        </div>
      </div>
      {forgotten.length > 0 && (
        <section className="journal-forgotten" aria-label={shelfTitle}>
          <div className="journal-section-heading">
            <h2>{shelfTitle}</h2>
            <button
              className="text-button"
              onClick={() =>
                onWardrobe(forgottenMode ? 'least-worn' : 'newest')
              }
            >
              Alle
            </button>
          </div>
          {forgotten.map((item) => (
            <button
              key={item.id}
              className="journal-row"
              aria-label={`${item.name} öffnen`}
              onClick={() => onOpen(item.id)}
            >
              <span className="journal-swatch" aria-hidden="true">
                <GarmentPicture item={item} />
              </span>
              <span className="journal-row-text">
                <strong>{item.name}</strong>
                <small>
                  {forgottenMode
                    ? describeWear(wear.get(item.id), today)
                    : `${item.category} · hinzugefügt am ${new Date(item.createdAt).toLocaleDateString('de-CH')}`}
                </small>
              </span>
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          ))}
        </section>
      )}
      <ShoppingCard />
      <div className="journal-backup">
        <div>
          <span>Sicherung</span>
          <small>
            {lastExport
              ? `Zuletzt am ${new Date(lastExport).toLocaleDateString('de-CH')}`
              : 'Noch keine Sicherung exportiert'}
          </small>
        </div>
        <button className="button secondary" onClick={onBackup}>
          Jetzt sichern
        </button>
      </div>
    </div>
  )
}
