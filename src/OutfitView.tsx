import { PackingSheet } from './PackingSheet'
import { ShoppingCard } from './Shopping'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bookmark,
  Check,
  Heart,
  Plus,
  RefreshCw,
  Settings2,
  Luggage,
  ArrowUpRight,
  Trash2,
} from 'lucide-react'
import { COLORS, SEASONS, STYLES, type Garment } from './model'
import {
  db,
  saveOutfit,
  savePreferences,
  styleProfileRevision,
  saveOutfitOptions,
  storageError,
  updateOutfit,
} from './db'
import { generateOutfits, missingOutfitMessage } from './generator'
import { OnlineStylist } from './OnlineStylist'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_OUTFIT_OPTIONS,
  isCompleteOutfit,
  OCCASIONS,
  outfitKey,
  type OutfitOptions,
  type Preferences,
  type SavedOutfit,
} from './outfit-model'
import { ErrorMessage, Sheet } from './ui'
import { WeatherPanel } from './WeatherPanel'
import { recentWear } from './wear-history'
import { localDay, wornCounts } from './calendar'
import { deleteOutfit } from './calendar-db'
import { weatherFresh, type WeatherDay } from './weather'
import { useClock, weatherForToday } from './useWeather'
import { OutfitPieces } from './OutfitPieces'
import { LookBands } from './LookBands'
import { OutfitRating } from './OutfitRating'
import { useViewState } from './view-memory'

function PreferenceEditor({
  current,
  onClose,
  notify,
}: {
  current: Preferences
  onClose: () => void
  notify: (message: string) => void
}) {
  const [snapshot] = useState(() => ({
    styles: [...current.styles],
    colors: [...current.colors],
    revision: styleProfileRevision(current),
  }))
  const [styles, setStyles] = useState(snapshot.styles)
  const [colors, setColors] = useState(snapshot.colors)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <Sheet
      title="Stilvorlieben"
      closeDisabled={busy}
      dirty={
        !busy &&
        (JSON.stringify(styles) !== JSON.stringify(snapshot.styles) ||
          JSON.stringify(colors) !== JSON.stringify(snapshot.colors))
      }
      eyebrow="Vorlieben"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        className="preference-form"
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          try {
            await savePreferences(styles, colors, db, snapshot.revision)
            notify('Deine Stilvorlieben sind gespeichert.')
            onClose()
          } catch (error) {
            setError(storageError(error))
          } finally {
            setBusy(false)
          }
        }}
      >
        <p className="muted">Was magst du besonders?</p>
        <fieldset disabled={busy}>
          <legend>Bevorzugte Stilrichtungen</legend>
          <div className="chips wrap">
            {STYLES.map((style) => (
              <button
                key={style}
                type="button"
                className={`chip ${styles.includes(style) ? 'active' : ''}`}
                aria-pressed={styles.includes(style)}
                onClick={() =>
                  setStyles(
                    styles.includes(style)
                      ? styles.filter((item) => item !== style)
                      : [...styles, style],
                  )
                }
              >
                {style}
              </button>
            ))}
          </div>
          <p className="preference-label">Lieblingsfarben</p>
          <div className="color-options">
            {COLORS.map((color) => (
              <button
                type="button"
                key={color.name}
                className={`color-option ${colors.includes(color.name) ? 'selected' : ''}`}
                aria-label={color.name}
                aria-pressed={colors.includes(color.name)}
                onClick={() =>
                  setColors(
                    colors.includes(color.name)
                      ? colors.filter((item) => item !== color.name)
                      : [...colors, color.name],
                  )
                }
              >
                <span style={{ background: color.hex }} />
                <span>{color.name}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button className="button primary full" disabled={busy}>
          {busy ? 'Wird gespeichert …' : 'Vorlieben speichern'}
        </button>
      </form>
    </Sheet>
  )
}

function SavedEditor({
  outfit,
  onClose,
  notify,
}: {
  outfit: SavedOutfit
  onClose: () => void
  notify: (message: string) => void
}) {
  const [name, setName] = useState(outfit.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  return (
    <Sheet
      title="Look bearbeiten"
      closeDisabled={busy}
      dirty={!busy && name !== outfit.name}
      eyebrow="Gespeichert"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError('')
          try {
            await updateOutfit(outfit.id, {
              name,
              expectedUpdatedAt: outfit.updatedAt,
            })
            notify('Der Outfit-Name wurde gespeichert.')
            onClose()
          } catch (error) {
            setError(storageError(error))
          } finally {
            setBusy(false)
          }
        }}
      >
        <label className="field">
          Outfit-Name
          <input
            required
            maxLength={100}
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button
          className="button primary full outfit-save-name"
          disabled={busy || !name.trim()}
        >
          Name speichern
        </button>
      </form>
      {confirm ? (
        <div className="delete-confirm" role="alert">
          <p>
            Dieses Outfit und seine Kalendereinträge löschen? Deine
            Kleidungsstücke und dein Feedback bleiben erhalten.
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
                  await deleteOutfit(outfit.id)
                  notify('Das Outfit wurde gelöscht.')
                  onClose()
                } catch (error) {
                  setError(storageError(error))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Outfit endgültig löschen
            </button>
          </div>
        </div>
      ) : (
        <button
          className="text-button outfit-delete"
          onClick={() => setConfirm(true)}
        >
          <Trash2 size={16} />
          Outfit löschen
        </button>
      )}
    </Sheet>
  )
}

