import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Heart, X } from 'lucide-react'
import type { Garment } from './model'
import { GarmentSketch } from './GarmentSketch'
import { swatch } from './swatch'

function usePhotoUrl(photo?: Blob) {
  const [url, setUrl] = useState<string>()
  const [attempt, setAttempt] = useState(0)
  const image = useRef<HTMLImageElement>(null)
  const resources = useRef(new Set<string>())
  const pending = useRef<string | undefined>(undefined)
  useEffect(() => {
    const next = photo ? URL.createObjectURL(photo) : undefined
    if (next) resources.current.add(next)
    pending.current = next
    setUrl(next)
  }, [photo, attempt])
  function releaseUnused() {
    // src may already point to the replacement while currentSrc is still the
    // previous decoded/lazy image (notably in WebKit). Keep both leases until
    // the browser confirms the new source with a load event.
    for (const resource of resources.current) {
      if (
        resource !== url &&
        resource !== pending.current &&
        resource !== image.current?.currentSrc &&
        resource !== image.current?.getAttribute('src')
      ) {
        URL.revokeObjectURL(resource)
        resources.current.delete(resource)
      }
    }
  }
  useEffect(releaseUnused, [url, photo])
  useEffect(() => {
    const owned = resources.current
    return () => {
      for (const resource of owned) URL.revokeObjectURL(resource)
      owned.clear()
      pending.current = undefined
    }
  }, [])
  return {
    url: photo ? url : undefined,
    image,
    releaseUnused,
    retry: () => setAttempt((value) => value + 1),
  }
}

/** Every photo surface uses the same browser-aware URL lifetime and recovery. */
export function PhotoImage({
  photo,
  fallbackPhoto,
  alt,
  className,
  loading = 'eager',
  fallback,
}: {
  photo: Blob
  fallbackPhoto?: Blob
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
  fallback?: ReactNode
}) {
  const [broken, setBroken] = useState<Blob>()
  const source =
    broken === photo && fallbackPhoto && fallbackPhoto !== photo
      ? fallbackPhoto
      : photo
  const [failed, setFailed] = useState<Blob>()
  const retried = useRef<Blob | undefined>(undefined)
  const { url, image, releaseUnused, retry } = usePhotoUrl(source)
  if (failed === source)
    return (
      <>
        {fallback ?? (
          <span
            className="photo-unavailable"
            role="img"
            aria-label={`${alt}: Foto nicht verfügbar`}
          >
            Foto gerade nicht verfügbar. Öffne das Stück erneut.
          </span>
        )}
      </>
    )
  return url ? (
    <img
      ref={image}
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      onLoad={releaseUnused}
      onError={() => {
        if (retried.current !== source) {
          retried.current = source
          retry()
        } else if (source === photo && fallbackPhoto && fallbackPhoto !== photo)
          setBroken(photo)
        else setFailed(source)
      }}
    />
  ) : null
}

export function GarmentPicture({
  item,
  large = false,
}: {
  item: Pick<Garment, 'photo' | 'cutout' | 'name' | 'category'> &
    Partial<Pick<Garment, 'color'>>
  large?: boolean
}) {
  const photo = item.cutout ?? item.photo
  // Without a photo the piece reads as a cloth swatch in its recorded colour.
  const placeholder = (
    <div
      className="photo-placeholder is-swatch"
      data-color={item.color || undefined}
      style={{ background: swatch(item) }}
    >
      <GarmentSketch category={item.category} />
      <span className="placeholder-category">{item.category}</span>
    </div>
  )
  return (
    <div className={`garment-picture ${large ? 'large' : ''}`}>
      {photo ? (
        <PhotoImage
          photo={photo}
          fallbackPhoto={item.photo}
          alt={item.name}
          loading={large ? 'eager' : 'lazy'}
          fallback={
            <div className="photo-placeholder">
              <GarmentSketch category={item.category} color={item.color} />
              <span>Foto nicht verfügbar</span>
            </div>
          }
        />
      ) : (
        placeholder
      )}
    </div>
  )
}

export function GarmentCard({
  item,
  worn = 0,
  onOpen,
}: {
  item: Garment
  /** Confirmed wear days, shown as „N× getragen“. */
  worn?: number
  onOpen: () => void
}) {
  return (
    <article className="garment-card">
      <button
        className="garment-open"
        onClick={onOpen}
        aria-label={`${item.name} öffnen`}
      >
        <span className="garment-frame">
          <GarmentPicture item={item} />
          {item.inLaundry && (
            <span className="laundry-badge">In der Wäsche</span>
          )}
        </span>
        <span className="garment-caption">
          <span className="garment-name">
            <span>{item.name}</span>
            {item.favorite && (
              <Heart
                size={13}
                strokeWidth={1.8}
                aria-label="Favorit"
                role="img"
              />
            )}
          </span>
          <span className="garment-meta">
            {[item.brand, `${worn}× getragen`].filter(Boolean).join(' · ')}
          </span>
        </span>
      </button>
    </article>
  )
}

export function Sheet({
  title,
  eyebrow,
  children,
  onClose,
  className = '',
  dirty = false,
  closeDisabled = false,
}: {
  title: string
  eyebrow?: string
  children: ReactNode
  onClose: () => void
  className?: string
  dirty?: boolean
  closeDisabled?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const discard = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!dirty && !closeDisabled) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, closeDisabled])
  useEffect(() => {
    if (confirmClose) {
      ref.current?.scrollTo({ top: 0, behavior: 'instant' })
      discard.current?.focus({ preventScroll: true })
    }
  }, [confirmClose])
  function close() {
    if (closeDisabled) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }
  const id = useId()
  useEffect(() => {
    const dialog = ref.current!
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    dialog.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = old
      if (opener?.isConnected && !document.querySelector('dialog[open]'))
        opener.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      className={`sheet ${className}`}
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="sheet-content">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={id}>{title}</h2>
          </div>
          <button
            className="icon-button soft"
            aria-label="Schliessen"
            disabled={closeDisabled}
            onClick={close}
          >
            <X size={20} />
          </button>
        </header>
        {confirmClose && (
          <div
            className="discard-notice"
            role="alert"
            ref={discard}
            tabIndex={-1}
          >
            <p>Ungespeicherte Änderungen verwerfen?</p>
            <div className="photo-actions">
              <button
                type="button"
                className="button secondary"
                disabled={closeDisabled}
                onClick={() => setConfirmClose(false)}
              >
                Weiter bearbeiten
              </button>
              <button
                type="button"
                className="button danger"
                disabled={closeDisabled}
                onClick={() => {
                  if (!closeDisabled) onClose()
                }}
              >
                Verwerfen
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </dialog>
  )
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p className="error-message" role="alert">
      {children}
    </p>
  )
}
