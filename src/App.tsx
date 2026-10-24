import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  ArrowRight,
  CircleAlert,
  Check,
  Heart,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Shirt,
  SlidersHorizontal,
  Trash2,
  WifiOff,
  X,
  Settings,
  ChartColumn,
  House,
  Layers,
  CircleEllipsis,
} from 'lucide-react'
import {
  db,
  deleteGarment,
  storageError,
  toggleFavorite,
  setLaundry,
} from './db'
import { CATEGORIES, filterGarments, type Garment } from './model'
import { BackupReminder } from './BackupReminder'
import { PairingSuggestions } from './PairingSuggestions'
import { ShoppingCard } from './Shopping'
import { DailyOutfit } from './DailyOutfit'
import { LaundryIcon, useTapMotion } from './motion'
import { localDay, shiftDay } from './calendar'
import {
  costPerWear,
  describeWear,
  formatChf,
  wearStats,
  type WearStats,
} from './wear-stats'
import { useClock, useSavedWeatherRefresh } from './useWeather'
import { useDaySwipe } from './useDaySwipe'
import { ErrorMessage, GarmentCard, GarmentPicture, Sheet } from './ui'
import { useStylistInbox } from './stylist-inbox'
import {
  restorePageScroll,
  scrollSectionIntoView,
  useViewState,
} from './view-memory'

type View = 'home' | 'wardrobe' | 'outfits' | 'settings'

// Rarely needed areas load on first use; the PWA still precaches every chunk.
const OutfitView = lazy(() =>
  import('./OutfitView').then((module) => ({ default: module.OutfitView })),
)
const BackupView = lazy(() =>
  import('./BackupView').then((module) => ({ default: module.BackupView })),
)
const Editor = lazy(() =>
  import('./Editor').then((module) => ({ default: module.Editor })),
)
const InsightsSheet = lazy(() =>
  import('./InsightsSheet').then((module) => ({
    default: module.InsightsSheet,
  })),
)
const StylistChat = lazy(() =>
  import('./StylistChat').then((module) => ({ default: module.StylistChat })),
)
function Loading() {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" />
      <p>Wird geöffnet …</p>
    </div>
  )
}

function Home({
  items,
  wear,
  onAdd,
  onWardrobe,
  onOpen,
  onOutfits,
  onBackup,
  notify,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  onAdd: () => void
  onWardrobe: () => void
  onOpen: (id: string) => void
  onOutfits: () => void
  onBackup: () => void
  notify: (message: string) => void
}) {
  const today = localDay(new Date(useClock()))
  const [chosenDay, setChosenDay] = useViewState<string | null>(
    'home.day',
    null,
  )
  const day = chosenDay ?? today
  const selectDay = (next: string) => setChosenDay(next === today ? null : next)
  const swipe = useDaySwipe((offset) => {
    const next = shiftDay(day, offset)
    if (next) selectDay(next)
  }, day)
  // With wear days the shelf surfaces forgotten pieces; before that it
  // confirms what was added recently.
  const forgottenMode = wear.size > 0
  const shelf = (
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
  ).slice(0, 6)
  const shelfTitle = forgottenMode
    ? 'Lange nicht getragen'
    : 'Zuletzt hinzugefügt'
  return (
    <div className="view home-view">
      <div className="home-day-browser" {...swipe}>
        <DailyOutfit
          day={day}
          onSelectDay={selectDay}
          items={items}
          onOpen={onOpen}
          onOutfits={onOutfits}
          onAdd={onAdd}
          notify={notify}
        />
      </div>
      <ShoppingCard hideLocked />
      <BackupReminder onBackup={onBackup} />
      {shelf.length > 0 && (
        <section className="home-collection" aria-label={shelfTitle}>
          <div className="section-heading">
            <div>
              <h2>{shelfTitle}</h2>
              <p className="muted">
                {forgottenMode
                  ? 'Sortiert nach letztem Tragetag.'
                  : 'Deine neuesten Stücke.'}
              </p>
            </div>
            <button className="text-button" onClick={onWardrobe}>
              Alle <ArrowRight size={16} />
            </button>
          </div>
          <div className="forgotten-row">
            {shelf.map((item) => (
              <button
                key={item.id}
                className="forgotten-piece"
                aria-label={`${item.name} öffnen`}
                onClick={() => onOpen(item.id)}
              >
                <GarmentPicture item={item} />
                <strong>{item.name}</strong>
                <small>
                  {forgottenMode
                    ? describeWear(wear.get(item.id), today)
                    : item.category}
                </small>
              </button>
            ))}
          </div>
        </section>
      )}
      {items.length > 0 && (
        <button className="add-banner" onClick={onAdd}>
          <span className="add-banner-icon">
            <Plus size={22} strokeWidth={1.5} />
          </span>
          <span>
            <strong>Ein Stück ergänzen</strong>
            <small>Foto aufnehmen oder aus der Mediathek wählen.</small>
          </span>
          <ArrowRight size={19} />
        </button>
      )}
    </div>
  )
}

