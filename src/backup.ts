import { CATEGORIES, COLORS, SEASONS, STYLES, type Garment } from './model'
import { blobToDataURL } from './photos'
import { db, type WardrobeDatabase } from './db'

export const MAX_BACKUP_BYTES = 100 * 1024 * 1024
const invalid = () => new Error('Die Datei ist keine gültige MyStyle-Sicherung (Version 1). Es wurde nichts verändert.')
export async function createBackup(items: Garment[]): Promise<string> {
  if (items.length > 1000) throw new Error('Diese Sicherung unterstützt höchstens 1000 Stücke.')
  const garments = []
  for (const item of items) garments.push({ ...item, photo: item.photo ? await blobToDataURL(item.photo) : undefined })
  const json = JSON.stringify({ app: 'MyStyle', version: 1, exportedAt: new Date().toISOString(), garments })
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error('Die Sicherung überschreitet 100 MB. Eine so grosse Mediathek wird in dieser Version noch nicht unterstützt.')
  return json
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length > max) throw invalid()
  return value
}
function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw invalid()
  return value as T
}
function choices<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value) || value.length > allowed.length) throw invalid()
  return [...new Set(value.map(item => choice(item, allowed)))]
}
function timestamp(value: unknown): string {
  const date = text(value, 40)
  if (!Number.isFinite(Date.parse(date))) throw invalid()
  return new Date(date).toISOString()
}
function photo(value: unknown): Blob | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.length > 12 * 1024 * 1024) throw invalid()
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match) throw invalid()
  let raw: string
  try { raw = atob(match[2]) } catch { throw invalid() }
  const bytes = Uint8Array.from(raw, c => c.charCodeAt(0))
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
  const webp = raw.startsWith('RIFF') && raw.slice(8, 12) === 'WEBP'
  if (!(match[1] === 'image/jpeg' && jpeg || match[1] === 'image/png' && png || match[1] === 'image/webp' && webp)) throw invalid()
  return new Blob([bytes], { type: match[1] })
}
export function parseBackup(json: string): Garment[] {
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error('Die Sicherung ist grösser als 100 MB.')
  let data
  try { data = JSON.parse(json) } catch { throw invalid() }
  if (!data || data.app !== 'MyStyle' || data.version !== 1 || !Array.isArray(data.garments) || data.garments.length > 1000) throw invalid()
  const ids = new Set<string>()
  return data.garments.map((item: Record<string, unknown>) => {
    if (!item || typeof item !== 'object') throw invalid()
    const id = text(item.id, 100)
    const name = text(item.name, 100).trim()
    if (!id || !name || ids.has(id) || typeof item.favorite !== 'boolean') throw invalid()
    ids.add(id)
    return { id, name, category: choice(item.category, CATEGORIES), color: choice(item.color, [...COLORS.map(c => c.name), '']),
      brand: text(item.brand, 100), seasons: choices(item.seasons, SEASONS), styles: choices(item.styles, STYLES),
      notes: text(item.notes, 2000), favorite: item.favorite, createdAt: timestamp(item.createdAt),
      updatedAt: timestamp(item.updatedAt), photo: photo(item.photo) }
  })
}
export async function importBackup(items: Garment[], mode: 'merge' | 'replace', database: WardrobeDatabase = db): Promise<number> {
  // Validation happens before calling this function; all writes are atomic.
  return database.transaction('rw', database.garments, async () => {
    if (mode === 'replace') await database.garments.clear()
    let changed = 0
    for (const item of items) {
      const existing = await database.garments.get(item.id)
      if (!existing || item.updatedAt > existing.updatedAt) {
        await database.garments.put(item)
        changed++
      }
    }
    return changed
  })
}
