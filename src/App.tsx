import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  ArrowRight,
  CircleAlert,
  Check,
  Heart,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  WifiOff,
  X,
  Settings,
} from 'lucide-react'
import {
  db,
  deleteGarment,
  storageError,
  toggleFavorite,
  setLaundry,
} from './db'
import { CATEGORIES, filterGarments, type Garment } from './model'
import { colorHex } from './swatch'
import { keepPhotoIdentity } from './photo-identity'
import { PairingSuggestions } from './PairingSuggestions'
import { EmptyIllustration } from './EmptyIllustration'
import { DailyOutfit } from './DailyOutfit'
import { LaundryIcon, useTapMotion } from './motion'
import { localDay, shiftDay } from './calendar'
import { lastWorn, wearStats, type WearStats } from './wear-stats'
import { useClock, useSavedWeatherRefresh } from './useWeather'
import { useDaySwipe } from './useDaySwipe'
import { ErrorMessage, GarmentCard, GarmentPicture, Sheet } from './ui'
import { useStylistInbox } from './stylist-inbox'
import { carriesImage, imagesFromDrop, imagesFromPaste } from './image-drop'
import {
  restorePageScroll,
  scrollSectionIntoView,
  usePresetView,
  useViewState,
} from './view-memory'

type View = 'home' | 'wardrobe' | 'outfits' | 'journal' | 'settings'

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
const BatchImport = lazy(() =>
  import('./BatchImport').then((module) => ({ default: module.BatchImport })),
)
const JournalView = lazy(() =>
  import('./JournalView').then((module) => ({ default: module.JournalView })),
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
  onAdd,
  onOpen,
  onOutfits,
  notify,
}: {
  items: Garment[]
  onAdd: () => void
  onOpen: (id: string) => void
  onOutfits: () => void
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
    </div>
  )
}