function Wardrobe({
  items,
  wear,
  onAdd,
  onOpen,
  onFavorite,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  onAdd: () => void
  onOpen: (id: string) => void
  onFavorite: (item: Garment) => void
}) {
  const [query, setQuery] = useViewState('wardrobe.query', '')
  const [category, setCategory] = useViewState('wardrobe.category', 'Alle')
  const [favorites, setFavorites] = useViewState('wardrobe.favorites', false)
  const [laundryOnly, setLaundryOnly] = useViewState('wardrobe.laundry', false)
  const [sort, setSort] = useViewState('wardrobe.sort', 'newest')
  const [showSort, setShowSort] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const filtered = filterGarments(items, query, category, favorites)
    .filter((item) => !laundryOnly || item.inLaundry)
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'de')
        : sort === 'least-worn'
          ? (wear.get(a.id)?.count ?? 0) - (wear.get(b.id)?.count ?? 0) ||
            (wear.get(a.id)?.lastWorn ?? '').localeCompare(
              wear.get(b.id)?.lastWorn ?? '',
            ) ||
            a.name.localeCompare(b.name, 'de')
          : sort === 'oldest'
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
    )
  const hasFilters = !!query || category !== 'Alle' || favorites || laundryOnly
  return (
    <div className="view wardrobe-view">
      <header className="page-heading">
        <div className="heading-row">
          <h1>Kleiderschrank</h1>
          <div className="heading-actions">
            <button
              className="icon-button soft"
              aria-label="Auswertung öffnen"
              onClick={() => setInsightsOpen(true)}
            >
              <ChartColumn size={20} />
            </button>
            <button
              className="icon-button primary-add"
              aria-label="Stück hinzufügen"
              onClick={onAdd}
            >
              <Plus size={23} />
            </button>
          </div>
        </div>
        <p>
          {items.length
            ? `${items.length} ${items.length === 1 ? 'Stück' : 'Stücke'} in deiner Garderobe.`
            : 'Noch keine Stücke.'}
        </p>
      </header>
      <div className="search-row">
        <label className="search-field">
          <Search size={19} strokeWidth={1.6} />
          <input
            type="search"
            aria-label="Kleidung suchen"
            placeholder="Deine Stücke durchsuchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Suche leeren" onClick={() => setQuery('')}>
              <X size={17} />
            </button>
          )}
        </label>
        <button
          className={`icon-button filter-button ${favorites ? 'selected' : ''}`}
          data-motion="heart"
          aria-label="Nur Favoriten"
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart size={20} fill={favorites ? 'currentColor' : 'none'} />
        </button>
        <button
          className={`icon-button filter-button ${laundryOnly ? 'selected' : ''}`}
          data-motion="laundry"
          aria-label="Nur Wäsche"
          aria-pressed={laundryOnly}
          onClick={() => setLaundryOnly(!laundryOnly)}
        >
          <LaundryIcon size={20} />
        </button>
      </div>
      <div
        className="chips category-tabs"
        role="group"
        aria-label="Kategorie filtern"
      >
        {['Alle', ...CATEGORIES].map((c) => (
          <button
            key={c}
            className={`chip ${category === c ? 'active' : ''}`}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="collection-toolbar">
        <span>
          {filtered.length} {filtered.length === 1 ? 'Stück' : 'Stücke'}
          {hasFilters ? ' gefunden' : ' in deiner Kollektion'}
        </span>
        {hasFilters && (
          <button
            className="text-button"
            onClick={() => {
              setQuery('')
              setCategory('Alle')
              setFavorites(false)
              setLaundryOnly(false)
            }}
          >
            Filter zurücksetzen
          </button>
        )}
        <button
          className="text-button"
          aria-label="Sortierung ändern"
          aria-expanded={showSort}
          onClick={() => setShowSort(!showSort)}
        >
          <SlidersHorizontal size={15} />
          Sortieren
        </button>
      </div>
      {showSort && (
        <label className="field sort-field">
          Sortierung
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setShowSort(false)
            }}
          >
            <option value="newest">Zuletzt hinzugefügt</option>
            <option value="oldest">Zuerst hinzugefügt</option>
            <option value="name">Name A–Z</option>
            <option value="least-worn">Selten getragen zuerst</option>
          </select>
        </label>
      )}
      {filtered.length ? (
        <div className="garment-grid">
          {filtered.map((item) => (
            <GarmentCard
              key={item.id}
              item={item}
              onOpen={() => onOpen(item.id)}
              onFavorite={() => onFavorite(item)}
            />
          ))}
        </div>
      ) : (
        <div className="closet-empty">
          <div className="empty-icon">
            {hasFilters ? (
              <Search size={32} strokeWidth={1.2} />
            ) : (
              <Shirt size={35} strokeWidth={1.1} />
            )}
          </div>
          <h2>{hasFilters ? 'Kein Treffer' : 'Noch leer'}</h2>
          <p>
            {hasFilters
              ? 'Versuche einen anderen Suchbegriff oder passe deine Filter an.'
              : 'Dein Kleiderschrank ist noch leer. Füge dein erstes Stück hinzu und mach ihn zu deinem.'}
          </p>
          {!hasFilters && (
            <button className="button primary" onClick={onAdd}>
              <Plus size={18} /> Stück hinzufügen
            </button>
          )}
        </div>
      )}
      {insightsOpen && (
        <Suspense fallback={null}>
          <InsightsSheet
            items={items}
            onOpen={onOpen}
            onClose={() => setInsightsOpen(false)}
          />
        </Suspense>
      )}
    </div>
  )
}

