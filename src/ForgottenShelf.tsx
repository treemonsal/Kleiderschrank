import { ChevronRight } from 'lucide-react'
import type { Garment } from './model'
import { describeWear, type WearStats } from './wear-stats'
import { GarmentPicture } from './ui'

/**
 * Pieces that waited longest (never-worn first). Without wear days it can
 * fall back to the newest pieces; Today shows it only once wear days exist.
 */
export function ForgottenShelf({
  items,
  wear,
  today,
  onOpen,
  limit = 4,
  fallback = true,
}: {
  items: Garment[]
  wear: Map<string, WearStats>
  today: string
  onOpen: (id: string) => void
  limit?: number
  fallback?: boolean
}) {
  const forgottenMode = wear.size > 0
  if (!forgottenMode && !fallback) return null
  const title = forgottenMode ? 'Lange nicht getragen' : 'Zuletzt hinzugefügt'
  const current = items.filter((item) => !item.archivedAt)
  const shown = (
    forgottenMode
      ? current
          .filter((item) => !item.inLaundry)
          .sort(
            (a, b) =>
              (wear.get(a.id)?.lastWorn ?? '').localeCompare(
                wear.get(b.id)?.lastWorn ?? '',
              ) || a.name.localeCompare(b.name, 'de'),
          )
      : [...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  ).slice(0, limit)
  if (!shown.length) return null
  return (
    <section className="journal-forgotten" aria-label={title}>
      <div className="journal-section-heading">
        <h2>{title}</h2>
      </div>
      {shown.map((item) => (
        <button
          key={item.id}
          className="journal-row"
          aria-label={`${item.name} öffnen`}
          onClick={() => onOpen(item.id)}
        >
          <span className="journal-swatch" aria-hidden="true">
            <GarmentPicture item={item} />
          </span>
          <span className="journal-row-text">
            <strong>{item.name}</strong>
            <small>
              {forgottenMode
                ? describeWear(wear.get(item.id), today)
                : `${item.category} · hinzugefügt am ${new Date(item.createdAt).toLocaleDateString('de-CH')}`}
            </small>
          </span>
          <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      ))}
    </section>
  )
}
