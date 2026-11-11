import type { Garment } from './model'

/**
 * Several accessories per outfit, but sensibly mixed: glasses with two
 * rings, or a necklace with a belt and a ring; never two belts or two
 * pairs of glasses. The kind comes from the name; unknown ones count as
 * "other" (one at most).
 */
export type AccessoryKind =
  | 'ring'
  | 'bracelet'
  | 'necklace'
  | 'earrings'
  | 'watch'
  | 'glasses'
  | 'belt'
  | 'headwear'
  | 'scarf'
  | 'bag'
  | 'other'

export const MAX_ACCESSORIES = 3

const KINDS: [AccessoryKind, RegExp][] = [
  // Watches first: an „Armbanduhr“ is not a bracelet.
  ['watch', /uhr\b|watch/i],
  ['ring', /\bring|siegelring|ehering/i],
  ['bracelet', /armband|armreif|bracelet/i],
  ['necklace', /kette|halsband|anhänger|collier|necklace/i],
  ['earrings', /ohrring|ohrstecker|creole|earring/i],
  ['glasses', /brille|glasses|sunglasses/i],
  ['belt', /gürtel|guertel|belt/i],
  ['headwear', /mütze|muetze|beanie|\bcap\b|kappe|\bhut\b|hat\b|stirnband/i],
  ['scarf', /schal|tuch|scarf/i],
  ['bag', /tasche|rucksack|bag|beutel|clutch/i],
]

/** Per kind: rings and bracelets may come in pairs, everything else once. */
const LIMIT: Partial<Record<AccessoryKind, number>> = { ring: 2, bracelet: 2 }

export function accessoryKind(item: Pick<Garment, 'name'>): AccessoryKind {
  for (const [kind, pattern] of KINDS) if (pattern.test(item.name)) return kind
  return 'other'
}

/** Up to three accessories that make sense together. */
export function accessoriesFit(items: Pick<Garment, 'name'>[]): boolean {
  if (items.length > MAX_ACCESSORIES) return false
  const counts = new Map<AccessoryKind, number>()
  for (const item of items) {
    const kind = accessoryKind(item)
    const next = (counts.get(kind) ?? 0) + 1
    if (next > (LIMIT[kind] ?? 1)) return false
    counts.set(kind, next)
  }
  return true
}

/**
 * Accessory sets to try with an outfit, best-ranked pieces first: each of
 * the top singles, then pairs and triples built greedily from the ranking.
 */
export function accessorySets<T extends Pick<Garment, 'id' | 'name'>>(
  ranked: T[],
  limit = 6,
): T[][] {
  const pool = ranked.slice(0, 6)
  const sets: T[][] = []
  const seen = new Set<string>()
  const push = (set: T[]) => {
    const key = set
      .map((item) => item.id)
      .sort()
      .join('|')
    if (!set.length || seen.has(key) || !accessoriesFit(set)) return
    seen.add(key)
    sets.push(set)
  }
  for (const start of pool.slice(0, 3)) {
    const set = [start]
    push([...set])
    for (const next of pool) {
      if (set.length >= MAX_ACCESSORIES || set.includes(next)) continue
      if (accessoriesFit([...set, next])) {
        set.push(next)
        push([...set])
      }
    }
  }
  return sets.slice(0, limit)
}
