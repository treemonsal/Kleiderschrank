import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  House,
  LoaderCircle,
  Layers2,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react'
import { db, deleteGarment, storageError, toggleFavorite } from './db'
import { OutfitView } from './OutfitView'
import { CATEGORIES, filterGarments, type Garment } from './model'
import { Editor } from './Editor'
import { BackupView } from './BackupView'
import { DailyOutfit } from './DailyOutfit'
import { localDay, shiftDay } from './calendar'
import { useClock, useSavedWeatherRefresh } from './useWeather'
import { useDaySwipe } from './useDaySwipe'
import { ErrorMessage, GarmentCard, GarmentPicture, Sheet } from './ui'

type View = 'home' | 'wardrobe' | 'outfits' | 'settings'

function Home({
  items,
  onAdd,
  onWardrobe,
  onOpen,
  onFavorite,
  onOutfits,
  notify,
}: {
  items: Garment[]
  onAdd: () => void
  onWardrobe: () => void
  onOpen: (id: string) => void
  onFavorite: (item: Garment) => void
  onOutfits: () => void
  notify: (message: string) => void
}) {
  const today = localDay(new Date(useClock()))
  const [chosenDay, setChosenDay] = useState<string | null>(null)
  const day = chosenDay ?? today
  const selectDay = (next: string) => setChosenDay(next === today ? null : next)
  const swipe = useDaySwipe((offset) => {
    const next = shiftDay(day, offset)
    if (next) selectDay(next)
  })
  const favorites = items.filter((i) => i.favorite)
  const featured = (
    favorites.length
      ? favorites
      : [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  ).slice(0, 4)
  return (
    <div className="view home-view" {...swipe}>
      <DailyOutfit
        day={day}
        onSelectDay={selectDay}
        items={items}
        onOpen={onOpen}
        onOutfits={onOutfits}
        notify={notify}
      />
      <section className="wardrobe-summary">
        <div>
          <p className="eyebrow">DEINE KLEINE KOLLEKTION</p>
          <h2>
            {items.length} {items.length === 1 ? 'Stück' : 'Stücke'}
            <span className="summary-dot">·</span>
            <Heart size={15} />
            {favorites.length}
          </h2>
        </div>
        <button
          className="round-button"
          aria-label="Kleiderschrank ansehen"
          onClick={onWardrobe}
        >
          <ArrowUpRight size={22} strokeWidth={1.5} />
        </button>
      </section>
      <section className="home-collection">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GANZ DEIN GESCHMACK</p>
            <h2>
              {favorites.length
                ? 'Deine Lieblingsstücke'
                : items.length
                  ? 'Frisch im Kleiderschrank'
                  : 'Hier beginnt dein Stil'}
            </h2>
          </div>
          {items.length > 0 && (
            <button className="text-button" onClick={onWardrobe}>
              Alle <ArrowRight size={16} />
            </button>
          )}
        </div>
        {featured.length ? (
          <div className="garment-grid">
            {featured.map((item) => (
              <GarmentCard
                key={item.id}
                item={item}
                onOpen={() => onOpen(item.id)}
                onFavorite={() => onFavorite(item)}
              />
            ))}
          </div>
        ) : (
          <div className="first-piece-card">
            <div className="empty-icon">
              <Shirt size={32} strokeWidth={1.2} />
              <span>01</span>
            </div>
            <h3>Dein erstes Lieblingsstück.</h3>
            <p>
              Ein Foto — und dein
              <br />
              Kleiderschrank bekommt ein neues Zuhause.
            </p>
            <button className="button primary" onClick={onAdd}>
              <Plus size={18} />
              Erstes Stück hinzufügen
            </button>
            <span className="micro-copy">
              <LockKeyhole size={12} /> Dein Kleiderschrank bleibt bei dir.
            </span>
          </div>
        )}
      </section>
      {items.length > 0 && (
        <button className="add-banner" onClick={onAdd}>
          <span className="add-banner-icon">
            <Plus size={22} strokeWidth={1.5} />
          </span>
          <span>
            <strong>Platz für ein neues Lieblingsstück.</strong>
            <small>Ergänze deine persönliche Kollektion.</small>
          </span>
          <ArrowRight size={19} />
        </button>
      )}
      <div className="editorial-note">
        <Sparkles size={16} strokeWidth={1.2} />
        <p>Guter Stil beginnt mit dem, was du hast.</p>
      </div>
    </div>
  )
}

function Wardrobe({
  items,
  onAdd,
  onOpen,
  onFavorite,
}: {
  items: Garment[]
  onAdd: () => void
  onOpen: (id: string) => void
  onFavorite: (item: Garment) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Alle')
  const [favorites, setFavorites] = useState(false)
  const [sort, setSort] = useState('newest')
  const [showSort, setShowSort] = useState(false)
  const filtered = filterGarments(items, query, category, favorites).sort(
    (a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'de')
        : sort === 'oldest'
          ? a.createdAt.localeCompare(b.createdAt)
          : b.createdAt.localeCompare(a.createdAt),
  )
  const hasFilters = !!query || category !== 'Alle' || favorites
  return (
    <div className="view wardrobe-view">
      <header className="page-heading">
        <p className="eyebrow">ALLES, WAS DICH AUSMACHT</p>
        <div className="heading-row">
          <h1>Dein Kleiderschrank.</h1>
          <button
            className="icon-button primary-add"
            aria-label="Stück hinzufügen"
            onClick={onAdd}
          >
            <Plus size={23} />
          </button>
        </div>
        <p>
          {items.length
            ? `${items.length} ${items.length === 1 ? 'Stück' : 'Stücke'}. Unendlich viele Möglichkeiten.`
            : 'Eine Kollektion, die ganz dir gehört.'}
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
          aria-label="Nur Favoriten"
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Heart size={20} fill={favorites ? 'currentColor' : 'none'} />
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
          <h2>
            {hasFilters ? 'Noch kein Treffer.' : 'Platz für deinen Stil.'}
          </h2>
          <p>
            {hasFilters
              ? 'Versuche einen anderen Suchbegriff oder passe deine Filter an.'
              : 'Dein Kleiderschrank ist noch leer. Füge dein erstes Stück hinzu und mach ihn zu deinem.'}
          </p>
          <button
            className="button primary"
            onClick={
              hasFilters
                ? () => {
                    setQuery('')
                    setCategory('Alle')
                    setFavorites(false)
                  }
                : onAdd
            }
          >
            {hasFilters ? (
              'Filter zurücksetzen'
            ) : (
              <>
                <Plus size={18} />
                Stück hinzufügen
              </>
            )}
          </button>
        </div>
      )}
      {filtered.length > 0 && (
        <p className="collection-footnote">Mit Sorgfalt gesammelt. Von dir.</p>
      )}
    </div>
  )
}

