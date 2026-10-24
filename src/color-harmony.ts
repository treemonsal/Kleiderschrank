import type { Garment, Style } from './model'

// Classic styling rules for the recorded color names. They are transparent
// heuristics for named colors only; real shades, patterns and fabrics are unknown.
const NEUTRALS = new Set(['Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun'])

const pair = (a: string, b: string) => [a, b].sort().join('+')
const ACCENT_PAIRS: Record<string, [number, string]> = {
  [pair('Blau', 'Rosa')]: [1, 'Blau und Rosa ergeben einen weichen Kontrast.'],
  [pair('Blau', 'Gelb')]: [
    0.75,
    'Blau und Gelb sind ein klassischer Gegensatz.',
  ],
  [pair('Blau', 'Rot')]: [0.5, 'Blau und Rot wirken klassisch, fast maritim.'],
  [pair('Blau', 'Grün')]: [
    0.5,
    'Blau und Grün liegen im Farbkreis nebeneinander.',
  ],
  [pair('Blau', 'Violett')]: [
    0.5,
    'Blau und Violett bilden einen ruhigen Verlauf.',
  ],
  [pair('Grün', 'Rosa')]: [0.5, 'Grün und Rosa ergänzen sich frisch.'],
  [pair('Rosa', 'Violett')]: [
    0.25,
    'Rosa und Violett bleiben in einer Farbfamilie.',
  ],
  [pair('Grün', 'Gelb')]: [0, ''],
  [pair('Rosa', 'Gelb')]: [0, ''],
  [pair('Rot', 'Gelb')]: [-0.5, 'Rot und Gelb zusammen wirken sehr laut.'],
  [pair('Gelb', 'Violett')]: [
    -0.75,
    'Gelb und Violett zusammen wirken sehr laut.',
  ],
  [pair('Rot', 'Rosa')]: [-1, 'Rot und Rosa beissen sich oft.'],
  [pair('Rot', 'Violett')]: [-1, 'Rot und Violett beissen sich oft.'],
  [pair('Grün', 'Violett')]: [-1, 'Grün und Violett beissen sich oft.'],
  [pair('Rot', 'Grün')]: [
    -1.5,
    'Rot und Grün zusammen wirken schnell weihnachtlich.',
  ],
}
const NEUTRAL_PAIRS: Record<string, [number, string]> = {
  [pair('Schwarz', 'Weiss')]: [
    0.5,
    'Schwarz und Weiss bilden einen klaren Kontrast.',
  ],
  [pair('Beige', 'Weiss')]: [0.25, ''],
  [pair('Braun', 'Beige')]: [0.25, ''],
  [pair('Schwarz', 'Braun')]: [
    -0.5,
    'Schwarz und Braun sind ein umstrittener Mix.',
  ],
}

// Rough dress code per recorded style: elegant pieces sit high, sporty low.
const FORMALITY: Record<Style, number> = {
  Elegant: 2,
  Minimalistisch: 1,
  Vintage: 0.5,
  Casual: 0,
  Streetwear: -1,
  Sportlich: -2,
}

/** Jeans and other blue trousers count as a neutral base in everyday styling. */
export function effectiveColor(item: Pick<Garment, 'category' | 'color'>) {
  return item.category === 'Hosen' && item.color === 'Blau'
    ? 'Denim'
    : item.color
}
const isNeutral = (color: string) => NEUTRALS.has(color) || color === 'Denim'

export interface Harmony {
  score: number
  note?: string
}

export function colorHarmony(
  items: Pick<Garment, 'category' | 'color'>[],
): Harmony {
  const colors = items.map(effectiveColor).filter(Boolean)
  if (colors.length < 2) return { score: 0 }
  const unique = [...new Set(colors)]
  const accents = unique.filter((color) => !isNeutral(color))
  let score = 0
  let note: [number, string] | undefined
  const remember = (entry: [number, string]) => {
    if (entry[1] && (!note || Math.abs(entry[0]) > Math.abs(note[0])))
      note = entry
  }
  if (accents.includes('Bunt') && accents.length > 1) {
    score -= 1.5
    remember([-1.5, 'Ein buntes Stück verträgt kaum weitere Farbakzente.'])
  }
  for (let i = 0; i < accents.length; i++)
    for (let j = i + 1; j < accents.length; j++) {
      const entry = ACCENT_PAIRS[pair(accents[i], accents[j])]
      if (!entry) continue
      score += entry[0]
      remember(entry)
    }
  const neutrals = unique.filter((color) => NEUTRALS.has(color))
  for (let i = 0; i < neutrals.length; i++)
    for (let j = i + 1; j < neutrals.length; j++) {
      const entry = NEUTRAL_PAIRS[pair(neutrals[i], neutrals[j])]
      if (!entry) continue
      score += entry[0]
      remember(entry)
    }
  if (unique.length === 1 && colors.length >= 3) {
    score += 0.5
    remember([0.5, 'Ton in Ton wirkt ruhig und durchdacht.'])
  } else if (accents.length === 1 && unique.length >= 2) {
    score += 0.5
  }
  return { score, note: note?.[1] }
}

export function styleCoherence(items: Pick<Garment, 'styles'>[]): Harmony {
  const levels = items
    .filter((item) => item.styles.length)
    .map(
      (item) =>
        item.styles.reduce((sum, style) => sum + FORMALITY[style], 0) /
        item.styles.length,
    )
  if (levels.length < 2) return { score: 0 }
  const spread = Math.max(...levels) - Math.min(...levels)
  if (spread >= 3.5)
    return {
      score: -1.5,
      note: 'Sehr sportliche und sehr elegante Stücke treffen aufeinander.',
    }
  if (spread <= 1) return { score: 0.5 }
  return { score: 0 }
}
