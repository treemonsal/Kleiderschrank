import type { Garment } from './model'
import { createCompatibilityScorer } from './outfit-compatibility'
import {
  recentPiecePenalty,
  recentCombinationPenalty,
  type RecentWear,
} from './wear-history'
import type { WeatherDay } from './weather'
import {
  outfitKey,
  type OutfitCandidate,
  type OutfitFeedback,
  type OutfitOptions,
  type Preferences,
} from './outfit-model'

const neutral = new Set(['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun'])
function noise(key: string, seed: number): number {
  let value = seed | 0
  for (let i = 0; i < key.length; i++)
    value = Math.imul(value ^ key.charCodeAt(i), 16777619)
  return (value >>> 0) / 4294967296
}
export function eligibleGarments(
  items: Garment[],
  options: OutfitOptions,
  weather?: WeatherDay,
): Garment[] {
  // Unknown seasons stay eligible; conflicting explicitly entered seasons do not.
  return items.filter(
    (item) =>
      !item.inLaundry &&
      (options.season === 'Alle' ||
        !item.seasons.length ||
        item.seasons.includes(options.season)) &&
      !(
        (options.occasion === 'Büro' || options.occasion === 'Abend') &&
        item.styles.length > 0 &&
        item.styles.every(
          (style) => style === 'Sportlich' || style === 'Streetwear',
        )
      ) &&
      !(
        weather &&
        item.seasons.length > 0 &&
        ((weather.max <= 10 &&
          item.seasons.every((season) => season === 'Sommer')) ||
          (weather.min >= 18 &&
            weather.max >= 25 &&
            item.seasons.every((season) => season === 'Winter')))
      ),
  )
}
export function missingOutfitMessage(
  items: Garment[],
  options: OutfitOptions,
  weather?: WeatherDay,
): string {
  const eligible = eligibleGarments(items, options, weather)
  const has = (category: string) =>
    eligible.some((item) => item.category === category)
  if (!has('Schuhe'))
    return items.some((item) => item.category === 'Schuhe' && item.inLaundry)
      ? 'Passende Schuhe sind in der Wäsche oder fehlen in dieser Auswahl. Markiere ein sauberes Paar als verfügbar oder passe deine Auswahl an.'
      : 'Für diese Auswahl fehlen passende Schuhe. Ergänze ein Paar oder ändere Saison und Anlass.'
  if (!has('Kleider') && !(has('Oberteile') && has('Hosen')))
    return 'Für diese Auswahl brauchst du ein Kleid oder ein Oberteil mit Hose. Ergänze Stücke oder passe deine Auswahl an.'
  return 'In der aktuellen Auswahl gibt es keinen neuen Vorschlag. Du kannst neu kombinieren, Ablehnungen zurücksetzen oder deine Auswahl ändern.'
}