function Detail({
  item,
  onClose,
  onEdit,
  onFavorite,
  onDeleted,
}: {
  item: Garment
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
      eyebrow={item.category.toLocaleUpperCase('de')}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <div className="detail-body">
        <GarmentPicture item={item} large />
        <div className="detail-title">
          <div>
            <p className="eyebrow">DEIN PERSÖNLICHES STÜCK</p>
            <h3>{item.brand || 'Ein Stück von dir'}</h3>
          </div>
          <button
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
        </dl>
        {item.notes && (
          <div className="detail-notes">
            <h4>Deine Notizen</h4>
            <p>{item.notes}</p>
          </div>
        )}
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
  const items = useLiveQuery(
    () => db.garments.orderBy('updatedAt').reverse().toArray(),
    [],
    null,
  )
  const [view, setView] = useState<View>('home')
  const [editor, setEditor] = useState<Garment | 'new' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [updateError, setUpdateError] = useState('')
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
  const notify = useCallback((message: string) => setToast(message), [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    document.documentElement.dataset.theme = 'dark'
    try {
      localStorage.setItem('mystyle-theme', 'dark')
    } catch {
      /* Styling still works when storage is blocked. */
    }
  }, [])
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
  function navigate(next: View) {
    setView(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  async function favorite(item: Garment) {
    try {
      await toggleFavorite(item)
    } catch (err) {
      notify(storageError(err))
    }
  }
  const selected = items?.find((i) => i.id === selectedId)
  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="wordmark"
          aria-label="MyStyle Startseite"
          onClick={() => navigate('home')}
        >
          my<span>style</span>
          <span className="wordmark-dot">.</span>
        </button>
        <div className="header-right">
          <span className="edition">YOUR EVERYDAY EDIT</span>
          <button
            className="profile-button"
            aria-label="Einstellungen öffnen"
            onClick={() => navigate('settings')}
          >
            m<span className="profile-dot" />
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
      {needRefresh && !editor && (
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
      <main id="main-content" key={view}>
        {items === null || items === undefined ? (
          <div className="loading-state" role="status">
            <LoaderCircle className="spin" />
            <p>Dein Kleiderschrank wird geöffnet …</p>
          </div>
        ) : view === 'home' ? (
          <Home
            items={items}
            onAdd={() => setEditor('new')}
            onWardrobe={() => navigate('wardrobe')}
            onOpen={setSelectedId}
            onFavorite={(item) => void favorite(item)}
            onOutfits={() => navigate('outfits')}
            notify={notify}
          />
        ) : view === 'wardrobe' ? (
          <Wardrobe
            items={items}
            onAdd={() => setEditor('new')}
            onOpen={setSelectedId}
            onFavorite={(item) => void favorite(item)}
          />
        ) : view === 'outfits' ? (
          <OutfitView
            items={items}
            onOpen={setSelectedId}
            onAdd={() => setEditor('new')}
            notify={notify}
          />
        ) : (
          <BackupView items={items} notify={notify} />
        )}
      </main>
      <nav className="bottom-nav" aria-label="Hauptnavigation">
        <span
          className="glass-selection"
          aria-hidden="true"
          style={{
            transform: `translateX(${{ home: 0, wardrobe: 1, outfits: 2, settings: 3 }[view] * 100}%)`,
          }}
        />
        {(
          [
            { key: 'home', label: 'Heute', Icon: House },
            { key: 'wardrobe', label: 'Kleiderschrank', Icon: Shirt },
            { key: 'outfits', label: 'Outfits', Icon: Layers2 },
            { key: 'settings', label: 'Mehr', Icon: MoreHorizontal },
          ] as const
        ).map(({ key, label, Icon }) => (
          <button
            key={key}
            className={view === key ? 'active' : ''}
            aria-current={view === key ? 'page' : undefined}
            onClick={() => navigate(key)}
          >
            <span className="nav-icon">
              <Icon size={23} strokeWidth={view === key ? 1.9 : 1.5} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {selected && !editor && (
        <Detail
          key={selected.id}
          item={selected}
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
      )}
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className="toast">
            <Check size={18} />
            <span>{toast}</span>
            <button
              aria-label="Hinweis schliessen"
              onClick={() => setToast('')}
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
