import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Heart, Trash2 } from 'lucide-react'
import type { Garment } from './model'
import { db, saveOutfit, storageError, updateOutfit } from './db'
import { generateOutfits, missingOutfitMessage } from './generator'
import {
  DEFAULT_PREFERENCES,
  DEFAULT_OUTFIT_OPTIONS,
  OCCASIONS,
  outfitKey,
  type OutfitOptions,
  type SavedOutfit,
} from './outfit-model'
import { ErrorMessage, Sheet } from './ui'
import { recentWear } from './wear-history'
import { localDay, wornCounts } from './calendar'
import { deleteOutfit } from './calendar-db'
import { weatherFresh } from './weather'
import { useClock, weatherForToday } from './useWeather'
import { LookBands } from './LookBands'
import { useViewState } from './view-memory'
import { chooseLookForToday } from './daily-choice'
import { figureOrder } from './swatch'

/** Names a look after its two leading colours, like a plate title. */
function colorTitle(ids: string[], items: Garment[]) {
  const colors = [
    ...new Set(
      figureOrder(ids.flatMap((id) => items.find((i) => i.id === id) ?? []))
        .map((item) => item.color)
        .filter(Boolean),
    ),
  ]
  return colors.length >= 2 ? `${colors[0]} & ${colors[1]}` : 'Neuer Look'
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
  onAdd,
  onToday,
  notify,
}: {
  items: Garment[]
  onAdd: () => void
  onToday: () => void
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
  const now = useClock()
  const today = localDay(new Date(now))
  const weather =
    state?.preferences.useWeather !== false &&
    state?.weather &&
    weatherFresh(state.weather.report, now)
      ? weatherForToday(state.weather, now)
      : undefined
  const [occasion, setOccasion] = useViewState<OutfitOptions['occasion']>(
    'outfits.occasion',
    'Alltag',
  )
  // Each press shows the next candidate of a fresh shuffle.
  const [seed, setSeed] = useViewState<number | null>('outfits.seed', null)
  const [editing, setEditing] = useState<SavedOutfit | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const options: OutfitOptions = {
    ...DEFAULT_OUTFIT_OPTIONS,
    includeAccessory:
      state?.preferences.outfitOptions?.includeAccessory ??
      DEFAULT_OUTFIT_OPTIONS.includeAccessory,
    occasion,
  }
  const candidate = useMemo(
    () =>
      seed !== null && state
        ? generateOutfits(
            items,
            options,
            state.preferences,
            state.feedback,
            seed,
            weather,
            wornCounts(state.calendar, state.outfits),
            recentWear(state.calendar, state.outfits, today),
          )[0]
        : undefined,
    // options is derived from occasion and the saved preferences.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, occasion, seed, state, weather, today],
  )
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
  const pickForToday = (garmentIds: string[], lookOptions: OutfitOptions) =>
    action(async () => {
      await chooseLookForToday({
        garmentIds,
        options: lookOptions,
        versions: items.map((item) => ({
          id: item.id,
          updatedAt: item.updatedAt,
        })),
      })
      notify('Ist jetzt dein Tageslook.')
      onToday()
    })
  const name = (id: string) => items.find((item) => item.id === id)?.name
  const candidateSaved =
    !!candidate &&
    !!state?.outfits.some(
      (outfit) => outfitKey(outfit.garmentIds) === candidate.key,
    )
  return (
    <div className="view outfits-view">
      <header className="page-heading journal-heading">
        <h1>Looks</h1>
        <p className="page-sub">
          {state?.outfits.length ?? 0} gespeichert ·{' '}
          {state?.outfits.filter((outfit) => outfit.favorite).length ?? 0}{' '}
          Favoriten
        </p>
      </header>
      {!state ? (
        <p className="muted">Deine Looks werden geladen …</p>
      ) : (
        <>
          <section
            className="card look-composer"
            aria-label="Neu zusammenstellen"
          >
            <p className="card-kicker">Neu zusammenstellen</p>
            <div className="outfit-tabs" role="group" aria-label="Anlass">
              {OCCASIONS.map((item) => (
                <button
                  key={item}
                  className={occasion === item ? 'active' : ''}
                  aria-pressed={occasion === item}
                  onClick={() => {
                    setOccasion(item)
                    setSeed(null)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
            <button
              className="button primary full"
              disabled={busy}
              onClick={() => {
                setSeed(crypto.getRandomValues(new Uint32Array(1))[0])
                setError('')
              }}
            >
              Aus der Garderobe vorschlagen
            </button>
            {seed !== null && !candidate && (
              <div className="look-result" role="status">
                <p>{missingOutfitMessage(items, options, weather)}</p>
                <button className="button secondary" onClick={onAdd}>
                  Garderobe ergänzen
                </button>
              </div>
            )}
            {candidate && (
              <article className="look-result" aria-label="Vorschlag">
                <LookBands
                  ids={candidate.garmentIds}
                  items={items}
                  height={64}
                />
                <h2>{colorTitle(candidate.garmentIds, items)}</h2>
                <p className="look-pieces">
                  {candidate.garmentIds.map(name).join(' · ')}
                </p>
                <div className="look-result-actions">
                  <button
                    className="button secondary"
                    disabled={busy || candidateSaved}
                    onClick={() =>
                      void action(async () => {
                        await saveOutfit(candidate.garmentIds, options)
                        notify(
                          `„${colorTitle(candidate.garmentIds, items)}“ gespeichert.`,
                        )
                      })
                    }
                  >
                    {candidateSaved ? 'Gespeichert' : 'Speichern'}
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      void pickForToday(candidate.garmentIds, options)
                    }
                  >
                    Für heute
                  </button>
                </div>
              </article>
            )}
          </section>
          <div className="journal-section-heading">
            <h2>Gespeichert</h2>
            <span className="kicker-muted">Zuletzt getragen</span>
          </div>
          {!state.outfits.length && (
            <p className="muted">
              Speichere oben einen Vorschlag. Hier findest du ihn wieder.
            </p>
          )}
          <div className="saved-looks">
            {state.outfits.map((outfit, index) => {
              const worn = state.calendar
                .filter(
                  (entry) =>
                    entry.outfitId === outfit.id &&
                    entry.status === 'worn' &&
                    entry.day <= today,
                )
                .map((entry) => entry.day)
                .sort()
              const last = worn.at(-1)
              return (
                <article
                  className="saved-look"
                  key={outfit.id}
                  aria-label={outfit.name}
                >
                  <LookBands ids={outfit.garmentIds} items={items} />
                  <div className="saved-outfit-heading">
                    <button
                      onClick={() => setEditing(outfit)}
                      aria-label={`${outfit.name} bearbeiten`}
                    >
                      <h3>
                        <small className="look-number" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </small>{' '}
                        {outfit.name}
                      </h3>
                      <span>
                        {outfit.occasion} · {worn.length}× · zuletzt{' '}
                        {last
                          ? new Date(`${last}T12:00:00`).toLocaleDateString(
                              'de-CH',
                              { day: 'numeric', month: 'short' },
                            )
                          : 'noch nie'}
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
                        size={19}
                        fill={outfit.favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() =>
                        void pickForToday(outfit.garmentIds, {
                          ...DEFAULT_OUTFIT_OPTIONS,
                          occasion: outfit.occasion,
                          season: outfit.season,
                          style: outfit.style,
                          includeAccessory: outfit.garmentIds.some(
                            (id) =>
                              items.find((item) => item.id === id)?.category ===
                              'Accessoires',
                          ),
                        })
                      }
                    >
                      Für heute
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
          {editing && (
            <SavedEditor
              outfit={editing}
              onClose={() => setEditing(null)}
              notify={notify}
            />
          )}
        </>
      )}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </div>
  )
}
