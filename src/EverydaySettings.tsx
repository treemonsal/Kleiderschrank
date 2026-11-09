import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, storageError, updatePreferences } from './db'
import { WASH_AFTER } from './laundry'
import { COMFORTS, type Comfort } from './outfit-model'
import { ErrorMessage } from './ui'

const COMFORT_LABELS: Record<Comfort, string> = {
  cold: 'Ich friere schnell',
  normal: 'Normal',
  warm: 'Mir ist schnell warm',
}

/** Everyday habits that shape suggestions: laundry rhythm and temperature feeling. */
export function EverydaySettings() {
  const preferences = useLiveQuery(() => db.preferences.get('personal'))
  const [error, setError] = useState('')
  // Show choices immediately; the live query catches up after saving.
  const [comfort, setComfort] = useState<Comfort>()
  const [autoLaundry, setAutoLaundry] = useState<boolean>()
  async function save(patch: Parameters<typeof updatePreferences>[0]) {
    setError('')
    try {
      await updatePreferences(patch)
    } catch (error) {
      setComfort(undefined)
      setAutoLaundry(undefined)
      setError(storageError(error))
    }
  }
  return (
    <section className="settings-section" aria-label="Alltag">
      <div className="section-heading">
        <h2>Alltag</h2>
      </div>
      <div className="settings-card everyday-card">
        <label className="field">
          Temperaturempfinden
          <select
            value={comfort ?? preferences?.comfort ?? 'normal'}
            onChange={(event) => {
              const value = event.target.value as Comfort
              setComfort(value)
              void save({ comfort: value })
            }}
          >
            {COMFORTS.map((value) => (
              <option key={value} value={value}>
                {COMFORT_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <p className="micro-copy">
          Wer schnell friert, bekommt Jacken schon bei milderem Wetter.
        </p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={autoLaundry ?? preferences?.autoLaundry !== false}
            onChange={(event) => {
              setAutoLaundry(event.target.checked)
              void save({ autoLaundry: event.target.checked })
            }}
          />
          <span>Automatisch in die Wäsche legen</span>
        </label>
        <p className="micro-copy">
          Nach „Heute getragen“: Oberteile und Kleider nach{' '}
          {WASH_AFTER.Oberteile} Tagen, Hosen nach {WASH_AFTER.Hosen}, Jacken
          nach {WASH_AFTER.Jacken}. Schuhe und Accessoires nie.
        </p>
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </div>
    </section>
  )
}