export function generateOutfits(
  items: Garment[],
  options: OutfitOptions,
  preferences: Preferences,
  feedback: OutfitFeedback[],
  seed = 0,
  weather?: WeatherDay,
  wearCounts: Map<string, number> = new Map(),
  history?: RecentWear,
  excluded: ReadonlySet<string> = new Set(),
): OutfitCandidate[] {
  const eligible = eligibleGarments(items, options, weather)
  const compatibility = createCompatibilityScorer(feedback)
  const rejected = new Set(
    feedback
      .filter((entry) => entry.verdict === 'rejected')
      .map((entry) => entry.id),
  )
  const liked = new Set(
    feedback
      .filter((entry) => entry.verdict === 'liked')
      .map((entry) => entry.id),
  )
  const likedItems = new Map<string, number>()
  for (const entry of feedback.filter((entry) => entry.verdict === 'liked')) {
    for (const id of entry.garmentIds)
      likedItems.set(id, Math.min(1.5, (likedItems.get(id) || 0) + 0.3))
  }
  function suitability(item: Garment): number {
    return (
      (item.favorite ? 1.5 : 0) +
      (preferences.colors.includes(item.color) ? 2 : 0) +
      (item.styles.some((style) => preferences.styles.includes(style))
        ? 2
        : 0) +
      (options.style !== 'Alle' && item.styles.includes(options.style)
        ? 3
        : 0) +
      ((options.occasion === 'Büro' || options.occasion === 'Abend') &&
      item.styles.includes('Elegant')
        ? 3
        : 0) +
      (likedItems.get(item.id) || 0) +
      Math.min(1, (wearCounts.get(item.id) ?? 0) * 0.2) -
      recentPiecePenalty(item.id, history)
    )
  }
  // Bounded search: at most 18³ + 18² bases, each with up to 4 layers × 3 accessories.
  // Seeded variation rotates equally suitable pieces into the search window.
  function group(category: string): Garment[] {
    return eligible
      .filter((item) => item.category === category)
      .sort(
        (a, b) =>
          suitability(b) +
            noise(b.id, seed) * 0.75 -
            (suitability(a) + noise(a.id, seed) * 0.75) ||
          a.id.localeCompare(b.id),
      )
      .slice(0, 18)
  }
  const tops = group('Oberteile'),
    bottoms = group('Hosen'),
    shoes = group('Schuhe')
  const dresses = group('Kleider'),
    jackets = group('Jacken'),
    accessories = group('Accessoires')
  const candidates: OutfitCandidate[] = []
  function add(base: Garment[]): void {
    const needsLayer = weather
      ? weather.min < 15
      : options.season === 'Herbst' || options.season === 'Winter'
    // Evaluate accessories and layers together with the base. Keep the best complete
    // version per base, so an unsuitable/random layer cannot hide a better alternative.
    const layers: (Garment | undefined)[] =
      needsLayer && jackets.length ? jackets.slice(0, 4) : [undefined]
    const extras: (Garment | undefined)[] =
      options.includeAccessory && accessories.length
        ? accessories.slice(0, 3)
        : [undefined]
    let winner: { selected: Garment[]; key: string; score: number } | undefined
    for (const layer of layers)
      for (const extra of extras) {
        const selected = [
          ...base,
          ...(layer ? [layer] : []),
          ...(extra ? [extra] : []),
        ]
        const key = outfitKey(selected.map((item) => item.id))
        if (rejected.has(key) || excluded.has(key)) continue
        let score =
          selected.reduce((sum, item) => sum + suitability(item), 0) /
          selected.length
        score += compatibility(selected).score
        if (liked.has(key)) score += 4
        score +=
          noise(key, seed) * 0.35 - recentCombinationPenalty(key, history)
        if (
          !winner ||
          score > winner.score ||
          (score === winner.score && key < winner.key)
        )
          winner = { selected, key, score }
      }
    if (!winner) return
    const { selected, key, score } = winner
    const ids = selected.map((item) => item.id)
    const colors = [
      ...new Set(selected.map((item) => item.color).filter(Boolean)),
    ]
    const accents = colors.filter((color) => !neutral.has(color))
    const reasons = [
      base[0].category === 'Kleider'
        ? 'Kleid und Schuhe bilden die Basis.'
        : 'Oberteil, Hose und Schuhe bilden die Basis.',
    ]
    if (!selected.every((item) => item.color))
      reasons.push(
        'Farbangaben fehlen teilweise; die Harmonie bitte selbst prüfen.',
      )
    else if (accents.length <= 1)
      reasons.push(
        'Neutrale Farben und höchstens ein Farbakzent halten den Look ruhig.',
      )
    else
      reasons.push(
        'Mehrere Farbakzente machen diesen Vorschlag bewusst lebhafter.',
      )
    if (options.style !== 'Alle') {
      const desired = options.style
      const matches = selected.filter((item) =>
        item.styles.some((style) => style === desired),
      ).length
      reasons.push(
        matches
          ? `${matches} Stücke passen laut deinen Angaben zum Stil ${options.style}.`
          : `Für ${options.style} fehlen passende Stilangaben; dies ist eine Alternative.`,
      )
    }
    if (
      selected.some(
        (item) =>
          item.favorite ||
          preferences.colors.includes(item.color) ||
          item.styles.some((style) => preferences.styles.includes(style)),
      )
    )
      reasons.push('Deine Favoriten oder Stilvorlieben wurden berücksichtigt.')
    if (compatibility(selected).sharedStyle)
      reasons.push('Gemeinsame erfasste Stilrichtungen verbinden die Stücke.')
    if (compatibility(selected).familiar)
      reasons.push(
        'Einige dieser Stücke hast du bereits zusammen positiv bewertet.',
      )
    if (liked.has(key))
      reasons.push('Diese Kombination hat dir bereits gefallen.')
    if (selected.some((item) => (wearCounts.get(item.id) ?? 0) > 0))
      reasons.push('Bereits bestätigte Tragetage wurden leicht gewichtet.')
    if (history && (history.pieces.size || history.combinations.size))
      reasons.push(
        history.combinations.has(key)
          ? 'Dieser Look wurde kürzlich getragen. Bei wenig Auswahl kann er erneut erscheinen.'
          : 'Kürzlich getragene Kombinationen und Stücke erhalten weniger Gewicht.',
      )
    if (weather) {
      reasons.push(
        `Vorhersage für ${weather.day}: ${Math.round(weather.min)} bis ${Math.round(weather.max)} °C. Saisonangaben helfen bei der groben Auswahl; Material und Wärme bleiben ungeprüft.`,
      )
      if (weather.rain >= 50)
        reasons.push(
          'Regen ist möglich. Prüfe selbst, ob Schuhe und äussere Schicht wasserfest sind.',
        )
    }
    if (
      options.season !== 'Alle' &&
      selected.some((item) => !item.seasons.length)
    )
      reasons.push('Einige Stücke haben noch keine Saisonangabe.')
    if (
      (weather
        ? weather.min < 15
        : options.season === 'Winter' || options.season === 'Herbst') &&
      !jackets.length
    )
      reasons.push(
        weather
          ? 'Eine passende Jacke fehlt für die kühlere Vorhersage. Prüfe die Wärme selbst.'
          : 'Eine passende Jacke fehlt. Prüfe die Wärme selbst; Wetter ist nicht aktiviert.',
      )
    if (options.includeAccessory && !accessories.length)
      reasons.push('Für diese Auswahl ist kein Accessoire vorhanden.')
    candidates.push({ key, garmentIds: ids, reasons, score })
  }
  for (const shoe of shoes) {
    for (const dress of dresses) add([dress, shoe])
    for (const top of tops)
      for (const bottom of bottoms) add([top, bottom, shoe])
  }
  candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
  const results: OutfitCandidate[] = []
  // Prefer visibly different bases over three looks that only swap a shoe.
  while (candidates.length && results.length < 3) {
    let best = 0,
      bestScore = -Infinity
    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index]
      const overlap = results.length
        ? Math.max(
            ...results.map(
              (result) =>
                candidate.garmentIds.filter((id) =>
                  result.garmentIds.includes(id),
                ).length / candidate.garmentIds.length,
            ),
          )
        : 0
      const score = candidate.score - overlap * 5
      if (score > bestScore) {
        best = index
        bestScore = score
      }
    }
    results.push(candidates.splice(best, 1)[0])
  }
  return results
}
