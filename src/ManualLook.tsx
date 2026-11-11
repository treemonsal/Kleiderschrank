import { useMemo, useRef, useState } from 'react'
import { haptic } from './haptics'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
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

/** One row: swipe sideways (native scroll snapping) or use the arrows. */
function Row({
  row,
  index,
  onChange,
}: {
  row: LookRow
  index: number
  onChange: (index: number) => void
}) {
  const track = useRef<HTMLUListElement>(null)
  const settle = useRef<number>(undefined)
  // Slide an arrow asked for; scrolling that is still on its way there must
  // not pick a piece halfway.
  const target = useRef<number | null>(null)
  const slides = row.items.length
  const current = chosenPiece(row, { [row.id]: index })
  function go(next: number) {
    const clamped = Math.max(0, Math.min(slides - 1, next))
    haptic()
    onChange(clamped)
    target.current = clamped
    const list = track.current
    list?.scrollTo({
      left: clamped * list.clientWidth,
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
        disabled={index <= 0}
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
            const next = Math.max(0, Math.min(slides - 1, slide))
            if (next !== index) onChange(next)
          }, 90)
        }}
      >
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
      {/* Pictures speak, as in the wardrobe; the name is for VoiceOver. */}
      <p className="look-row-name sr-only" aria-live="polite">
        {current?.name}
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
  const optional = rows.filter((row) => row.optional && row.items.length)
  // Jacket and accessory stay away until asked for: three rows by default.
  const shown = rows.filter(
    (row) =>
      row.items.length &&
      !(dress && row.id === 'bottom') &&
      (!row.optional || (choice[row.id] ?? -1) >= 0),
  )
  const saved = !!look && isSaved(look)
  return (
    <section className="manual-look" aria-label="Selber zusammenstellen">
      <div className="manual-look-head">
        <h2 className="home-section-title">Selber zusammenstellen</h2>
        {optional.map((row) => {
          const on = (choice[row.id] ?? -1) >= 0
          return (
            <button
              key={row.id}
              className={`look-layer${on ? ' active' : ''}`}
              aria-pressed={on}
              onClick={() =>
                setChoice((current) => ({
                  ...current,
                  [row.id]: on ? -1 : 0,
                }))
              }
            >
              {on ? <Minus size={15} /> : <Plus size={15} />}
              {row.label}
            </button>
          )
        })}
      </div>
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
