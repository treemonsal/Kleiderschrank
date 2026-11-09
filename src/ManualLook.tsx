import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Garment } from './model'
import {
  chosenLook,
  chosenPiece,
  lookRows,
  missingRows,
  wearsDress,
  type LookChoice,
  type LookRow,
} from './manual-look'
import { GarmentPicture } from './ui'

/**
 * One row: swipe sideways (native scroll snapping) or use the arrows.
 * Optional rows begin with an empty "Ohne" slide.
 */
function Row({
  row,
  index,
  onChange,
}: {
  row: LookRow
  /** -1 = Ohne */
  index: number
  onChange: (index: number) => void
}) {
  const track = useRef<HTMLUListElement>(null)
  const settle = useRef<number>(undefined)
  // Slide an arrow asked for; scrolling that is still on its way there must
  // not pick a piece halfway.
  const target = useRef<number | null>(null)
  const offset = row.optional ? 1 : 0
  const slides = row.items.length + offset
  const current = chosenPiece(row, { [row.id]: index })
  function go(next: number) {
    const clamped = Math.max(-offset, Math.min(row.items.length - 1, next))
    onChange(clamped)
    target.current = clamped + offset
    const list = track.current
    list?.scrollTo({
      left: (clamped + offset) * list.clientWidth,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }
  return (
    <section className="look-row" aria-label={row.label}>
      <button
        className="icon-button look-row-step"
        aria-label={`Vorheriges ${row.label}`}
        disabled={index + offset <= 0}
        onClick={() => go(index - 1)}
      >
        <ChevronLeft size={20} />
      </button>
      <ul
        ref={track}
        className="look-row-track"
        data-no-swipe
        onScroll={(event) => {
          const list = event.currentTarget
          window.clearTimeout(settle.current)
          settle.current = window.setTimeout(() => {
            const slide = Math.round(list.scrollLeft / list.clientWidth)
            if (target.current !== null) {
              if (slide !== target.current)
                list.scrollTo({ left: target.current * list.clientWidth })
              else target.current = null
              return
            }
            const next = Math.max(0, Math.min(slides - 1, slide)) - offset
            if (next !== index) onChange(next)
          }, 90)
        }}
      >
        {row.optional && (
          <li className="look-row-slide is-empty" aria-hidden={index !== -1}>
            <span />
          </li>
        )}
        {row.items.map((item, position) => (
          <li
            key={item.id}
            className="look-row-slide"
            aria-hidden={position !== index}
          >
            <GarmentPicture item={item} />
          </li>
        ))}
      </ul>
      <button
        className="icon-button look-row-step"
        aria-label={`Nächstes ${row.label}`}
        disabled={index >= row.items.length - 1}
        onClick={() => go(index + 1)}
      >
        <ChevronRight size={20} />
      </button>
      <p className="look-row-name" aria-live="polite">
        {current?.name ?? `Ohne ${row.label}`}
      </p>
    </section>
  )
}

/** Fits-style manual board: swipe each row until the look is right. */
export function ManualLook({
  items,
  busy,
  onSave,
  onToday,
  onAdd,
  isSaved,
}: {
  items: Garment[]
  busy: boolean
  onSave: (ids: string[]) => void
  onToday: (ids: string[]) => void
  onAdd: () => void
  isSaved: (ids: string[]) => boolean
}) {
  const rows = useMemo(() => lookRows(items), [items])
  const [choice, setChoice] = useState<LookChoice>({})
  const dress = wearsDress(rows, choice)
  const look = chosenLook(rows, choice)
  const missing = missingRows(rows, choice)
  const shown = rows.filter(
    (row) => row.items.length && !(dress && row.id === 'bottom'),
  )
  const saved = !!look && isSaved(look)
  return (
    <section className="manual-look" aria-label="Selber zusammenstellen">
      <h2 className="home-section-title">Selber zusammenstellen</h2>
      {shown.map((row) => (
        <Row
          key={row.id}
          row={row}
          index={choice[row.id] ?? (row.optional ? -1 : 0)}
          onChange={(index) =>
            setChoice((current) => ({ ...current, [row.id]: index }))
          }
        />
      ))}
      {missing.length ? (
        <div className="look-result" role="status">
          <p>Dafür fehlen noch: {missing.join(', ')}.</p>
          <button className="button secondary" onClick={onAdd}>
            Stück hinzufügen
          </button>
        </div>
      ) : (
        <div className="look-result-actions">
          <button
            className="button secondary"
            disabled={busy || !look || saved}
            onClick={() => look && onSave(look)}
          >
            {saved ? 'Gespeichert' : 'Speichern'}
          </button>
          <button
            className="button primary"
            disabled={busy || !look}
            onClick={() => look && onToday(look)}
          >
            Für heute
          </button>
        </div>
      )}
    </section>
  )
}
