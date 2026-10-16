import type { SavedOutfit } from './outfit-model'

export interface CalendarEntry {
  id: string
  day: string
  outfitId: string
  status: 'planned' | 'worn'
  wornColors?: string[]
  note: string
  createdAt: string
  updatedAt: string
}
export const MAX_CALENDAR_ENTRIES = 3000
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(`${value}T12:00:00Z`)
  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' &&
    value <= '2200-12-31'
  )
}
export function dayLabel(day: string): string {
  return new Intl.DateTimeFormat('de-CH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${day}T12:00:00`))
}
export function monthDays(month: string): (string | null)[] {
  const first = new Date(`${month}-01T12:00:00`)
  const offset = (first.getDay() + 6) % 7
  const count = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
    12,
  ).getDate()
  return Array.from({ length: 42 }, (_, index) =>
    index < offset || index >= count + offset
      ? null
      : `${month}-${String(index - offset + 1).padStart(2, '0')}`,
  )
}
export function wornCounts(
  entries: CalendarEntry[],
  outfits: SavedOutfit[],
  today = localDay(),
): Map<string, number> {
  const counts = new Map<string, number>()
  const byId = new Map(outfits.map((outfit) => [outfit.id, outfit]))
  for (const entry of entries) {
    if (entry.status !== 'worn' || entry.day > today) continue
    for (const id of new Set(byId.get(entry.outfitId)?.garmentIds ?? []))
      counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

export function shiftDay(day: string, offset: number): string | null {
  if (!isDay(day) || !Number.isInteger(offset)) return null
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate() + offset)
  const next = localDay(date)
  return isDay(next) ? next : null
}
export function weekDays(day: string): (string | null)[] {
  const weekday = new Date(`${day}T12:00:00`).getDay()
  const mondayOffset = -((weekday + 6) % 7)
  return Array.from({ length: 7 }, (_, index) =>
    shiftDay(day, mondayOffset + index),
  )
}
