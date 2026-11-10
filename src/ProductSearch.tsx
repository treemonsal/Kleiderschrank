import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Check, LoaderCircle, Plus, Search } from 'lucide-react'
import { analyzePhoto, readAIConnection } from './cloud-ai'
import { attachCutout, db, saveGarment, storageError } from './db'
import { preparePhoto } from './photos'
import { readPhotoPixels } from './photo-color'
import {
  POPULAR_SEARCHES,
  SearchError,
  cleanTitle,
  colorFromText,
  cutoutColor,
  dominantColor,
  fetchProductImage,
  guessBrand,
  guessCategory,
  searchProducts,
  type ProductResult,
} from './product-search'
import { ErrorMessage, Sheet } from './ui'

/** 'cutting': already in the wardrobe, the free AI is cutting it out. */
type Status = 'adding' | 'cutting' | 'added' | 'kept'

/** Search the web for a piece and put it into the wardrobe with one tap. */
export function ProductSearch({
  onClose,
  onUnclear,
}: {
  onClose: () => void
  /** No category could be read from the title: the editor takes over. */
  onUnclear: (file: File, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState('')
  const [results, setResults] = useState<ProductResult[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<Record<string, Status>>({})
  const work = useRef(new AbortController())
  useEffect(() => {
    const controller = work.current
    return () => controller.abort()
  }, [])

  async function run(text: string) {
    const value = text.trim()
    if (value.length < 2) return
    setQuery(value)
    setLoading(true)
    setError('')
    try {
      setResults(await searchProducts(value, work.current.signal))
      setSearched(value)
    } catch (caught) {
      if (work.current.signal.aborted) return
      setError(
        caught instanceof SearchError
          ? caught.message
          : 'Die Suche hat nicht geklappt. Versuche es nochmals.',
      )
    } finally {
      if (!work.current.signal.aborted) setLoading(false)
    }
  }

  async function add(result: ProductResult) {
    setStatus((current) => ({ ...current, [result.image]: 'adding' }))
    setError('')
    const signal = work.current.signal
    try {
      const blob = await fetchProductImage(result.image, signal).catch(() =>
        fetchProductImage(result.thumbnail, signal),
      )
      const name = cleanTitle(result.title, searched)
      const file = new File([blob], 'produkt', { type: blob.type })
      const category = guessCategory(result.title, searched)
      if (!category) {
        onUnclear(file, name)
        return
      }
      const photo = await preparePhoto(file)
      // Words beat pixels: "Schwarze Hose" is black even if the photo shows
      // a model in front of a brown wall.
      const named = colorFromText(result.title) || colorFromText(searched)
      const color = named || dominantColor(await readPhotoPixels(photo))
      const id = await saveGarment({
        name,
        category,
        color,
        brand: guessBrand(result.title),
        seasons: [],
        styles: [],
        notes: '',
        favorite: false,
        photo,
      })
      const connection = readAIConnection()
      if (connection?.enabled && !signal.aborted) {
        // Like a photo of your own: with the free AI on, the piece is cut
        // out right away. The original stays if this fails or the piece
        // was edited meanwhile.
        setStatus((current) => ({ ...current, [result.image]: 'cutting' }))
        let cut = false
        try {
          const saved = await db.garments.get(id)
          const { cutout } = await analyzePhoto(
            photo,
            connection,
            signal,
            'cutout',
          )
          if (saved && cutout) {
            // Without a named colour the cut-out decides: only the piece
            // itself votes, not its background.
            const better = named
              ? ''
              : cutoutColor(await readPhotoPixels(cutout).catch(() => null))
            cut = await attachCutout(id, saved.updatedAt, cutout, db, {
              color: better || undefined,
            })
          }
        } catch {
          // Keeps the shop photo; the note below says so.
        }
        if (!signal.aborted)
          setStatus((current) => ({
            ...current,
            [result.image]: cut ? 'added' : 'kept',
          }))
        return
      }
      if (!signal.aborted)
        setStatus((current) => ({ ...current, [result.image]: 'added' }))
    } catch (caught) {
      if (signal.aborted) return
      setStatus(({ [result.image]: _dropped, ...rest }) => rest)
      setError(
        caught instanceof SearchError ? caught.message : storageError(caught),
      )
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(query)
  }

  return (
    <Sheet
      title="Kleidung suchen"
      eyebrow="Garderobe"
      className="product-search"
      onClose={onClose}
    >
      <form className="product-search-form" role="search" onSubmit={submit}>
        <input
          type="search"
          enterKeyHint="search"
          aria-label="Kleidung suchen"
          placeholder="z. B. Levi's 501 schwarz"
          value={query}
          maxLength={80}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="icon-button"
          aria-label="Suchen"
          disabled={loading || query.trim().length < 2}
        >
          {loading ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <Search size={18} />
          )}
        </button>
      </form>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {!results && !loading && (
        <section aria-label="Beliebt">
          <h3 className="product-search-heading">Beliebt</h3>
          <div className="text-tabs product-popular">
            {POPULAR_SEARCHES.map((term) => (
              <button key={term} onClick={() => void run(term)}>
                {term}
              </button>
            ))}
          </div>
        </section>
      )}
      {results && !results.length && !loading && (
        <p className="muted">Nichts gefunden. Versuche andere Wörter.</p>
      )}
      {!!results?.length && (
        <ul className="product-results" aria-label="Suchergebnisse">
          {results.map((result) => {
            const name = cleanTitle(result.title, searched)
            const state = status[result.image]
            const inside =
              state === 'added' || state === 'kept' || state === 'cutting'
            return (
              <li key={result.image}>
                <img
                  src={result.thumbnail}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <span className="product-name">{name}</span>
                <span className="product-source">{result.source}</span>
                <button
                  className={`button ${inside ? 'secondary' : 'primary'}`}
                  aria-label={
                    inside
                      ? `${name} liegt im Kleiderschrank`
                      : `${name} in den Kleiderschrank`
                  }
                  disabled={!!state}
                  onClick={() => void add(result)}
                >
                  {state === 'adding' || state === 'cutting' ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : inside ? (
                    <Check size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {state === 'cutting'
                    ? 'Freistellen'
                    : inside
                      ? 'Drin'
                      : 'Hinzufügen'}
                </button>
                {state === 'kept' && (
                  <span className="product-source" role="status">
                    Freistellen hat nicht geklappt, das Shopfoto bleibt.
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <p className="micro-copy product-search-note">
        Suche über Google (SerpApi). Bilder nur für deinen privaten
        Kleiderschrank.
      </p>
    </Sheet>
  )
}
