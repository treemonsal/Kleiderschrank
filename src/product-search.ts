import type { Category } from './model'
import {
  nearestWardrobeColor,
  samplePhotoColor,
  type PhotoPixels,
} from './photo-color'

/*
 * Online search for clothes (0.40.0). The app asks MyStyle's own small
 * Cloudflare Worker (server/search-worker), which keeps the SerpApi key
 * secret and loads the chosen product image. Without a configured address
 * the feature stays hidden.
 */
export const PUBLIC_SEARCH_URL = 'https://mystyle-suche.hahntim518.workers.dev'

export function searchEndpoint(): string {
  const override = (
    globalThis as unknown as { __MYSTYLE_SEARCH_URL__?: string }
  ).__MYSTYLE_SEARCH_URL__
  return (
    override ??
    (import.meta.env.VITE_SEARCH_URL || PUBLIC_SEARCH_URL)
  ).replace(/\/+$/, '')
}

/** The colour most of the centre shows; product photos put the piece there. */
export function dominantColor(pixels: PhotoPixels): string {
  const votes = new Map<string, number>()
  for (const [x, y] of [
    [50, 50],
    [50, 38],
    [50, 62],
    [40, 50],
    [60, 50],
    [45, 44],
    [55, 56],
  ]) {
    const rgb = samplePhotoColor(pixels, x, y)
    if (!rgb) continue
    const name = nearestWardrobeColor(rgb).name
    votes.set(name, (votes.get(name) ?? 0) + 1)
  }
  return [...votes].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

export interface ProductResult {
  title: string
  source: string
  thumbnail: string
  image: string
}

export const POPULAR_SEARCHES = [
  "Levi's 501",
  'Nike Air Force 1',
  'Adidas Samba',
  'Weisses T-Shirt',
  'Carhartt Hoodie',
  'Schwarze Jeans',
  'Ralph Lauren Pullover',
  'New Balance 550',
  'Uniqlo Daunenjacke',
  'Zara Hemd',
]

const https = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('https://')

/** Accepts only the worker's documented shape; anything else is dropped. */
export function parseResults(value: unknown): ProductResult[] {
  const list = (value as { results?: unknown } | null)?.results
  if (!Array.isArray(list)) return []
  return list
    .filter(
      (item): item is ProductResult =>
        !!item &&
        typeof item === 'object' &&
        https((item as ProductResult).thumbnail) &&
        https((item as ProductResult).image),
    )
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      source: typeof item.source === 'string' ? item.source : '',
      thumbnail: item.thumbnail,
      image: item.image,
    }))
}

const SHOP_NOISE =
  /\s*[|–—-]\s*(zalando|about you|asos|h&m|zara|amazon|galaxus|manor|globus|ochsner|snipes|jelmoli|online kaufen|kaufen|shop|online|herren|damen|men|women|unisex|sale)\b.*$/i

/** A shop title becomes a short piece name. */
export function cleanTitle(title: string, query = ''): string {
  let name = title
    .replace(/\s+/g, ' ')
    .replace(/\((?:[^)]*)\)/g, '')
    .replace(SHOP_NOISE, '')
    .replace(/\s+[|–—]\s+.*$/, '')
    .replace(/\b(herren|damen|men's|women's|unisex|online kaufen)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!name) name = query.trim()
  if (name.length > 48) name = `${name.slice(0, 47).replace(/\s+\S*$/, '')}…`
  return name
}

