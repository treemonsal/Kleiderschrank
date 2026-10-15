import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Heart, Shirt, X } from 'lucide-react'
import type { Garment } from './model'

export function usePhotoUrl(photo?: Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!photo) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(photo)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [photo])
  return url
}

export function WardrobeArt() {
  return (
    <svg
      className="wardrobe-art"
      viewBox="0 0 340 290"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="172"
        cy="258"
        rx="134"
        ry="13"
        fill="currentColor"
        opacity=".06"
      />
      <path
        d="M55 253V58a18 18 0 0 1 18-18h197a18 18 0 0 1 18 18v195M45 253h28m202 0h28M57 65h229"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".45"
      />
      <path
        d="M113 70v12m0 0L82 102h63l-32-20m108-12v12m0 0l-32 20h64l-32-20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity=".65"
      />
      <path
        d="M99 96l-24 14-20 39 24 13 12-18-3 76h62l-3-76 12 18 24-13-20-39-25-14c-5 14-34 14-39 0Z"
        fill="#d8d8ed"
        stroke="#9294af"
        strokeWidth="1.5"
      />
      <path
        d="M100 98c3 20 33 20 37 0m-19 18v104"
        stroke="#9294af"
        strokeWidth="1.5"
      />
      <path
        d="M201 98l-17 9 9 122h55l9-122-18-9-18 10-20-10Z"
        fill="#7977ac"
        stroke="#aaa6df"
        strokeWidth="1.5"
      />
      <path
        d="M222 110v119m-35-120 16 36 19-35 18 35 14-36M202 178h13m14 0h13"
        stroke="#e5e3fa"
        strokeWidth="1.3"
        opacity=".8"
      />
      <path d="m265 157 4-8 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#b9b1ff" />
      <circle cx="66" cy="197" r="3" fill="#b9b1ff" />
    </svg>
  )
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
          <h3>{item.name}</h3>
          <p>
            {[item.brand, item.color].filter(Boolean).join(' · ') ||
              'Dein persönliches Stück'}
          </p>
        </div>
      </button>
      <button
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
}: {
  title: string
  eyebrow?: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const id = useId()
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = old
    }
  }, [])
  return (
    <dialog
      className="sheet"
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