export function OutfitView({
  items,
  onOpen,
  onAdd,
  notify,
}: {
  items: Garment[]
  onOpen: (id: string) => void
  onAdd: () => void
  notify: (message: string) => void
}) {
  const state = useLiveQuery(
    () =>
      db.transaction(
        'r',
        db.outfits,
        db.preferences,
        db.feedback,
        db.calendar,
        db.weather,
        async () => ({
          outfits: (await db.outfits.toArray()).sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) ||
              a.id.localeCompare(b.id),
          ),
          feedback: await db.feedback.toArray(),
          preferences:
            (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
          calendar: await db.calendar.toArray(),
          weather: await db.weather.get('local'),
        }),
      ),
    [],
    null,
  )
  const [tab, setTab] = useViewState<'discover' | 'saved'>(
    'outfits.tab',
    'discover',
  )
  const [weatherDay, setWeatherDay] = useState<WeatherDay>()
  const [options, setOptions] = useState(DEFAULT_OUTFIT_OPTIONS)
  const pendingOptions = useRef<Partial<OutfitOptions>>({})
  useEffect(() => {
    if (state)
      setOptions({
        ...(state.preferences.outfitOptions ?? DEFAULT_OUTFIT_OPTIONS),
        ...pendingOptions.current,
      })
  }, [state?.preferences.outfitOptions])
  const now = useClock()
  const todayWeather = weatherForToday(state?.weather, now)
  const weatherContext =
    state?.preferences.useWeather !== false &&
    state?.weather &&
    weatherFresh(state.weather.report, now)
      ? (state.weather.report.days.find(
          (item) => item.day === weatherDay?.day,
        ) ?? todayWeather)
      : undefined
  const historyDay = weatherContext?.day ?? localDay(new Date(now))
  const [seed, setSeed] = useViewState('outfits.seed', 0)
  const [requested, setRequested] = useViewState('outfits.requested', false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [packingOpen, setPackingOpen] = useState(false)
  const [editing, setEditing] = useState<SavedOutfit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useViewState(
    'outfits.favorites',
    false,
  )
  const [confirmReset, setConfirmReset] = useState(false)
  const candidates = useMemo(
    () =>
      requested && state
        ? generateOutfits(
            items,
            options,
            state.preferences,
            state.feedback,
            seed,
            weatherContext,
            wornCounts(state.calendar, state.outfits),
            recentWear(state.calendar, state.outfits, historyDay),
          )
        : [],
    [items, options, requested, state, seed, weatherContext, historyDay],
  )
  const rejectedCount =
    state?.feedback.filter((item) => item.verdict === 'rejected').length ?? 0
  async function action(callback: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await callback()
    } catch (error) {
      setError(storageError(error))
    } finally {
      setBusy(false)
    }
  }
  function changeOption<K extends keyof OutfitOptions>(
    key: K,
    value: OutfitOptions[K],
  ) {
    pendingOptions.current = { ...pendingOptions.current, [key]: value }
    setOptions((previous) => ({ ...previous, [key]: value }))
    void action(async () => {
      try {
        await saveOutfitOptions({ [key]: value })
      } catch (error) {
        setOptions((previous) => ({ ...previous, [key]: options[key] }))
        throw error
      } finally {
        if (pendingOptions.current[key] === value)
          delete pendingOptions.current[key]
      }
    })
    setRequested(false)
    setError('')
  }
  return (
    <div className="view outfits-view">
      <header className="page-heading">
        <div className="heading-row">
          <h1>Looks</h1>
          <div className="heading-actions">
            <button
              className="icon-button soft"
              aria-label="Packliste für eine Reise"
              onClick={() => setPackingOpen(true)}
            >
              <Luggage size={20} />
            </button>
            <button
              className="icon-button soft"
              aria-label="Stilvorlieben bearbeiten"
              onClick={() => setPreferencesOpen(true)}
            >
              <Settings2 size={21} />
            </button>
          </div>
        </div>
        <p className="page-sub">
          {state?.outfits.length ?? 0} gespeichert ·{' '}
          {state?.outfits.filter((outfit) => outfit.favorite).length ?? 0}{' '}
          Favoriten
        </p>
      </header>
      <div className="outfit-tabs" role="group" aria-label="Outfit-Ansicht">
        <button
          className={tab === 'discover' ? 'active' : ''}
          aria-pressed={tab === 'discover'}
          onClick={() => setTab('discover')}
        >
          <ArrowUpRight size={16} />
          Entdecken
        </button>
        <button
          className={tab === 'saved' ? 'active' : ''}
          aria-pressed={tab === 'saved'}
          onClick={() => setTab('saved')}
        >
          <Bookmark size={16} />
          Gespeichert ({state?.outfits.length ?? 0})
        </button>
      </div>
      {!state ? (
        <p className="muted">Deine Outfits werden geladen …</p>
      ) : (
        <>
          {tab === 'discover' ? (
            <>
              <WeatherPanel onContext={setWeatherDay} notify={notify} />
              <section
                className="outfit-options"
                aria-label="Dein Anlass und Stil"
              >
                <div className="field-row">
                  <label className="field">
                    Anlass
                    <select
                      value={options.occasion}
                      onChange={(event) =>
                        changeOption(
                          'occasion',
                          event.target.value as OutfitOptions['occasion'],
                        )
                      }
                    >
                      {OCCASIONS.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Saison
                    <select
                      value={options.season}
                      onChange={(event) =>
                        changeOption(
                          'season',
                          event.target.value as OutfitOptions['season'],
                        )
                      }
                    >
                      {['Alle', ...SEASONS].map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="field">
                  Gewünschter Stil
                  <select
                    value={options.style}
                    onChange={(event) =>
                      changeOption(
                        'style',
                        event.target.value as OutfitOptions['style'],
                      )
                    }
                  >
                    {['Alle', ...STYLES].map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="accessory-option">
                  <input
                    type="checkbox"
                    checked={options.includeAccessory}
                    onChange={(event) =>
                      changeOption('includeAccessory', event.target.checked)
                    }
                  />
                  Ein Accessoire ergänzen, wenn eines passt
                </label>
                <button
                  className="button primary full"
                  disabled={busy}
                  onClick={() => {
                    setRequested(true)
                    setSeed(crypto.getRandomValues(new Uint32Array(1))[0])
                    setError('')
                  }}
                >
                  {requested ? (
                    <RefreshCw size={17} />
                  ) : (
                    <ArrowUpRight size={17} />
                  )}
                  {requested ? 'Neu kombinieren' : 'Outfits zusammenstellen'}
                </button>
              </section>
              {requested && !candidates.length && (
                <div className="outfit-empty" role="status">
                  <ShirtNotice />
                  <h2>Noch kein kompletter Look</h2>
                  <p>{missingOutfitMessage(items, options, weatherContext)}</p>
                  <button className="button secondary" onClick={onAdd}>
                    <Plus size={17} />
                    Kleiderschrank ergänzen
                  </button>
                </div>
              )}
              {!requested && (
                <p className="outfit-start-note">
                  Für einen Look brauchst du Schuhe und entweder ein Kleid oder
                  ein Oberteil mit Hose.
                </p>
              )}
              {!!candidates.length && (
                <OnlineStylist
                  input={{
                    items,
                    candidates,
                    options,
                    preferences: state.preferences,
                    feedback: state.feedback,
                    weather: weatherContext,
                  }}
                  onOpen={onOpen}
                  applyLabel="Empfohlenen Look speichern"
                  onApply={async (candidate) => {
                    await saveOutfit(candidate.garmentIds, options)
                    notify('Die KI-Empfehlung ist als Outfit gespeichert.')
                  }}
                />
              )}
              <div className="outfit-results">
                {candidates.map((candidate, index) => {
                  const saved = state.outfits.some(
                    (outfit) => outfitKey(outfit.garmentIds) === candidate.key,
                  )
                  return (
                    <article
                      key={candidate.key}
                      className="outfit-card"
                      aria-label={`Outfit-Vorschlag ${index + 1}`}
                    >
                      <LookBands
                        ids={candidate.garmentIds}
                        items={items}
                        height={64}
                      />
                      <div className="outfit-card-heading">
                        <p className="eyebrow">Look {index + 1}</p>
                        <span>{options.occasion}</span>
                      </div>
                      <OutfitPieces
                        ids={candidate.garmentIds}
                        items={items}
                        onOpen={onOpen}
                      />
                      <details className="outfit-reasons">
                        <summary>Warum diese Kombination?</summary>
                        <ul>
                          {candidate.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </details>
                      <div className="outfit-card-actions">
                        <button
                          className="button secondary"
                          disabled={busy || saved}
                          onClick={() =>
                            void action(async () => {
                              await saveOutfit(candidate.garmentIds, options)
                              notify('Das Outfit ist gespeichert.')
                            })
                          }
                        >
                          {saved ? <Check size={16} /> : <Bookmark size={16} />}
                          {saved ? 'Gespeichert' : 'Speichern'}
                        </button>
                        <OutfitRating
                          ids={candidate.garmentIds}
                          occasion={options.occasion}
                          label={`Vorschlag ${index + 1}`}
                          disabled={busy}
                          notify={notify}
                          rating={state.feedback.find(
                            (item) => item.id === candidate.key,
                          )}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
              {rejectedCount > 0 && (
                <div className="reset-feedback">
                  <p>
                    {rejectedCount} abgelehnte{' '}
                    {rejectedCount === 1 ? 'Kombination' : 'Kombinationen'}{' '}
                    gemerkt.
                  </p>
                  {confirmReset ? (
                    <>
                      <p>
                        Ablehnungen wirklich zurücksetzen? Gefallene und
                        gespeicherte Outfits bleiben erhalten.
                      </p>
                      <div className="photo-actions">
                        <button
                          className="button secondary"
                          onClick={() => setConfirmReset(false)}
                        >
                          Abbrechen
                        </button>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              await db.feedback
                                .filter((item) => item.verdict === 'rejected')
                                .delete()
                              setConfirmReset(false)
                              notify('Die Ablehnungen wurden zurückgesetzt.')
                            })
                          }
                        >
                          Ja, zurücksetzen
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      className="text-button"
                      onClick={() => setConfirmReset(true)}
                    >
                      Ablehnungen zurücksetzen
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="collection-toolbar">
                <span>{state.outfits.length} gespeicherte Looks</span>
                <button
                  className="text-button"
                  aria-pressed={onlyFavorites}
                  onClick={() => setOnlyFavorites(!onlyFavorites)}
                >
                  <Heart
                    size={16}
                    fill={onlyFavorites ? 'currentColor' : 'none'}
                  />
                  Nur Favoriten
                </button>
              </div>
              {!state.outfits.filter(
                (outfit) => !onlyFavorites || outfit.favorite,
              ).length && (
                <div className="outfit-empty">
                  <Bookmark size={30} strokeWidth={1.2} />
                  <h2>
                    {onlyFavorites
                      ? 'Noch keine Favoriten'
                      : 'Noch keine Looks gespeichert'}
                  </h2>
                  <p>
                    {onlyFavorites
                      ? 'Markiere gespeicherte Looks mit einem Herz.'
                      : 'Speichere eine Kombination unter Entdecken. Hier findest du sie später wieder.'}
                  </p>
                  <button
                    className="button secondary"
                    onClick={() =>
                      onlyFavorites
                        ? setOnlyFavorites(false)
                        : setTab('discover')
                    }
                  >
                    {onlyFavorites ? 'Alle Looks anzeigen' : 'Looks entdecken'}
                  </button>
                </div>
              )}
              {state.outfits
                .filter((outfit) => !onlyFavorites || outfit.favorite)
                .map((outfit, index) => (
                  <article className="outfit-card" key={outfit.id}>
                    <LookBands ids={outfit.garmentIds} items={items} />
                    <div className="saved-outfit-heading">
                      <button
                        onClick={() => setEditing(outfit)}
                        aria-label={`${outfit.name} bearbeiten`}
                      >
                        <h2>
                          <small className="look-number" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                          </small>{' '}
                          {outfit.name}
                        </h2>
                        <span>
                          {outfit.occasion}
                          {outfit.season !== 'Alle'
                            ? ` · ${outfit.season}`
                            : ''}
                        </span>
                      </button>
                      <button
                        data-motion="heart"
                        className={`icon-button ${outfit.favorite ? 'is-favorite' : ''}`}
                        aria-label={`${outfit.name}: Outfit-Favorit`}
                        aria-pressed={outfit.favorite}
                        disabled={busy}
                        onClick={() =>
                          void action(async () => {
                            await db.transaction('rw', db.outfits, async () => {
                              const current = await db.outfits.get(outfit.id)
                              if (current)
                                await updateOutfit(outfit.id, {
                                  favorite: !current.favorite,
                                })
                            })
                          })
                        }
                      >
                        <Heart
                          size={20}
                          fill={outfit.favorite ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                    <OutfitPieces
                      ids={outfit.garmentIds}
                      items={items}
                      onOpen={onOpen}
                    />
                    <OutfitRating
                      ids={outfit.garmentIds}
                      occasion={outfit.occasion}
                      label={outfit.name}
                      disabled={busy}
                      notify={notify}
                      rating={state.feedback.find(
                        (item) => item.id === outfitKey(outfit.garmentIds),
                      )}
                    />
                    {!isCompleteOutfit(
                      outfit.garmentIds.flatMap((id) =>
                        items.filter((item) => item.id === id),
                      ),
                    ) && (
                      <p className="generator-disclosure">
                        Die Kategorien deiner Stücke haben sich geändert. Bitte
                        prüfe diesen gespeicherten Look.
                      </p>
                    )}
                    <button
                      className="text-button"
                      onClick={() => setEditing(outfit)}
                    >
                      Name ändern oder Outfit löschen
                    </button>
                  </article>
                ))}
            </>
          )}
          {packingOpen && (
            <PackingSheet items={items} onClose={() => setPackingOpen(false)} />
          )}
          {preferencesOpen && (
            <PreferenceEditor
              current={state.preferences}
              onClose={() => setPreferencesOpen(false)}
              notify={notify}
            />
          )}
          {editing && (
            <SavedEditor
              outfit={editing}
              onClose={() => setEditing(null)}
              notify={notify}
            />
          )}
        </>
      )}
      {tab === 'discover' && <ShoppingCard hideLocked />}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  )
}

function ShirtNotice() {
  return <ArrowUpRight size={30} strokeWidth={1.2} />
}