function Wardrobe({
  items,
  wear,
  onAdd,
  onOpen,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  onAdd: () => void
  onOpen: (id: string) => void
}) {
  const [category, setCategory] = useViewState('wardrobe.category', 'Alle')
  const [favorites, setFavorites] = useViewState('wardrobe.favorites', false)
  const [laundryOnly, setLaundryOnly] = useViewState('wardrobe.laundry', false)
  const filtered = filterGarments(items, '', category, favorites)
    .filter((item) => !laundryOnly || item.inLaundry)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const hasFilters = category !== 'Alle' || favorites || laundryOnly
  return (
    <div className="view wardrobe-view">
      <header className="page-heading journal-heading">
        <div className="heading-row">
          <div>
            <h1>Garderobe</h1>
            <p className="page-sub">
              {items.length} {items.length === 1 ? 'Stück' : 'Stücke'} ·{' '}
              {items.filter((item) => item.inLaundry).length} in der Wäsche
            </p>
          </div>
          <div className="heading-actions">
            <button
              className="icon-button primary-add"
              aria-label="Stück hinzufügen"
              onClick={onAdd}
            >
              <Plus size={22} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>
      <div
        className="category-tabs text-tabs"
        role="group"
        aria-label="Kategorie filtern"
      >
        {['Alle', ...CATEGORIES].map((c) => (
          <button
            key={c}
            className={category === c ? 'active' : ''}
            aria-label={c}
            aria-pressed={category === c}
            onClick={() => setCategory(c)}
          >
            {c}{' '}
            <small>
              {c === 'Alle'
                ? items.length
                : items.filter((item) => item.category === c).length}
            </small>
          </button>
        ))}
      </div>
      <div className="filter-chips">
        <button
          className={`chip ${favorites ? 'active' : ''}`}
          data-motion="heart"
          aria-label="Nur Favoriten"
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart
            size={14}
            strokeWidth={1.6}
            fill={favorites ? 'currentColor' : 'none'}
          />
          Favoriten
        </button>
        <button
          className={`chip ${laundryOnly ? 'active' : ''}`}
          data-motion="laundry"
          aria-label="Nur Wäsche"
          aria-pressed={laundryOnly}
          onClick={() => setLaundryOnly(!laundryOnly)}
        >
          <LaundryIcon size={15} />
          In der Wäsche
        </button>
      </div>
      {items.length > 0 && (
        <figure className="color-balance">
          <div aria-hidden="true">
            {[...items]
              .sort(
                (a, b) =>
                  (wear.get(b.id)?.count ?? 0) - (wear.get(a.id)?.count ?? 0),
              )
              .map((item) => (
                <span
                  key={item.id}
                  style={{
                    flex: Math.max(wear.get(item.id)?.count ?? 0, 1),
                    background: colorHex(item.color),
                  }}
                />
              ))}
          </div>
          <figcaption>Farbbilanz, gewichtet nach Tragehäufigkeit</figcaption>
        </figure>
      )}
      {filtered.length ? (
        <div className="garment-grid">
          {filtered.map((item) => (
            <GarmentCard
              key={item.id}
              item={item}
              worn={wear.get(item.id)?.count ?? 0}
              onOpen={() => onOpen(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="closet-empty">
          {!hasFilters && <EmptyIllustration />}
          <h2>{hasFilters ? 'Hier liegt gerade nichts.' : 'Noch leer'}</h2>
          <p>
            {hasFilters ? 'Anderer Filter?' : 'Füge dein erstes Stück hinzu.'}
          </p>
          {!hasFilters && (
            <button className="button primary" onClick={onAdd}>
              <Plus size={18} /> Stück hinzufügen
            </button>
          )}
        </div>
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
        <div className="detail-top">
          <div className="detail-photo">
            <GarmentPicture item={item} large />
            {item.inLaundry && (
              <span className="laundry-badge">In der Wäsche</span>
            )}
          </div>
          <div className="detail-wear">
            <p className="detail-count">
              {wear?.count ?? 0}
              <span>× getragen</span>
            </p>
            <p className="muted">
              {wear?.lastWorn
                ? `zuletzt ${lastWorn(wear.lastWorn)}`
                : 'noch nie getragen'}
            </p>
          </div>
        </div>
        <dl className="detail-facts">
          {(
            [
              ['Farbe', item.color],
              ['Marke', item.brand],
              ['Saison', item.seasons.join(', ')],
              ['Stil', item.styles.join(', ')],
              ['Notiz', item.notes],
            ] as const
          )
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        <PairingSuggestions item={item} items={items} onOpen={onOpen} />
        <div className="detail-toggles">
          <button
            className="button secondary laundry-toggle"
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
            <LaundryIcon size={16} />
            {item.inLaundry ? 'Aus der Wäsche nehmen' : 'In die Wäsche legen'}
          </button>
          <button
            data-motion="heart"
            className={`icon-button detail-heart ${item.favorite ? 'is-favorite' : ''}`}
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
            <Heart
              size={18}
              strokeWidth={1.5}
              fill={item.favorite ? 'currentColor' : 'none'}
            />
          </button>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {confirm ? (
          <div className="delete-confirm" role="alert">
            <h4>Dieses Stück wirklich löschen?</h4>
            <p>
              Outfits, Kalendereinträge und Bewertungen mit diesem Stück werden
              ebenfalls gelöscht.
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
  const shownPhotos = useRef(
    new Map<string, Pick<Garment, 'photo' | 'cutout'>>(),
  )
  const wardrobe = useLiveQuery(
    async () => {
      try {
        const read = await db.garments.orderBy('updatedAt').reverse().toArray()
        const items = await keepPhotoIdentity(read, shownPhotos.current)
        shownPhotos.current = new Map(
          items.map((item) => [
            item.id,
            { photo: item.photo, cutout: item.cutout },
          ]),
        )
        return { items, failed: false }
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
  const presetView = usePresetView()
  const tapMotion = useTapMotion()
  const [editor, setEditor] = useState<Garment | 'new' | null>(null)
  const [batch, setBatch] = useState<File[] | null>(null)
  // Images dragged in from another window or pasted; key restarts handling.
  const [incoming, setIncoming] = useState<{ files: File[]; key: number }>()
  const [dragging, setDragging] = useState(false)
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
  const receiving = useRef({ editor, batch })
  receiving.current = { editor, batch }
  useEffect(() => {
    const fail = (error: unknown) =>
      setToast({
        message:
          error instanceof Error
            ? error.message
            : 'Das Bild konnte nicht übernommen werden.',
        error: true,
      })
    function receive(files: File[]) {
      if (!files.length) return
      const { editor, batch } = receiving.current
      const open = document.querySelector('dialog[open]')
      if (batch || (open && !editor)) {
        fail(new Error('Schliesse zuerst das offene Fenster.'))
        return
      }
      if (!editor && files.length > 1) {
        setBatch(files)
        return
      }
      setIncoming({ files, key: Date.now() })
      if (!editor) setEditor('new')
    }
    const over = (event: DragEvent) => {
      if (!carriesImage(event.dataTransfer)) return
      // Never let the browser leave the app to show a dropped image.
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
      setDragging(true)
    }
    const leave = (event: DragEvent) => {
      if (!event.relatedTarget) setDragging(false)
    }
    const drop = (event: DragEvent) => {
      setDragging(false)
      if (!event.dataTransfer || !carriesImage(event.dataTransfer)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable]')) return
      event.preventDefault()
      imagesFromDrop(event.dataTransfer).then(receive, fail)
    }
    const paste = (event: ClipboardEvent) => {
      const files = imagesFromPaste(event.clipboardData)
      if (!files.length) return
      event.preventDefault()
      receive(files)
    }
    window.addEventListener('dragenter', over)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    window.addEventListener('paste', paste)
    return () => {
      window.removeEventListener('dragenter', over)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
      window.removeEventListener('paste', paste)
    }
  }, [])
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
            <span className="stylist-glyph">
              <MessageCircle size={21} strokeWidth={1.5} />
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
            className={`profile-button ${view === 'settings' ? 'active' : ''}`}
            aria-label="Einstellungen öffnen"
            aria-current={view === 'settings' ? 'page' : undefined}
            onClick={() => navigate('settings')}
          >
            <Settings size={20} strokeWidth={1.5} />
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
            onAdd={() => setEditor('new')}
            onOpen={setSelectedId}
            onOutfits={() => navigate('outfits')}
            notify={notify}
          />
        ) : view === 'wardrobe' ? (
          <Wardrobe
            items={items}
            wear={wear}
            onAdd={() => setEditor('new')}
            onOpen={setSelectedId}
          />
        ) : view === 'outfits' ? (
          <Suspense fallback={<Loading />}>
            <OutfitView
              items={items}
              onAdd={() => setEditor('new')}
              onToday={() => {
                presetView('home.day', null)
                navigate('home')
              }}
              notify={notify}
            />
          </Suspense>
        ) : view === 'journal' ? (
          <Suspense fallback={<Loading />}>
            <JournalView
              items={items}
              wear={wear}
              onOpen={setSelectedId}
              onLooks={() => navigate('outfits')}
              onBackup={() =>
                navigate('settings', () => {
                  cancelScroll.current = scrollSectionIntoView('backup-section')
                })
              }
              notify={notify}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<Loading />}>
            <BackupView items={items} notify={notify} />
          </Suspense>
        )}
      </main>
      <nav className="bottom-nav journal-nav" aria-label="Hauptnavigation">
        {view !== 'settings' && (
          <span
            className="nav-selection"
            aria-hidden="true"
            style={{
              transform: `translateX(${{ home: 0, wardrobe: 1, outfits: 2, journal: 3 }[view] * 100}%)`,
            }}
          />
        )}
        {(
          [
            { key: 'home', label: 'Heute', numeral: 'I' },
            { key: 'wardrobe', label: 'Garderobe', numeral: 'II' },
            { key: 'outfits', label: 'Looks', numeral: 'III' },
            { key: 'journal', label: 'Journal', numeral: 'IV' },
          ] as const
        ).map(({ key, label, numeral }) => (
          <button
            key={key}
            data-motion="nav"
            className={view === key ? 'active' : ''}
            aria-current={view === key ? 'page' : undefined}
            aria-label={label}
            onClick={() => navigate(key)}
          >
            <span className="nav-numeral" aria-hidden="true">
              {numeral}
            </span>
            <span aria-hidden="true">{label}</span>
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
            incoming={incoming}
            onClose={() => {
              setEditor(null)
              setIncoming(undefined)
            }}
            onSaved={() => {
              setEditor(null)
              setIncoming(undefined)
              // New pieces land where they are shown: in the wardrobe.
              if (editor === 'new' && view !== 'wardrobe') navigate('wardrobe')
              notify(
                editor === 'new'
                  ? 'Dein neues Stück liegt in der Garderobe.'
                  : 'Deine Änderungen sind gespeichert.',
              )
            }}
            onBatch={(files) => {
              setEditor(null)
              setIncoming(undefined)
              setBatch(files)
            }}
          />
        </Suspense>
      )}
      {batch && (
        <Suspense fallback={null}>
          <BatchImport
            files={batch}
            onClose={() => setBatch(null)}
            onSaved={(count) => {
              setBatch(null)
              notify(
                count === 1
                  ? '1 Stück gespeichert.'
                  : `${count} Stücke gespeichert.`,
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
      {dragging && !editor && !batch && (
        <div className="drop-overlay" aria-hidden="true">
          <ImagePlus size={34} strokeWidth={1.3} />
          <span>Bild hier ablegen</span>
        </div>
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
