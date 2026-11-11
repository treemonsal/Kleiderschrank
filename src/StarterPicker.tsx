import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { cutOutLater } from './background-cutout'
import { addStarterPieces, storageError } from './db'
import { preparePhoto } from './photos'
import { fetchProductImage, searchEndpoint } from './product-search'
import { googleClientId, startGoogleSignIn } from './google-auth'
import { useGoogleSession } from './DriveSync'
import { haptic } from './haptics'
import type { Category, GarmentDraft } from './model'
import { ErrorMessage, GarmentPicture } from './ui'

/**
 * Real product photos (no person) found once with the app's own search;
 * loaded through the search worker on the first start. A missing photo
 * falls back to the drawing.
 */
export const STARTER_PIECES: {
  name: string
  image: string
  category: Category
  color: string
}[] = [
  {
    name: 'Weisses T-Shirt',
    image:
      'https://img01.ztat.net/article/spp-media-p1/25f1c7e356d6316eacbcda8dc6ad1904/9a3c673c8e554e569855f3660d420c42.jpg?imwidth=762&filter=packshot',
    category: 'Oberteile',
    color: 'Weiss',
  },
  {
    name: 'Schwarzes T-Shirt',
    image:
      'https://www.emp-online.ch/dw/image/v2/BBQV_PRD/on/demandware.static/-/Sites-master-emp/default/dw557bcfe2/images/3/9/9/7/399719a.jpg?sfrm=png',
    category: 'Oberteile',
    color: 'Schwarz',
  },
  {
    name: 'Grauer Hoodie',
    image:
      'https://img01.ztat.net/article/spp-media-p1/81607b1b97b64d4aa84fb70412ef248b/046aa223e50f441fbd96c270b212dff5.jpg?imwidth=1800&filter=packshot',
    category: 'Oberteile',
    color: 'Grau',
  },
  {
    name: 'Blaues Hemd',
    image:
      'https://kadef-style.com/wp-content/uploads/2026/10/kadef-herren-slim-fit-hemd-hellblau-06-liegend.webp',
    category: 'Oberteile',
    color: 'Blau',
  },
  {
    name: 'Blaue Jeans',
    image:
      'https://nudie.centracdn.net/client/dynamic/images/8939_cfbf3cc843-114948_lean-dean-blue-dawn-6-2-flatshot-2400.jpg',
    category: 'Hosen',
    color: 'Blau',
  },
  {
    name: 'Schwarze Hose',
    image:
      'https://huesler-ag.ch/app/uploads/2019/09/210505_10058_hose-service-damen_schwarz_vo.jpg',
    category: 'Hosen',
    color: 'Schwarz',
  },
  {
    name: 'Beige Chino',
    image:
      'https://images.napali.app/global/element-products/all/default/xlarge/elynp00181_element,f_tkh0_frt1.jpg',
    category: 'Hosen',
    color: 'Beige',
  },
  {
    name: 'Weisse Sneaker',
    image:
      'https://d1fufvy4xao6k9.cloudfront.net/feed/img/man_sneaker/876664/side.png',
    category: 'Schuhe',
    color: 'Weiss',
  },
  {
    name: 'Schwarze Sneaker',
    image:
      'https://dtcralphlauren.scene7.com/is/image/PoloGSI/s7-AI809P00810001_lifestyle?$plpDeskRF$',
    category: 'Schuhe',
    color: 'Schwarz',
  },
  {
    name: 'Jeansjacke',
    image:
      'https://assets.manufactum.de/p/204/204335/204335_01.jpg/damen-jeansjacke.jpg?profile=pdsmain_1500',
    category: 'Jacken',
    color: 'Blau',
  },
  {
    name: 'Schwarze Jacke',
    image:
      'https://www.safetymarking.ch/images/600/CT1079_Y_01/carhartt-detroit-jacke-schwarz-mit-brusttasche-2-innentaschen-reissverschluss-mit-sturmklappe.jpg',
    category: 'Jacken',
    color: 'Schwarz',
  },
  {
    name: 'Schwarzer Gürtel',
    image:
      'https://strellson.com/medias/sys_master/images/images/h99/hb8/10123546296350/10123546296350.jpg',
    category: 'Accessoires',
    color: 'Schwarz',
  },
]

