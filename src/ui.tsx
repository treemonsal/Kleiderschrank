import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Heart, Shirt, X } from 'lucide-react'
import type { Garment } from './model'

export function usePhotoUrl(photo?: Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  const resources = useRef(new Set<string>())
  const pending = useRef<string | undefined>(undefined)
  useEffect(() => {
    const next = photo ? URL.createObjectURL(photo) : undefined
    if (next) resources.current.add(next)
    pending.current = next
    setUrl(next)
  }, [photo])
  useEffect(() => {
    // IndexedDB returns new Blob objects even for status-only updates. Revoke
    // the old URL only after React has committed the replacement image source.
    for (const resource of resources.current) {
      if (resource !== url && resource !== pending.current) {
        URL.revokeObjectURL(resource)
        resources.current.delete(resource)
      }
    }
  }, [url, photo])
  useEffect(() => {
    const owned = resources.current
    return () => {
      for (const resource of owned) URL.revokeObjectURL(resource)
      owned.clear()
      pending.current = undefined
    }
  }, [])
  return photo ? url : undefined
}

export function GarmentPicture({
  item,
  large = false,
}: {
  item: Pick<Garment, 'photo' | 'cutout' | 'name' | 'category'>
  large?: boolean
}) {
  const url = usePhotoUrl(item.cutout ?? item.photo)
  return (
    <div className={`garment-picture ${large ? 'large' : ''}`}>
      {url ? (
        <img src={url} alt={item.name} loading={large ? 'eager' : 'lazy'} />
      ) : (
        <div className="photo-placeholder">
          <Shirt strokeWidth={1} size={large ? 100 : 64} />
          <span>{item.category}</span>
        </div>
      )}
    </div>
  )
}

export function GarmentCard({
  item,
  onOpen,
  onFavorite,
}: {
  item: Garment
  onOpen: () => void
  onFavorite: () => void
}) {
  return (
    <article className="garment-card">
      <button
        className="garment-open"
        onClick={onOpen}
        aria-label={`${item.name} öffnen`}
      >
        <GarmentPicture item={item} />
        <div className="garment-caption">
          <span className="item-category">{item.category}</span>
          {item.inLaundry && (
            <span className="laundry-badge">In der Wäsche</span>
          )}
          <h3>{item.name}</h3>
          <p>
            {[item.brand, item.color].filter(Boolean).join(' · ') ||
              'Dein persönliches Stück'}
          </p>
        </div>
      </button>
      <button
        data-motion="heart"
        className={`favorite-button ${item.favorite ? 'is-favorite' : ''}`}
        onClick={onFavorite}
        aria-label={`${item.name}: ${item.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}`}
        aria-pressed={item.favorite}
      >
        <Heart size={18} fill={item.favorite ? 'currentColor' : 'none'} />
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
}: {
  title: string
  eyebrow?: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
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
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
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
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
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
