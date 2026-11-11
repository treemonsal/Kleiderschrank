import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { addStarterPieces, storageError } from './db'
import { googleClientId, startGoogleSignIn } from './google-auth'
import { useGoogleSession } from './DriveSync'
import { haptic } from './haptics'
import type { Category, GarmentDraft } from './model'
import { ErrorMessage, GarmentPicture } from './ui'

/** Basics most people own; colours as data, no assumptions about anyone. */
export const STARTER_PIECES: {
  name: string
  category: Category
  color: string
}[] = [
  { name: 'Weisses T-Shirt', category: 'Oberteile', color: 'Weiss' },
  { name: 'Schwarzes T-Shirt', category: 'Oberteile', color: 'Schwarz' },
  { name: 'Grauer Hoodie', category: 'Oberteile', color: 'Grau' },
  { name: 'Blaues Hemd', category: 'Oberteile', color: 'Blau' },
  { name: 'Blaue Jeans', category: 'Hosen', color: 'Blau' },
  { name: 'Schwarze Hose', category: 'Hosen', color: 'Schwarz' },
  { name: 'Beige Chino', category: 'Hosen', color: 'Beige' },
  { name: 'Weisse Sneaker', category: 'Schuhe', color: 'Weiss' },
  { name: 'Schwarze Sneaker', category: 'Schuhe', color: 'Schwarz' },
  { name: 'Jeansjacke', category: 'Jacken', color: 'Blau' },
  { name: 'Schwarze Jacke', category: 'Jacken', color: 'Schwarz' },
  { name: 'Schwarzer Gürtel', category: 'Accessoires', color: 'Schwarz' },
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
      const drafts: GarmentDraft[] = STARTER_PIECES.filter((piece) =>
        picked.has(piece.name),
      ).map((piece) => ({
        ...piece,
        brand: '',
        seasons: [],
        styles: [],
        notes: '',
        favorite: false,
      }))
      await addStarterPieces(drafts)
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
                <GarmentPicture item={piece} />
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
