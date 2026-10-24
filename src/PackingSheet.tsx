import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import type { Garment } from './model'
import {
  DEFAULT_OUTFIT_OPTIONS,
  DEFAULT_PREFERENCES,
  OCCASIONS,
  type Occasion,
} from './outfit-model'
import { packingPlan } from './packing'
import { Sheet } from './ui'

/** Trip planner: one look per day, as few pieces as possible to pack. */
export function PackingSheet({
  items,
  onClose,
}: {
  items: Garment[]
  onClose: () => void
}) {
  const [days, setDays] = useState(3)
  const [occasion, setOccasion] = useState<Occasion>('Freizeit')
  const [packed, setPacked] = useState<Set<string>>(new Set())
  const state = useLiveQuery(async () => ({
    preferences: (await db.preferences.get('personal')) ?? DEFAULT_PREFERENCES,
    feedback: await db.feedback.toArray(),
  }))
  const plan = state
    ? packingPlan(
        items.map((item) => ({ ...item, inLaundry: false })),
        { ...DEFAULT_OUTFIT_OPTIONS, occasion },
        state.preferences,
        state.feedback,
        days,
      )
    : undefined
  const name = (id: string) => items.find((item) => item.id === id)?.name
  return (
    <Sheet title="Packliste" eyebrow="Reise" onClose={onClose}>
      <div className="packing">
        <div className="field-row">
          <label className="field">
            Tage
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {Array.from({ length: 14 }, (_, index) => index + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Tag' : 'Tage'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Anlass
            <select
              value={occasion}
              onChange={(event) => setOccasion(event.target.value as Occasion)}
            >
              {OCCASIONS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {!plan ? (
          <p role="status">Wird geplant …</p>
        ) : !plan.looks.length ? (
          <p className="muted">
            Für einen ganzen Look fehlen noch Schuhe und ein Oberteil mit Hose
            oder ein Kleid.
          </p>
        ) : (
          <>
            <p className="packing-summary">
              {plan.pieces.length} Stücke für {plan.looks.length}{' '}
              {plan.looks.length === 1 ? 'Look' : 'Looks'}. Wäsche ist
              eingeplant, falls du vorher wäschst.
            </p>
            <section aria-label="Zum Einpacken">
              <h3>Einpacken</h3>
              <ul className="packing-list">
                {plan.pieces.map((item) => (
                  <li key={item.id}>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={packed.has(item.id)}
                        onChange={(event) => {
                          const next = new Set(packed)
                          if (event.target.checked) next.add(item.id)
                          else next.delete(item.id)
                          setPacked(next)
                        }}
                      />
                      <span>{item.name}</span>
                      <small>{item.category}</small>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-label="Looks pro Tag">
              <h3>Looks pro Tag</h3>
              <ol className="packing-days">
                {plan.looks.map((look, index) => (
                  <li key={index}>
                    <strong>Tag {index + 1}</strong>
                    <span>{look.map(name).join(' · ')}</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>
    </Sheet>
  )
}
