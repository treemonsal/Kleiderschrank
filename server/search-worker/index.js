/*
 * MyStyle product search (Cloudflare Worker, free plan).
 *
 * Keeps the SerpApi key secret (secret SERPAPI_KEY), searches Google Images
 * for clothing (Switzerland, German) and loads a chosen product image for the
 * app, which cannot read other sites' images itself. Only MyStyle's own
 * origins may call it. Results are cached for a day so the free plan's 250
 * searches a month last. Nothing about the person is stored.
 */
export const ALLOWED_ORIGINS = [
  'https://mystyle.hahntim518.workers.dev',
  'http://localhost:5173',
  'http://127.0.0.1:4173',
]
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_RESULTS = 24

function headers(origin, extra = {}) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    ...extra,
  }
}
function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: headers(origin, { 'Content-Type': 'application/json' }),
  })
}

/** Keeps only what the app shows; drops anything that is not https. */
export function toResults(data) {
  const images = Array.isArray(data?.images_results) ? data.images_results : []
  return images
    .filter(
      (item) =>
        typeof item?.original === 'string' &&
        item.original.startsWith('https://') &&
        typeof item?.thumbnail === 'string' &&
        item.thumbnail.startsWith('https://'),
    )
    .slice(0, MAX_RESULTS)
    .map((item) => ({
      title: String(item.title ?? '').slice(0, 140),
      source: String(item.source ?? '').slice(0, 60),
      thumbnail: item.thumbnail,
      image: item.original,
    }))
}

/** Public https addresses only: no local names or raw IP addresses. */
export function allowedImageUrl(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    url.hostname.includes('.') &&
    !/^[\d.]+$/.test(url.hostname) &&
    !url.hostname.includes(':') &&
    !/(^|\.)(localhost|local|internal)$/.test(url.hostname)
  )
}

async function search(query, env, origin, fetcher) {
  const cacheKey = new Request(
    `https://mystyle-search.cache/${encodeURIComponent(query.toLowerCase())}`,
  )
  const cache = typeof caches === 'undefined' ? undefined : caches.default
  const cached = await cache?.match(cacheKey)
  if (cached) return json(await cached.json(), 200, origin)
  const api = new URL('https://serpapi.com/search.json')
  api.search = new URLSearchParams({
    engine: 'google_images',
    q: query,
    gl: 'ch',
    hl: 'de',
    safe: 'active',
    api_key: env.SERPAPI_KEY,
  }).toString()
  const response = await fetcher(api)
  if (response.status === 429) return json({ error: 'limit' }, 429, origin)
  if (!response.ok) return json({ error: 'search' }, 502, origin)
  const body = { results: toResults(await response.json()) }
  await cache?.put(
    cacheKey,
    new Response(JSON.stringify(body), {
      headers: { 'Cache-Control': 'max-age=86400' },
    }),
  )
  return json(body, 200, origin)
}

async function image(target, origin, fetcher) {
  if (!allowedImageUrl(target)) return json({ error: 'url' }, 400, origin)
  const response = await fetcher(target, {
    headers: { Accept: 'image/*' },
    redirect: 'follow',
  })
  const type = response.headers.get('Content-Type') ?? ''
  if (!response.ok || !/^image\/(jpeg|png|webp|avif|gif)/.test(type))
    return json({ error: 'image' }, 502, origin)
  const length = Number(response.headers.get('Content-Length') ?? 0)
  if (length > MAX_IMAGE_BYTES) return json({ error: 'size' }, 413, origin)
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_IMAGE_BYTES)
    return json({ error: 'size' }, 413, origin)
  return new Response(bytes, {
    headers: headers(origin, {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=3600',
    }),
  })
}

export async function handle(request, env, fetcher = fetch) {
  const origin = request.headers.get('Origin') ?? ''
  if (!ALLOWED_ORIGINS.includes(origin))
    return new Response('Forbidden', { status: 403 })
  if (request.method === 'OPTIONS')
    return new Response(null, { headers: headers(origin) })
  if (request.method !== 'GET') return json({ error: 'method' }, 405, origin)
  if (!env.SERPAPI_KEY) return json({ error: 'setup' }, 503, origin)
  const url = new URL(request.url)
  try {
    if (url.pathname === '/search') {
      const query = (url.searchParams.get('q') ?? '').trim()
      if (query.length < 2 || query.length > 80)
        return json({ error: 'query' }, 400, origin)
      return await search(query, env, origin, fetcher)
    }
    if (url.pathname === '/image')
      return await image(url.searchParams.get('url') ?? '', origin, fetcher)
  } catch {
    return json({ error: 'upstream' }, 502, origin)
  }
  return json({ error: 'path' }, 404, origin)
}

export default { fetch: (request, env) => handle(request, env) }