// German stems also match inside compounds (Daunenjacke, Kapuzenpullover);
// English words need whole words. Order matters: Handschuhe are not shoes,
// a Jeansjacke is a jacket, a Hemdkleid a dress.
const CATEGORY_WORDS: [Category, RegExp][] = [
  [
    'Accessoires',
    /(tasche|handschuh|sonnenbrille|mütze|gürtel|schal\b|rucksack|halskette|uhr\b)|\b(bag|watch|cap|beanie|hut|hat|scarf|belt|sunglasses|necklace|ring|backpack|gloves)\b/i,
  ],
  [
    'Schuhe',
    /(schuh|stiefel|sandale|turnschuh)|\b(sneakers?|boots?|loafers?|pumps|trainers?|air force|samba|gazelle|stan smith|550|990|chuck|vans|derby)\b/i,
  ],
  [
    'Jacken',
    /(jacke|mantel|parka|weste|daunen)|\b(jacket|coat|blazer|puffer|windbreaker|gilet|bomber|trench)\b/i,
  ],
  ['Kleider', /(kleid|rock\b)|\b(dress|jumpsuit|overall|skirt)\b/i],
  [
    'Hosen',
    /(hose|jeans|chino)|\b(pants|trousers|shorts|jogger|leggings|cargo|501|culotte)\b/i,
  ],
  [
    'Oberteile',
    /(shirt|hemd|bluse|pullover|pulli|strick|kapuzen)|\b(sweater|hoodie|knit|top|polo|longsleeve|cardigan|tanktop|crewneck)\b/i,
  ],
]

/** The first category whose words appear in title or query, else none. */
export function guessCategory(title: string, query = ''): Category | undefined {
  const text = `${title} ${query}`
  return CATEGORY_WORDS.find(([, words]) => words.test(text))?.[0]
}

const BRANDS = [
  "Levi's",
  'Nike',
  'Adidas',
  'Puma',
  'New Balance',
  'Converse',
  'Vans',
  'Carhartt',
  'Ralph Lauren',
  'Tommy Hilfiger',
  'Calvin Klein',
  'Lacoste',
  'Uniqlo',
  'Zara',
  'H&M',
  'COS',
  'Arket',
  'Mango',
  'Massimo Dutti',
  'The North Face',
  'Patagonia',
  "Arc'teryx",
  'Stone Island',
  'Diesel',
  'Hugo Boss',
  'Boss',
  'Jack & Jones',
  'Dr. Martens',
  'Birkenstock',
  'Salomon',
  'On',
  'Asics',
  'Veja',
]

/** A well-known brand named in the title; never guessed beyond that list. */
export function guessBrand(title: string): string {
  const lower = ` ${title.toLowerCase()} `
  return (
    BRANDS.find((brand) =>
      new RegExp(
        `[\\s(]${brand.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s,)']`,
      ).test(lower),
    ) ?? ''
  )
}

export class SearchError extends Error {}

export async function searchProducts(
  query: string,
  signal: AbortSignal,
  base = searchEndpoint(),
): Promise<ProductResult[]> {
  const response = await fetch(
    `${base}/search?${new URLSearchParams({ q: query.trim() })}`,
    { signal },
  ).catch((error: unknown) => {
    if (signal.aborted) throw error
    throw new SearchError(
      'Die Suche ist gerade nicht erreichbar. Prüfe die Internetverbindung.',
    )
  })
  if (response.status === 429)
    throw new SearchError(
      'Das Suchkontingent für diesen Monat ist aufgebraucht. Fotos von Hand gehen weiterhin.',
    )
  if (!response.ok)
    throw new SearchError('Die Suche hat nicht geklappt. Versuche es nochmals.')
  return parseResults(await response.json())
}

export async function fetchProductImage(
  url: string,
  signal: AbortSignal,
  base = searchEndpoint(),
): Promise<Blob> {
  const response = await fetch(
    `${base}/image?${new URLSearchParams({ url })}`,
    { signal },
  ).catch((error: unknown) => {
    if (signal.aborted) throw error
    throw new SearchError('Das Bild konnte nicht geladen werden.')
  })
  const blob = response.ok ? await response.blob() : undefined
  if (!blob || !blob.type.startsWith('image/'))
    throw new SearchError(
      'Dieses Bild lässt der Shop nicht laden. Wähle ein anderes.',
    )
  return blob
}
