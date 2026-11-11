import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  CircleAlert,
  Check,
  Heart,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Pencil,
  Scissors,
  Plus,
  Trash2,
  WifiOff,
  X,
  ChartPie,
  ChevronLeft,
  Menu,
  Shuffle,
} from 'lucide-react'
import { analyzePhoto, readAIConnection } from './cloud-ai'
import { haptic } from './haptics'
import {
  attachCutout,
  db,
  deleteGarment,
  setArchived,
  storageError,
  toggleFavorite,
  setLaundry,
} from './db'
import { CATEGORIES, filterGarments, type Garment } from './model'
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
import { useDriveSync, useGoogleSession } from './DriveSync'
import { WARMTH_LABELS } from './warmth'
import { searchEndpoint } from './product-search'
import { AddSheet } from './AddSheet'
import { NameSheet } from './NameSheet'
import { AddIcon, HomeIcon, ProfileIcon } from './ProfileIcon'
import {
  restorePageScroll,
  scrollSectionIntoView,
  usePresetView,
  useViewState,
} from './view-memory'

/** Home, the profile (wardrobe), and the journal and settings it opens. */
type View = 'home' | 'wardrobe' | 'journal' | 'settings'

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
const ProductSearch = lazy(() =>
  import('./ProductSearch').then((module) => ({
    default: module.ProductSearch,
  })),
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
  /** Opens the sheet with other outfits (suggest or build one). */
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
      {/* Home shows today's outfit only; everything else waits in a sheet. */}
      {items.length > 0 && (
        <button
          className="button secondary full other-outfit"
          onClick={onOutfits}
        >
          <Shuffle size={17} />
          Anderes Outfit
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
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  onAdd: () => void
  onOpen: (id: string) => void
}) {
  const [category, setCategory] = useViewState('wardrobe.category', 'Alle')
  const [favorites, setFavorites] = useViewState('wardrobe.favorites', false)
  const [laundryOnly, setLaundryOnly] = useViewState('wardrobe.laundry', false)
  const [archiveOnly, setArchiveOnly] = useViewState('wardrobe.archive', false)
  const [menu, setMenu] = useState<Garment | null>(null)
  const [menuError, setMenuError] = useState('')
  // Sorted-out pieces have their own list; everything else shows the rest.
  const active = items.filter((item) => !item.archivedAt)
  const archived = items.filter((item) => item.archivedAt)
  const showArchive = archiveOnly && archived.length > 0
  const base = showArchive ? archived : active
  const filtered = filterGarments(base, '', category, favorites)
    .filter((item) => !laundryOnly || item.inLaundry)
    .sort((a, b) =>
      showArchive
        ? (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')
        : b.createdAt.localeCompare(a.createdAt),
    )
  const hasFilters =
    category !== 'Alle' || favorites || laundryOnly || showArchive
  return (
    <div className="wardrobe-view">
      {/* Filters only once there is something to filter. */}
      {items.length > 0 && (
        <div className="wardrobe-filter-bar">
          <div
            className="category-tabs text-tabs"
            role="group"
            aria-label="Kategorie filtern"
          >
            {['Alle', ...CATEGORIES]
              .filter(
                (c) =>
                  c === 'Alle' ||
                  c === category ||
                  base.some((item) => item.category === c),
              )
              .map((c) => (
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
                      ? base.length
                      : base.filter((item) => item.category === c).length}
                  </small>
                </button>
              ))}
          </div>
          <div className="filter-chips" role="group" aria-label="Filter">
            <button
              className={`chip ${favorites ? 'active' : ''}`}
              data-motion="heart"
              aria-label="Nur Favoriten"
              aria-pressed={favorites}
              onClick={() => setFavorites(!favorites)}
            >
              <Heart
                size={17}
                strokeWidth={1.7}
                fill={favorites ? 'currentColor' : 'none'}
              />
            </button>
            <button
              className={`chip ${laundryOnly ? 'active' : ''}`}
              data-motion="laundry"
              aria-label="Nur Wäsche"
              aria-pressed={laundryOnly}
              onClick={() => setLaundryOnly(!laundryOnly)}
            >
              <LaundryIcon size={18} />
            </button>
            {archived.length > 0 && (
              <button
                className={`chip ${showArchive ? 'active' : ''}`}
                aria-label="Nur aussortierte Stücke"
                aria-pressed={showArchive}
                onClick={() => setArchiveOnly(!showArchive)}
              >
                <Archive size={17} strokeWidth={1.7} />
              </button>
            )}
          </div>
        </div>
      )}
      {filtered.length ? (
        <div className="garment-grid">
          {filtered.map((item) => (
            <GarmentCard
              key={item.id}
              item={item}
              worn={wear.get(item.id)?.count ?? 0}
              onOpen={() => onOpen(item.id)}
              onMenu={() => {
                haptic()
                setMenuError('')
                setMenu(item)
              }}
            />
          ))}
        </div>
      ) : (
        <div className="closet-empty">
          {!hasFilters && <EmptyIllustration />}
          <h2>{hasFilters ? 'Hier liegt gerade nichts.' : 'Noch leer'}</h2>
          {!hasFilters && (
            <button className="button primary" onClick={onAdd}>
              <Plus size={18} /> Stück hinzufügen
            </button>
          )}
        </div>
      )}
      {menu && (
        <Sheet
          title={menu.name}
          className="piece-menu"
          onClose={() => setMenu(null)}
        >
          <div className="add-options">
            {(
              [
                [
                  menu.favorite ? 'Favorit entfernen' : 'Als Favorit markieren',
                  <Heart
                    key="h"
                    size={22}
                    strokeWidth={1.6}
                    fill={menu.favorite ? 'currentColor' : 'none'}
                  />,
                  () => toggleFavorite(menu),
                ],
                ...(menu.archivedAt
                  ? []
                  : [
                      [
                        menu.inLaundry
                          ? 'Aus der Wäsche nehmen'
                          : 'In die Wäsche legen',
                        <LaundryIcon key="l" size={22} />,
                        () => setLaundry(menu.id, !menu.inLaundry),
                      ] as const,
                    ]),
              ] as const
            ).map(([label, icon, run]) => (
              <button
                key={label}
                className="add-option"
                onClick={async () => {
                  haptic()
                  try {
                    await run()
                    setMenu(null)
                  } catch (caught) {
                    setMenuError(storageError(caught))
                  }
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
            <button
              className="add-option"
              onClick={() => {
                const id = menu.id
                setMenu(null)
                onOpen(id)
              }}
            >
              <ArrowRight size={22} strokeWidth={1.6} />
              <span>Öffnen</span>
            </button>
          </div>
          {menuError && <ErrorMessage>{menuError}</ErrorMessage>}
        </Sheet>
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
  onArchived,
}: {
  item: Garment
  items: Garment[]
  wear?: WearStats
  onOpen: (id: string) => void
  onClose: () => void
  onEdit: () => void
  onFavorite: () => Promise<void>
  onDeleted: () => void
  onArchived: (archived: boolean) => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cutting, setCutting] = useState(false)
  const cutWork = useRef<AbortController | null>(null)
  // Closing the piece stops a running cut-out.
  useEffect(() => () => cutWork.current?.abort(), [])
  /** A new try when the first cut-out failed or looks wrong. */
  async function recut() {
    const connection = readAIConnection()
    if (!item.photo) return
    if (!connection?.enabled) {
      setError(
        'Freistellen braucht die kostenlose KI. Du schaltest sie in den Einstellungen ein.',
      )
      return
    }
    const controller = new AbortController()
    cutWork.current = controller
    setCutting(true)
    setError('')
    try {
      const { cutout } = await analyzePhoto(
        item.photo,
        connection,
        controller.signal,
        'cutout',
      )
      if (!cutout)
        throw new Error(
          'Das Freistellen hat kein Bild geliefert. Versuche es nochmals.',
        )
      const saved = await attachCutout(item.id, item.updatedAt, cutout, db, {
        replace: true,
      })
      if (!saved)
        setError('Das Stück wurde inzwischen geändert. Versuche es nochmals.')
    } catch (caught) {
      if (controller.signal.aborted) return
      setError(caught instanceof Error ? caught.message : storageError(caught))
    } finally {
      if (!controller.signal.aborted) setCutting(false)
    }
  }
  async function archive(archived: boolean) {
    setBusy(true)
    setError('')
    try {
      await setArchived(item.id, archived)
      onArchived(archived)
    } catch (err) {
      setError(storageError(err))
      setBusy(false)
    }
  }
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
            {item.archivedAt && (
              <p className="detail-archived">
                Aussortiert am{' '}
                {new Date(item.archivedAt).toLocaleDateString('de-CH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>
        <dl className="detail-facts">
          {(
            [
              [
                'Farbe',
                item.secondaryColors?.length
                  ? `${item.color}, dazu ${item.secondaryColors.join(', ')}`
                  : item.color,
              ],
              ['Marke', item.brand],
              ['Saison', item.seasons.join(', ')],
              ['Wärme', item.warmth ? WARMTH_LABELS[item.warmth] : ''],
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
        {!item.archivedAt && (
          <PairingSuggestions item={item} items={items} onOpen={onOpen} />
        )}
        {!item.archivedAt && (
          <div className="detail-toggles">
            <button
              className="button secondary laundry-toggle"
              data-motion="laundry"
              disabled={busy}
              aria-pressed={!!item.inLaundry}
              onClick={async () => {
                haptic()
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
            {item.photo && (
              <button
                className="icon-button detail-recut"
                aria-label={cutting ? 'Wird freigestellt' : 'Neu freistellen'}
                disabled={busy || cutting}
                onClick={() => void recut()}
              >
                {cutting ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <Scissors size={18} strokeWidth={1.6} />
                )}
              </button>
            )}
            <button
              data-motion="heart"
              className={`icon-button detail-heart ${item.favorite ? 'is-favorite' : ''}`}
              aria-label={
                item.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'
              }
              aria-pressed={item.favorite}
              disabled={busy}
              onClick={async () => {
                haptic()
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
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {confirm ? (
          <div className="delete-confirm" role="alert">
            <h4>Dieses Stück endgültig löschen?</h4>
            <p>
              Outfits, Kalendereinträge und Bewertungen mit diesem Stück werden
              ebenfalls gelöscht. Aussortiert bleibt dein Journal vollständig.
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
            {item.archivedAt ? (
              <>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => void archive(false)}
                >
                  <ArchiveRestore size={17} />
                  Zurückholen
                </button>
                <button
                  className="icon-button delete-button"
                  aria-label="Stück löschen"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  <Trash2 size={19} />
                </button>
              </>
            ) : (
              <>
                <button className="button primary" onClick={onEdit}>
                  <Pencil size={17} />
                  Bearbeiten
                </button>
                <button
                  className="icon-button archive-button"
                  aria-label="Aussortieren"
                  disabled={busy}
                  onClick={() => void archive(true)}
                >
                  <Archive size={19} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

/** The profile: who, how much, and every piece; like Fits, our own data. */
function Profile({
  items,
  wear,
  name,
  picture,
  looks,
  wornDays,
  onOpen,
  onAdd,
  onEditName,
  onStyle,
  saved,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  name: string
  /** Own picture or the Google one; initials without. */
  picture?: string
  looks: number
  wornDays: number
  onOpen: (id: string) => void
  onAdd: () => void
  onEditName: () => void
  onStyle: () => void
  saved: React.ReactNode
}) {
  const [tab, setTab] = useViewState<'clothes' | 'looks'>(
    'profile.tab',
    'clothes',
  )
  const pieces = items.filter((item) => !item.archivedAt).length
  const [brokenPicture, setBrokenPicture] = useState(false)
  useEffect(() => setBrokenPicture(false), [picture])
  const initials =
    name
      .split(/\s+|\./)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'M'
  return (
    <div className="view profile-view">
      <section className="profile-head" aria-label="Profil">
        <span className="profile-avatar" aria-hidden="true">
          {picture && !brokenPicture ? (
            <img
              src={picture}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setBrokenPicture(true)}
            />
          ) : (
            initials
          )}
        </span>
        {/* Numbers only once they say something: no row of zeros. */}
        {pieces + looks + wornDays > 0 && (
          <dl className="profile-stats">
            {(
              [
                ['Stücke', pieces],
                ['Outfits', looks],
                ['Getragen', wornDays],
              ] as const
            )
              .filter(([, value]) => value > 0)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        )}
      </section>
      <div className="profile-actions">
        <button className="button secondary" onClick={onEditName}>
          Profil bearbeiten
        </button>
        <button className="button secondary" onClick={onStyle}>
          Stilprofil
        </button>
      </div>
      <div
        className="profile-tabs outfit-tabs"
        role="group"
        aria-label="Profilbereich"
      >
        <button
          className={tab === 'clothes' ? 'active' : ''}
          aria-pressed={tab === 'clothes'}
          onClick={() => setTab('clothes')}
        >
          Kleidung
        </button>
        <button
          className={tab === 'looks' ? 'active' : ''}
          aria-pressed={tab === 'looks'}
          onClick={() => setTab('looks')}
        >
          Outfits
        </button>
      </div>
      {tab === 'clothes' ? (
        <Wardrobe items={items} wear={wear} onAdd={onAdd} onOpen={onOpen} />
      ) : (
        saved
      )}
    </div>
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
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [composing, setComposing] = useState(false)
  const [naming, setNaming] = useState(false)
  const google = useGoogleSession()
  const profile = useLiveQuery(async () => {
    const preferences = await db.preferences.get('personal')
    return { name: preferences?.displayName, avatar: preferences?.avatar }
  }, [])
  const profileName = profile?.name
  const displayName =
    profileName?.trim() || google?.email?.split('@')[0] || 'Profil'
  const profilePicture = profile?.avatar ?? google?.picture
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
  useDriveSync(
    useCallback(
      (message: string, error?: boolean) => setToast({ message, error }),
      [],
    ),
  )
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
    // Commit before scroll/focus actions so they target the selected page.
    const go = () => {
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
    // Journal and settings slide in from the right and back out, like an
    // iOS navigation stack; the tabs themselves switch at once, as on iOS.
    const pushed = (v: View) => v === 'journal' || v === 'settings'
    const direction =
      view === 'wardrobe' && pushed(next)
        ? 'push'
        : pushed(view) && next === 'wardrobe'
          ? 'pop'
          : null
    const transition = (
      document as Document & {
        startViewTransition?: (update: () => void) => unknown
      }
    ).startViewTransition
    if (
      !direction ||
      !transition ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return go()
    document.documentElement.dataset.nav = direction
    transition.call(document, go)
  }
  // Swipe from the left edge goes back from journal and settings.
  useEffect(() => {
    if (view !== 'journal' && view !== 'settings') return
    let start: { x: number; y: number } | null = null
    const down = (event: TouchEvent) => {
      const touch = event.touches[0]
      start =
        event.touches.length === 1 && touch.clientX < 28
          ? { x: touch.clientX, y: touch.clientY }
          : null
    }
    const up = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!start || !touch) return
      const dx = touch.clientX - start.x
      const dy = Math.abs(touch.clientY - start.y)
      start = null
      if (dx > 70 && dy < dx / 2 && !document.querySelector('dialog[open]')) {
        haptic()
        navigate('wardrobe')
      }
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
    }
  })
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
        {view === 'wardrobe' ? (
          <h1 className="wordmark profile-name">{displayName}</h1>
        ) : view === 'journal' || view === 'settings' ? (
          <button
            className="back-button"
            aria-label="Zurück zum Profil"
            onClick={() => navigate('wardrobe')}
          >
            <ChevronLeft size={26} strokeWidth={2} />
            <span aria-hidden="true">Profil</span>
          </button>
        ) : (
          <button
            className="wordmark"
            aria-label="MyStyle Startseite"
            onClick={() => navigate('home')}
          >
            MyStyle
          </button>
        )}
        <div className="header-right">
          {view === 'wardrobe' ? (
            <button
              className="profile-button"
              aria-label="Journal"
              onClick={() => navigate('journal')}
            >
              <ChartPie size={21} strokeWidth={1.6} />
            </button>
          ) : (
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
          )}
          {inbox.hasUnread && view !== 'wardrobe' && (
            <span id="stylist-notice" className="sr-only">
              {inbox.newInterview
                ? 'Neue freiwillige Stilfrage'
                : 'Ungelesene Antwort deines Stylisten'}
            </span>
          )}
          {/* Settings belong to the profile, like in Fits. */}
          {view === 'wardrobe' && (
            <button
              className="profile-button"
              aria-label="Einstellungen öffnen"
              onClick={() => navigate('settings')}
            >
              <Menu size={21} strokeWidth={1.5} />
            </button>
          )}
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
            onOutfits={() => setComposing(true)}
            notify={notify}
          />
        ) : view === 'wardrobe' ? (
          <Profile
            items={items}
            wear={wear}
            name={displayName}
            picture={profilePicture}
            looks={wearData?.outfits.length ?? 0}
            wornDays={
              wearData?.calendar.filter((entry) => entry.status === 'worn')
                .length ?? 0
            }
            onOpen={setSelectedId}
            onAdd={() => setAdding(true)}
            onEditName={() => setNaming(true)}
            onStyle={() =>
              navigate('settings', () => {
                cancelScroll.current = scrollSectionIntoView('style-profile')
              })
            }
            saved={
              <Suspense fallback={<Loading />}>
                <OutfitView
                  items={items}
                  mode="saved"
                  onAdd={() => setAdding(true)}
                  onToday={() => {
                    presetView('home.day', null)
                    navigate('home')
                  }}
                  notify={notify}
                />
              </Suspense>
            }
          />
        ) : view === 'journal' ? (
          <Suspense fallback={<Loading />}>
            <JournalView
              items={items}
              wear={wear}
              onOpen={setSelectedId}
              onLooks={() => navigate('home', () => setComposing(true))}
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
      <nav className="bottom-nav tab-bar" aria-label="Hauptnavigation">
        <button
          className={view === 'home' ? 'active' : ''}
          aria-current={view === 'home' ? 'page' : undefined}
          aria-label="Home"
          onClick={() => navigate('home')}
        >
          <HomeIcon filled={view === 'home'} />
          <span aria-hidden="true">Home</span>
        </button>
        <button
          className="nav-add"
          aria-label="Hinzufügen"
          aria-haspopup="dialog"
          onClick={() => setAdding(true)}
        >
          <AddIcon />
        </button>
        <button
          className={view !== 'home' ? 'active' : ''}
          aria-current={view === 'wardrobe' ? 'page' : undefined}
          aria-label="Profil"
          onClick={() => navigate('wardrobe')}
        >
          <ProfileIcon filled={view !== 'home'} />
          <span aria-hidden="true">Profil</span>
        </button>
      </nav>
      {composing && items && (
        <Sheet
          title="Anderes Outfit"
          className="compose-sheet"
          onClose={() => setComposing(false)}
        >
          <div id="more-looks">
            <Suspense fallback={<Loading />}>
              <OutfitView
                items={items}
                mode="compose"
                onAdd={() => {
                  setComposing(false)
                  setAdding(true)
                }}
                onToday={() => {
                  setComposing(false)
                  presetView('home.day', null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                notify={notify}
              />
            </Suspense>
          </div>
        </Sheet>
      )}
      {adding && (
        <AddSheet
          onClose={() => setAdding(false)}
          onFiles={(files) => {
            setAdding(false)
            if (files.length > 1) setBatch(files)
            else {
              setIncoming({ files, key: Date.now() })
              setEditor('new')
            }
          }}
          onSearch={
            searchEndpoint()
              ? () => {
                  setAdding(false)
                  setSearching(true)
                }
              : undefined
          }
          onManual={() => {
            setAdding(false)
            setEditor('new')
          }}
        />
      )}
      {naming && (
        <NameSheet
          current={profileName ?? ''}
          avatar={profile?.avatar}
          googlePicture={google?.picture}
          fallback={google?.email?.split('@')[0] ?? 'Profil'}
          onClose={() => setNaming(false)}
          notify={notify}
        />
      )}
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
            notify('Das Stück wurde endgültig gelöscht.')
          }}
          onArchived={(archived) => {
            setSelectedId(null)
            notify(
              archived
                ? 'Aussortiert. Tragetage und Outfits bleiben im Journal; unter Profil → Aussortiert holst du es zurück.'
                : 'Zurück im Kleiderschrank.',
            )
          }}
        />
      )}
      {searching && (
        <Suspense fallback={null}>
          <ProductSearch
            onClose={() => setSearching(false)}
            onEdit={async (id) => {
              const piece = await db.garments.get(id)
              if (!piece) return
              setSearching(false)
              setEditor(piece)
            }}
            onUnclear={(file) => {
              setSearching(false)
              setIncoming({ files: [file], key: Date.now() })
              setEditor('new')
            }}
          />
        </Suspense>
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
                  ? 'Dein neues Stück liegt im Kleiderschrank.'
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