/**
 * The empty wardrobe: tap what you own, add it in one go (photos can follow
 * later), or start with an own piece. Signing in keeps it on every device.
 */
export function StarterPicker({
  onAdd,
  notify,
}: {
  onAdd: () => void
  notify: (message: string) => void
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const google = useGoogleSession()
  // Real photos, loaded once through the search worker; drawings until then
  // and whenever a shop image is gone.
  const [photos, setPhotos] = useState<
    Record<string, { blob: Blob; url: string }>
  >({})
  useEffect(() => {
    if (!searchEndpoint()) return
    const controller = new AbortController()
    const urls: string[] = []
    for (const piece of STARTER_PIECES)
      fetchProductImage(piece.image, controller.signal)
        .then((blob) => {
          if (controller.signal.aborted) return
          const url = URL.createObjectURL(blob)
          urls.push(url)
          setPhotos((current) => ({ ...current, [piece.name]: { blob, url } }))
        })
        .catch(() => {})
    return () => {
      controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])
  const toggle = (name: string) => {
    haptic()
    setPicked((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }
  async function add() {
    haptic('success')
    setBusy(true)
    setError('')
    try {
      const drafts: GarmentDraft[] = await Promise.all(
        STARTER_PIECES.filter((piece) => picked.has(piece.name)).map(
          async ({ name, category, color }) => {
            const loaded = photos[name]
            // A photo that cannot be prepared simply stays away.
            const photo = loaded
              ? await preparePhoto(
                  new File([loaded.blob], 'starter', {
                    type: loaded.blob.type,
                  }),
                ).catch(() => undefined)
              : undefined
            return {
              name,
              category,
              color,
              brand: '',
              seasons: [],
              styles: [],
              notes: '',
              favorite: false,
              ...(photo ? { photo } : {}),
            }
          },
        ),
      )
      const ids = await addStarterPieces(drafts)
      void cutOutLater(ids)
      notify(
        drafts.length === 1
          ? 'Ein Stück liegt im Kleiderschrank.'
          : `${drafts.length} Stücke liegen im Kleiderschrank.`,
      )
    } catch (caught) {
      setError(storageError(caught))
      setBusy(false)
    }
  }
  return (
    <section className="starter" aria-label="Was besitzt du?">
      <h2 className="starter-title">Was besitzt du?</h2>
      <button
        className={`button ${picked.size ? 'secondary' : 'primary'} full daily-add`}
        onClick={onAdd}
      >
        <Plus size={18} />
        Erstes Stück hinzufügen
      </button>
      <ul className="starter-grid">
        {STARTER_PIECES.map((piece) => {
          const on = picked.has(piece.name)
          return (
            <li key={piece.name}>
              <button
                className={`starter-piece${on ? ' active' : ''}`}
                aria-pressed={on}
                disabled={busy}
                onClick={() => toggle(piece.name)}
              >
                {photos[piece.name] ? (
                  <span className="garment-picture starter-photo">
                    <img src={photos[piece.name].url} alt="" />
                  </span>
                ) : (
                  <GarmentPicture item={piece} />
                )}
                <span>{piece.name}</span>
                {on && (
                  <span className="starter-check" aria-hidden="true">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      {picked.size > 0 && (
        <div className="starter-actions">
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => void add()}
          >
            {picked.size === 1
              ? '1 Stück hinzufügen'
              : `${picked.size} Stücke hinzufügen`}
          </button>
        </div>
      )}
      {googleClientId() && !google && (
        <div className="starter-google">
          <p>
            Melde dich mit Google an, dann ist dein Kleiderschrank auf all
            deinen Geräten.
          </p>
          <button
            className="button secondary"
            onClick={() => {
              try {
                startGoogleSignIn()
              } catch (caught) {
                setError(
                  caught instanceof Error ? caught.message : String(caught),
                )
              }
            }}
          >
            Mit Google anmelden
          </button>
        </div>
      )}
    </section>
  )
}
