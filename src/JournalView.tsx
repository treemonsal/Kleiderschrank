import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { localDay } from './calendar'
import type { Garment } from './model'
import { CalendarView } from './CalendarView'
import { ShoppingCard } from './Shopping'
import { useClock } from './useWeather'
import { wearStats, type WearStats } from './wear-stats'
import { ForgottenShelf } from './ForgottenShelf'

export function JournalView({
  items,
  wear,
  onOpen,
  onLooks,
  onBackup,
  notify,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  onOpen: (id: string) => void
  onLooks: () => void
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
      <ForgottenShelf items={items} wear={wear} today={today} onOpen={onOpen} />
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