function Detail({
  item,
  items,
  wear,
  onOpen,
  onClose,
  onEdit,
  onFavorite,
  onDeleted,
}: {
  item: Garment
  items: Garment[]
  wear?: WearStats
  onOpen: (id: string) => void
  onClose: () => void
  onEdit: () => void
  onFavorite: () => Promise<void>
  onDeleted: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Sheet
      title={item.name}
      eyebrow={item.category}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="detail-body">
        <GarmentPicture item={item} large />
        <div className="detail-title">
          <div>
            <p className="eyebrow">Marke</p>
            <h3>{item.brand || 'Ohne Marke'}</h3>
          </div>
          <button
            data-motion="heart"
            className={`icon-button soft ${item.favorite ? 'is-favorite' : ''}`}
            aria-label={
              item.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'
            }
            aria-pressed={item.favorite}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setError('')
              try {
                await onFavorite()
              } catch (error) {
                setError(storageError(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Heart size={22} fill={item.favorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <dl className="detail-facts">
          <div>
            <dt>Kategorie</dt>
            <dd>{item.category}</dd>
          </div>
          <div>
            <dt>Farbe</dt>
            <dd>{item.color || 'Nicht angegeben'}</dd>
          </div>
          <div>
            <dt>Jahreszeit</dt>
            <dd>{item.seasons.join(', ') || 'Nicht angegeben'}</dd>
          </div>
          <div>
            <dt>Stil</dt>
            <dd>{item.styles.join(', ') || 'Nicht angegeben'}</dd>
          </div>
          {item.price !== undefined && (
            <div>
              <dt>Preis</dt>
              <dd>
                {formatChf(item.price)}
                <small className="cost-per-wear">
                  {formatChf(costPerWear(item.price, wear?.count)!)} pro Tragen
                </small>
              </dd>
            </div>
          )}
        </dl>
        <button
          className="button secondary full laundry-toggle"
          data-motion="laundry"
          disabled={busy}
          aria-pressed={!!item.inLaundry}
          onClick={async () => {
            setBusy(true)
            setError('')
            try {
              await setLaundry(item.id, !item.inLaundry)
            } catch (error) {
              setError(storageError(error))
            } finally {
              setBusy(false)
            }
          }}
        >
          <LaundryIcon size={17} />
          {item.inLaundry ? 'Als sauber markieren' : 'In die Wäsche legen'}
        </button>
        <p className="micro-copy" role="status">
          {item.inLaundry
            ? 'In der Wäsche: für neue automatische Vorschläge ausgeblendet.'
            : 'Für neue Vorschläge verfügbar.'}
        </p>
        {item.notes && (
          <div className="detail-notes">
            <h4>Deine Notizen</h4>
            <p>{item.notes}</p>
          </div>
        )}
        <PairingSuggestions item={item} items={items} onOpen={onOpen} />
        <p className="micro-copy wear-line">{describeWear(wear)}</p>
        <p className="micro-copy">
          Hinzugefügt am{' '}
          {new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(
            new Date(item.createdAt),
          )}
        </p>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {confirm ? (
          <div className="delete-confirm" role="alert">
            <h4>Dieses Stück wirklich löschen?</h4>
            <p>
              Auch das Foto sowie gespeicherte Outfits, Kalendereinträge und
              Rückmeldungen mit diesem Stück werden entfernt. Das lässt sich nur
              mit einer Sicherung rückgängig machen.
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
                    await deleteGarment(item.id)
                    onDeleted()
                  } catch (err) {
                    setError(storageError(err))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                {busy ? 'Wird gelöscht …' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        ) : (
          <div className="detail-actions">
            <button className="button primary" onClick={onEdit}>
              <Pencil size={17} />
              Bearbeiten
            </button>
            <button
              className="icon-button delete-button"
              aria-label="Stück löschen"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={19} />
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

export default function App() {
  const wardrobe = useLiveQuery(
    async () => {
      try {
        return {
          items: await db.garments.orderBy('updatedAt').reverse().toArray(),
          failed: false,
        }
      } catch {
        return { items: null, failed: true }
      }
    },
    [],
    null,
  )
  const items = wardrobe?.items
  const wearData = useLiveQuery(async () => {
    try {
      return {
        calendar: await db.calendar.toArray(),
        outfits: await db.outfits.toArray(),
      }
    } catch {
      return undefined
    }
  }, [])
  const wear = wearData
    ? wearStats(wearData.calendar, wearData.outfits)
    : new Map<string, WearStats>()
  const [view, setView] = useState<View>('home')
  const [chatOpen, setChatOpen] = useState(false)
  // Keep the chat mounted after first use so drafts and requests survive closing.
  const [chatLoaded, setChatLoaded] = useState(false)
  const inbox = useStylistInbox()
  const tapMotion = useTapMotion()
  const [editor, setEditor] = useState<Garment | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    error?: boolean
  } | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [updateError, setUpdateError] = useState('')
  const scrollPositions = useRef<Partial<Record<View, number>>>({})
  const cancelScroll = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => cancelScroll.current?.(), [])
  useSavedWeatherRefresh(!offline)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setUpdateError(
        'Offline-Vorbereitung fehlgeschlagen. Bitte lade die App online erneut, bevor du sie offline verwendest.',
      ),
  })
  const notify = useCallback((message: string) => setToast({ message }), [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    const online = () => setOffline(false)
    const offline = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])
  function navigate(next: View, after?: () => void) {
    // Animate the mounted page in CSS, keeping the fixed navigation in front.
    // Commit before scroll/focus actions so they target the selected page.
    cancelScroll.current?.()
    scrollPositions.current[view] = window.scrollY
    const top =
      next === view || after ? 0 : (scrollPositions.current[next] ?? 0)
    flushSync(() => setView(next))
    if (next !== view)
      document.getElementById('main-content')?.focus({ preventScroll: true })
    cancelScroll.current = restorePageScroll(top)
    after?.()
  }
  async function favorite(item: Garment) {
    try {
      await toggleFavorite(item)
    } catch (err) {
      setToast({ message: storageError(err), error: true })
    }
  }
  const selected = items?.find((i) => i.id === selectedId)
  useEffect(() => {
    if (items && selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null)
      notify('Dieses Stück wurde inzwischen entfernt.')
    }
  }, [items, selectedId, notify])
  return (
    <div className="app-shell" onClickCapture={tapMotion}>
      <a className="skip-link" href="#main-content">
        Zum Inhalt
      </a>
      <header className="app-header">
        <button
          className="wordmark"
          aria-label="MyStyle Startseite"
          onClick={() => navigate('home')}
        >
          MyStyle
        </button>
        <div className="header-right">
          <button
            className="profile-button stylist-link"
            aria-label="Mit deinem Stylisten sprechen"
            aria-describedby={inbox.hasUnread ? 'stylist-notice' : undefined}
            disabled={!items || wardrobe?.failed || !!editor || !!selected}
            onClick={() => {
              setChatLoaded(true)
              setChatOpen(true)
            }}
          >
            <span>Stylist</span>
            <span className="stylist-glyph">
              <MessageCircle size={17} strokeWidth={1.5} />
              {inbox.hasUnread && (
                <span className="inbox-dot" aria-hidden="true" />
              )}
            </span>
          </button>
          {inbox.hasUnread && (
            <span id="stylist-notice" className="sr-only">
              {inbox.newInterview
                ? 'Neue freiwillige Stilfrage'
                : 'Ungelesene Antwort deines Stylisten'}
            </span>
          )}
          <button
            className="profile-button"
            aria-label="Einstellungen öffnen"
            onClick={() => navigate('settings')}
          >
            <Settings size={21} strokeWidth={1.6} />
          </button>
        </div>
      </header>
      {offline && (
        <p className="offline-banner" role="status">
          <WifiOff size={14} />
          Du bist offline. Dein Kleiderschrank bleibt bei dir.
        </p>
      )}
      {updateError && <ErrorMessage>{updateError}</ErrorMessage>}
      {needRefresh && !editor && !chatOpen && !selected && (
        <div className="update-banner" role="status">
          <span>Eine neue Version ist bereit.</span>
          <button
            onClick={() => {
              void updateServiceWorker(true).catch(() =>
                setUpdateError(
                  'Das Update konnte nicht geladen werden. Bitte versuche es online erneut.',
                ),
              )
            }}
          >
            Jetzt aktualisieren <ArrowRight size={14} />
          </button>
        </div>
      )}
      <main id="main-content" key={view} tabIndex={-1}>
        {wardrobe?.failed ? (
          <section
            className="storage-failure"
            aria-label="Speicher nicht erreichbar"
          >
            <h1>Dein Kleiderschrank lässt sich gerade nicht öffnen.</h1>
            <p role="alert">
              Der lokale Gerätespeicher ist nicht erreichbar. Prüfe, ob dein
              Browser Website-Speicherung erlaubt, und versuche es erneut. Die
              App hat nichts gelöscht.
            </p>
            <button
              className="button primary"
              disabled={!!editor}
              onClick={() => location.reload()}
            >
              Erneut laden
            </button>
            <p className="micro-copy">
              Lösche keine Website-Daten. Eine vorhandene Sicherung kannst du
              wiederherstellen, sobald der Speicher erreichbar ist.
            </p>
          </section>
        ) : items === null || items === undefined ? (
          <div className="loading-state" role="status">
            <LoaderCircle className="spin" />
            <p>Dein Kleiderschrank wird geöffnet …</p>
          </div>
        ) : view === 'home' ? (
          <Home
            items={items}
            wear={wear}
            onAdd={() => setEditor('new')}
            onWardrobe={() => navigate('wardrobe')}
            onOpen={setSelectedId}
            onOutfits={() => navigate('outfits')}
            onBackup={() => {
              navigate('settings', () => {
                cancelScroll.current = scrollSectionIntoView('backup-section')
              })
            }}
            notify={notify}
          />
        ) : view === 'wardrobe' ? (
          <Wardrobe
            items={items}
            wear={wear}
            onAdd={() => setEditor('new')}
            onOpen={setSelectedId}
            onFavorite={(item) => void favorite(item)}
          />
        ) : view === 'outfits' ? (
          <Suspense fallback={<Loading />}>
            <OutfitView
              items={items}
              onOpen={setSelectedId}
              onAdd={() => setEditor('new')}
              notify={notify}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<Loading />}>
            <BackupView items={items} notify={notify} />
          </Suspense>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Hauptnavigation">
        <span
          className="nav-selection"
          aria-hidden="true"
          style={{
            transform: `translateX(${{ home: 0, wardrobe: 1, outfits: 2, settings: 3 }[view] * 100}%)`,
          }}
        />
        {(
          [
            { key: 'home', label: 'Heute', Icon: House },
            { key: 'wardrobe', label: 'Kleiderschrank', Icon: Shirt },
            { key: 'outfits', label: 'Outfits', Icon: Layers },
            { key: 'settings', label: 'Mehr', Icon: CircleEllipsis },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            data-motion="nav"
            className={view === key ? 'active' : ''}
            aria-current={view === key ? 'page' : undefined}
            onClick={() => navigate(key)}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={view === key ? 2 : 1.6} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {selected && !editor && (
        <Detail
          key={selected.id}
          item={selected}
          items={items ?? []}
          wear={wear.get(selected.id)}
          onOpen={setSelectedId}
          onClose={() => setSelectedId(null)}
          onEdit={() => {
            setEditor(selected)
            setSelectedId(null)
          }}
          onFavorite={() => toggleFavorite(selected)}
          onDeleted={() => {
            setSelectedId(null)
            notify('Das Stück wurde gelöscht.')
          }}
        />
      )}
      {editor && (
        <Suspense fallback={null}>
          <Editor
            key={editor === 'new' ? 'new' : editor.id}
            item={editor === 'new' ? undefined : editor}
            onClose={() => setEditor(null)}
            onSaved={() => {
              setEditor(null)
              notify(
                editor === 'new'
                  ? 'Dein neues Stück ist im Kleiderschrank.'
                  : 'Deine Änderungen sind gespeichert.',
              )
            }}
          />
        </Suspense>
      )}
      {chatLoaded && (
        <Suspense fallback={null}>
          <StylistChat
            open={chatOpen}
            newInterview={inbox.newInterview}
            markReplyRead={inbox.markReply}
            markInterviewRead={inbox.markInterview}
            onClose={() => setChatOpen(false)}
            onOpen={setSelectedId}
            notify={notify}
          />
        </Suspense>
      )}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className={`toast ${toast.error ? 'toast-error' : ''}`}>
            {toast.error ? <CircleAlert size={18} /> : <Check size={18} />}
            <span>{toast.message}</span>
            <button
              aria-label="Hinweis schliessen"
              onClick={() => setToast(null)}
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
