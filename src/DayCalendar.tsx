import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayLabel, monthDays, type CalendarEntry } from './calendar'
import { dayColors, paletteGradient } from './calendar-colors'
import type { Garment } from './model'
import type { SavedOutfit } from './outfit-model'

export function DayNumber({
  day,
  entry,
  colors,
  today,
}: {
  day: string
  entry?: CalendarEntry
  colors: string[]
  today: string
}) {
  const worn = entry?.status === 'worn' && day <= today
  return (
    <span
      className={`day-number ${worn ? 'has-worn' : entry ? 'has-plan' : ''}`}
    >
      {(worn || entry) && (
        <span
          className={`day-color-ring ${worn && colors.length ? 'has-colors' : ''}`}
          style={worn ? { background: paletteGradient(colors) } : undefined}
          aria-hidden="true"
        />
      )}
      <span>{Number(day.slice(-2))}</span>
    </span>
  )
}
export function calendarDayDescription(
  day: string,
  entry: CalendarEntry | undefined,
  colors: string[],
  today: string,
) {
  return `${dayLabel(day)}${entry ? (entry.status === 'worn' && day <= today ? ` · Getragen · ${colors.length ? `Farben: ${colors.join(', ')}` : 'Farbe nicht erfasst'}` : ' · Geplant') : ''}`
}
export function DayCalendar({
  day,
  today,
  entries,
  outfits,
  items,
  onSelect,
}: {
  day: string
  today: string
  entries: CalendarEntry[]
  outfits: SavedOutfit[]
  items: Garment[]
  onSelect: (day: string) => void
}) {
  const [month, setMonth] = useState(day.slice(0, 7))
  useEffect(() => setMonth(day.slice(0, 7)), [day])
  function moveMonth(offset: number) {
    const next = new Date(`${month}-01T12:00:00`)
    next.setMonth(next.getMonth() + offset)
    if (next.getFullYear() >= 1900 && next.getFullYear() <= 2200)
      setMonth(
        `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`,
      )
  }
  return (
    <>
      <div className="calendar-month-heading">
        <button
          className="icon-button"
          aria-label="Vorheriger Monat"
          disabled={month === '1900-01'}
          onClick={() => moveMonth(-1)}
        >
          <ChevronLeft size={20} />
        </button>
        <h2>
          {new Date(`${month}-01T12:00:00`).toLocaleDateString('de-CH', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <button
          className="icon-button"
          aria-label="Nächster Monat"
          disabled={month === '2200-12'}
          onClick={() => moveMonth(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {monthDays(month).map((value, index) => {
          if (!value) return <span key={`empty-${index}`} />
          const entry = entries.find((entry) => entry.day === value),
            colors = dayColors(entry, outfits, items, today)
          return (
            <button
              key={value}
              className={day === value ? 'selected' : ''}
              aria-label={calendarDayDescription(value, entry, colors, today)}
              aria-pressed={day === value}
              aria-current={value === today ? 'date' : undefined}
              onClick={() => onSelect(value)}
            >
              <DayNumber
                day={value}
                entry={entry}
                colors={colors}
                today={today}
              />
            </button>
          )
        })}
      </div>
      <p className="calendar-ring-legend">
        Farbring: getragen · gestrichelter Kreis: geplant
      </p>
    </>
  )
}
