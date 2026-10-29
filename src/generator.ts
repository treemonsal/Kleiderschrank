import { localDay } from './calendar'
import {
  occasionItemScore,
  occasionLookScore,
  patternHarmony,
  seasonFor,
  seasonScore,
  wornTogetherScore,
} from './styling-rules'
import {
  acceptsRefinement,
  refinementChanges,
  validRefinement,
  type OutfitRefinement,
} from './refinement-model'
import type { Garment } from './model'
import {
  createPersonalizationScorer,
  feedbackForOccasion,
} from './personalization'
import { createCompatibilityScorer } from './outfit-compatibility'
import {
  recentPiecePenalty,
  recentCombinationPenalty,
  type RecentWear,
} from './wear-history'
import type { WeatherDay } from './weather'
import {
  outfitKey,
  isCompleteOutfit,
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
/** Perceived temperature shift: people who feel cold need layers earlier. */
export function comfortOffset(comfort: Preferences['comfort']): number {
  return comfort === 'cold' ? -4 : comfort === 'warm' ? 3 : 0
}
export function eligibleGarments(
  items: Garment[],
  options: OutfitOptions,
  weather?: WeatherDay,
  offset = 0,
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
        ((weather.max + offset <= 10 &&
          item.seasons.every((season) => season === 'Sommer')) ||
          (weather.min + offset >= 18 &&
            weather.max + offset >= 25 &&
            item.seasons.every((season) => season === 'Winter')))
      ),
  )
}
export function missingOutfitMessage(
  items: Garment[],
  options: OutfitOptions,
  weather?: WeatherDay,
  offset = 0,
): string {
  const eligible = eligibleGarments(items, options, weather, offset)
  const has = (category: string) =>
    eligible.some((item) => item.category === category)
  if (!has('Schuhe'))
    return items.some((item) => item.category === 'Schuhe' && item.inLaundry)
      ? 'Passende Schuhe liegen in der Wäsche. Nimm ein sauberes Paar aus der Wäsche oder ergänze eines.'
      : 'Für diese Auswahl fehlen passende Schuhe. Ergänze ein Paar in der Garderobe.'
  if (!has('Kleider') && !(has('Oberteile') && has('Hosen')))
    return 'Für diese Auswahl brauchst du ein Kleid oder ein Oberteil mit Hose. Ergänze Stücke in der Garderobe.'
  return 'Gerade gibt es keinen neuen Vorschlag. Versuche einen anderen Anlass oder nimm Ablehnungen im Stilprofil zurück.'
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
  refinement?: OutfitRefinement,
): OutfitCandidate[] {
  if (refinement && !validRefinement(items, refinement)) return []
  const offset = comfortOffset(preferences.comfort)
  const eligible = eligibleGarments(items, options, weather, offset)
  const refinementOriginal = refinement
    ? items.filter((item) => refinement.currentIds.includes(item.id))
    : []
  const eligibleIds = refinement
    ? new Set(eligible.map((item) => item.id))
    : undefined
  feedback = feedbackForOccasion(feedback, options.occasion)
  const personal = createPersonalizationScorer(items, preferences, feedback)
  const profile =
    preferences.styleProfile?.status === 'completed'
      ? preferences.styleProfile
      : undefined
  const variety = profile?.variety ?? 'balanced'
  const compatibility = createCompatibilityScorer(feedback)
  // Compared by combination: an entry's id also names its occasion.
  const rejected = new Set(
    feedback
      .filter((entry) => entry.verdict === 'rejected')
      .map((entry) => outfitKey(entry.garmentIds)),
  )
  const liked = new Set(
    feedback
      .filter((entry) => entry.verdict === 'liked')
      .map((entry) => outfitKey(entry.garmentIds)),
  )
  const likedItems = new Map<string, number>()
  for (const entry of feedback.filter((entry) => entry.verdict === 'liked')) {
    for (const id of entry.garmentIds)
      likedItems.set(id, Math.min(1.5, (likedItems.get(id) || 0) + 0.3))
  }
  const season = seasonFor(history?.day ?? weather?.day ?? localDay(), weather)
  const suitabilityCache = new Map<string, number>()
  function suitability(item: Garment): number {
    const cached = suitabilityCache.get(item.id)
    if (cached !== undefined) return cached
    const value =
      (item.favorite ? 1.5 : 0) +
      (preferences.colors.includes(item.color) ? 2 : 0) +
      (item.styles.some((style) => preferences.styles.includes(style))
        ? 2
        : 0) +
      (options.style !== 'Alle' && item.styles.includes(options.style)
        ? 3
        : 0) +
      occasionItemScore(item, options.occasion) +
      seasonScore(item, season) +
      (likedItems.get(item.id) || 0) +
      personal.itemScore(item) +
      Math.min(1, (wearCounts.get(item.id) ?? 0) * 0.2) -
      recentPiecePenalty(item.id, history) *
        (variety === 'familiar' ? 0.5 : variety === 'explore' ? 1.5 : 1)
    suitabilityCache.set(item.id, value)
    return value
  }
  // Rank the whole wardrobe, then evaluate a preferred window first. A lazy
  // fallback below can still reach lower-ranked pieces after repeated rejections.
  function group(category: string): Garment[] {
    const locked = refinement?.lockedIds.find((id) =>
      items.some((item) => item.id === id && item.category === category),
    )
    return eligible
      .filter(
        (item) => item.category === category && (!locked || item.id === locked),
      )
      .sort(
        (a, b) =>
          suitability(b) +
            (refinement?.currentIds.includes(b.id) ? 1000 : 0) +
            noise(b.id, seed) * 0.75 -
            (suitability(a) +
              (refinement?.currentIds.includes(a.id) ? 1000 : 0) +
              noise(a.id, seed) * 0.75) || a.id.localeCompare(b.id),
      )
  }
  const tops = group('Oberteile'),
    bottoms = group('Hosen'),
    shoes = group('Schuhe')
  const dresses = group('Kleider'),
    jackets = group('Jacken'),
    accessories = group('Accessoires')
  const candidates: OutfitCandidate[] = []
  const evaluatedBases = new Set<string>()
  function add(base: Garment[]): void {
    const baseKey = outfitKey(base.map((item) => item.id))
    if (evaluatedBases.has(baseKey)) return
    evaluatedBases.add(baseKey)
    const needsLayer =
      refinement?.intent === 'warmer' ||
      refinement?.lockedIds.some((id) =>
        items.some((item) => item.id === id && item.category === 'Jacken'),
      ) ||
      (weather
        ? weather.min + offset < 15
        : options.season === 'Herbst' || options.season === 'Winter')
    // Evaluate accessories and layers together with the base. Keep the best complete
    // version per base, so an unsuitable/random layer cannot hide a better alternative.
    const layers: (Garment | undefined)[] =
      needsLayer && jackets.length ? jackets : [undefined]
    const extras: (Garment | undefined)[] =
      options.includeAccessory && accessories.length ? accessories : [undefined]
    let winner: { selected: Garment[]; key: string; score: number } | undefined
    function consider(layer: Garment | undefined, extra: Garment | undefined) {
      const selected = [
        ...base,
        ...(layer ? [layer] : []),
        ...(extra ? [extra] : []),
      ]
      if (
        refinement &&
        (!selected.every((item) => eligibleIds!.has(item.id)) ||
          !isCompleteOutfit(selected) ||
          !acceptsRefinement(refinementOriginal, selected, refinement))
      )
        return
      const key = outfitKey(selected.map((item) => item.id))
      if (rejected.has(key) || excluded.has(key)) return
      let score =
        selected.reduce((sum, item) => sum + suitability(item), 0) /
        selected.length
      score += compatibility(selected).score
      score += personal.lookScore(selected)
      score += occasionLookScore(selected, options.occasion).score
      score += patternHarmony(selected).score
      score += wornTogetherScore(selected, history?.together)
      if (liked.has(key)) score += 4
      score +=
        noise(key, seed) * (variety === 'explore' ? 0.8 : 0.35) -
        recentCombinationPenalty(key, history) *
          (variety === 'familiar' ? 0.5 : variety === 'explore' ? 1.5 : 1)
      // All normal score terms together stay below 100. Prefer the fewest
      // edits among variants that actually fulfil the requested change.
      if (refinement) score -= refinementChanges(selected, refinement) * 100
      return { selected, key, score }
    }
    for (const layer of layers.slice(0, 4))
      for (const extra of extras.slice(0, 3)) {
        const candidate = consider(layer, extra)
        if (
          candidate &&
          (!winner ||
            candidate.score > winner.score ||
            (candidate.score === winner.score && candidate.key < winner.key))
        )
          winner = candidate
      }
    if (!winner && (layers.length > 4 || extras.length > 3)) {
      // A distinct blocked key belongs to exactly one base. Searching until the
      // first valid extension costs at most the blocked extensions plus one;
      // it does not materialize the potentially large layer/accessory product.
      extensions: for (const layer of layers)
        for (const extra of extras) {
          winner = consider(layer, extra)
          if (winner) break extensions
        }
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
    if (profile)
      reasons.push(
        `Dein Stilprofil berücksichtigt ${profile.colorMood === 'neutral' ? 'ruhige Farben' : profile.colorMood === 'colorful' ? 'mehr Farbakzente' : 'eine ausgewogene Farbwahl'} und ${variety === 'familiar' ? 'vertraute Looks' : variety === 'explore' ? 'mehr Abwechslung' : 'eine Mischung aus Vertrautem und Neuem'}.`,
      )
    if (selected.some((item) => profile?.avoidColors.includes(item.color)))
      reasons.push(
        'Eine Farbe, die du seltener möchtest, ist hier enthalten. Sie wird schwächer gewichtet, bleibt bei wenig Auswahl aber möglich.',
      )
    if (personal.observations)
      reasons.push(
        'Deine Outfitbewertungen beeinflussen ähnliche erfasste Stilrichtungen und Farbkombinationen. Einzelne Bewertungen sind nur schwache Hinweise.',
      )
    if (personal.summary.colorfulness)
      reasons.push(
        'Dein Feedback „Zu auffällig“ gewichtet weniger erfasste Farbakzente stärker.',
      )
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
    const fit = compatibility(selected)
    const dressCode = occasionLookScore(selected, options.occasion)
    if (dressCode.note) reasons.push(dressCode.note)
    const pattern = patternHarmony(selected)
    if (pattern.note) reasons.push(pattern.note)
    if (selected.some((item) => seasonScore(item, season) > 0))
      reasons.push(`Stücke für ${season} sind bevorzugt.`)
    if (wornTogetherScore(selected, history?.together) > 0)
      reasons.push('Einige dieser Stücke hast du schon zusammen getragen.')
    if (fit.colorNote) reasons.push(fit.colorNote)
    if (fit.styleNote) reasons.push(fit.styleNote)
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
    if (fit.sharedStyle)
      reasons.push('Gemeinsame erfasste Stilrichtungen verbinden die Stücke.')
    if (fit.familiar)
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
        `Vorhersage: ${Math.round(weather.min)} bis ${Math.round(weather.max)} °C. Saisonangaben helfen bei der groben Auswahl; Material und Wärme bleiben ungeprüft.`,
      )
      if (offset)
        reasons.push(
          offset < 0
            ? 'Du frierst schnell: Schichten kommen früher dazu.'
            : 'Dir ist schnell warm: Schichten kommen später dazu.',
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
        ? weather.min + offset < 15
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
  if (refinement) {
    // Search every single-base-piece edit before the usual ranked window, even
    // for a low-ranked piece beyond its first 18. Current layers/extras sort first.
    const base = items
      .filter(
        (item) =>
          refinement.currentIds.includes(item.id) &&
          item.category !== 'Jacken' &&
          item.category !== 'Accessoires',
      )
      .sort(
        (a, b) =>
          (a.category === 'Schuhe' ? 2 : a.category === 'Hosen' ? 1 : 0) -
          (b.category === 'Schuhe' ? 2 : b.category === 'Hosen' ? 1 : 0),
      )
    add(base)
    for (const piece of base)
      for (const replacement of group(piece.category))
        add(base.map((item) => (item.id === piece.id ? replacement : item)))
  }
  // Main ranking costs at most 18³ + 18² bases, each with 4 × 3 extensions.
  for (const shoe of shoes.slice(0, 18)) {
    for (const dress of dresses.slice(0, 18)) add([dress, shoe])
    for (const top of tops.slice(0, 18))
      for (const bottom of bottoms.slice(0, 18)) add([top, bottom, shoe])
  }
  if (candidates.length < 3) {
    // Never claim the wardrobe is exhausted merely because its favourite first
    // 18 pieces were rejected. Stop after three feasible bases; every skipped
    // new base needs a distinct blocked combination (feedback is capped at 1000).
    remaining: for (const shoe of shoes) {
      for (const dress of dresses) {
        add([dress, shoe])
        if (candidates.length >= 3) break remaining
      }
      for (const top of tops)
        for (const bottom of bottoms) {
          add([top, bottom, shoe])
          if (candidates.length >= 3) break remaining
        }
    }
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
      const score =
        candidate.score -
        overlap * (variety === 'familiar' ? 3 : variety === 'explore' ? 8 : 5)
      if (score > bestScore) {
        best = index
        bestScore = score
      }
    }
    results.push(candidates.splice(best, 1)[0])
  }
  return results
}
