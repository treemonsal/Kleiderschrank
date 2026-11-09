/**
 * Device sync as a three-way merge: this device, the copy in the person's own
 * Google Drive and the state both had at the last successful sync („base“).
 * Newer edits win per record; a record missing on one side counts as deleted
 * only if it was already synced before and has not been edited since.
 */

export interface SyncRecord {
  id: string
  updatedAt: string
}

/** Synced collections; singletons use a fixed id. */
export const SYNC_COLLECTIONS = [
  'garments',
  'outfits',
  'feedback',
  'calendar',
  'weather',
  'chat',
] as const
export type SyncCollection = (typeof SYNC_COLLECTIONS)[number]

/** updatedAt per „collection:id“ at the last successful sync. */
export type SyncBase = Record<string, string>

export type SyncDecision = 'keep' | 'import' | 'deleteLocal' | 'dropRemote'

export function decide(
  local: SyncRecord | undefined,
  remote: SyncRecord | undefined,
  base: string | undefined,
): SyncDecision {
  if (local && remote)
    return remote.updatedAt > local.updatedAt ? 'import' : 'keep'
  if (local)
    return base !== undefined && local.updatedAt <= base
      ? 'deleteLocal'
      : 'keep'
  if (remote)
    return base !== undefined && remote.updatedAt <= base
      ? 'dropRemote'
      : 'import'
  return 'keep'
}

export type SyncSides = Record<SyncCollection, SyncRecord[]>

export interface SyncPlan {
  /** Remote records to bring onto this device. */
  imports: Record<SyncCollection, Set<string>>
  /** Local records another device deleted. */
  deletions: Record<SyncCollection, Set<string>>
}

export function syncPlan(
  local: SyncSides,
  remote: SyncSides,
  base: SyncBase,
): SyncPlan {
  const plan: SyncPlan = {
    imports: {} as SyncPlan['imports'],
    deletions: {} as SyncPlan['deletions'],
  }
  for (const collection of SYNC_COLLECTIONS) {
    plan.imports[collection] = new Set()
    plan.deletions[collection] = new Set()
    const mine = new Map(local[collection].map((item) => [item.id, item]))
    const theirs = new Map(remote[collection].map((item) => [item.id, item]))
    for (const id of new Set([...mine.keys(), ...theirs.keys()])) {
      const decision = decide(
        mine.get(id),
        theirs.get(id),
        base[`${collection}:${id}`],
      )
      if (decision === 'import') plan.imports[collection].add(id)
      if (decision === 'deleteLocal') plan.deletions[collection].add(id)
    }
  }
  return plan
}

export function snapshotBase(sides: SyncSides): SyncBase {
  const base: SyncBase = {}
  for (const collection of SYNC_COLLECTIONS)
    for (const item of sides[collection])
      base[`${collection}:${item.id}`] = item.updatedAt
  return base
}

/** Photo references in the Drive copy: „ref:<type>:<sha256>“. */
export function photoRef(type: string, hash: string): string {
  return `ref:${type}:${hash}`
}
export function parsePhotoRef(
  value: unknown,
): { type: string; hash: string } | undefined {
  const match =
    typeof value === 'string'
      ? /^ref:(image\/(?:jpeg|png|webp)):([0-9a-f]{64})$/.exec(value)
      : null
  return match ? { type: match[1], hash: match[2] } : undefined
}
export function photoFileName(hash: string): string {
  return `photo-${hash}`
}

export async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
