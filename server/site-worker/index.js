/**
 * MyStyle on Cloudflare: serves the built app (dist/) from Workers KV.
 * Free plan, no repository connection needed. Files are written by
 * server/site-worker/deploy.py; each key is the path (e.g. "/index.html"),
 * the content type sits in the key's metadata.
 */

const NO_CACHE = new Set(['/index.html', '/sw.js', '/manifest.webmanifest'])

/** Map a request path to the stored file. Unknown page paths get the app. */
export function keyFor(pathname) {
  let path = decodeURIComponent(pathname)
  if (path.endsWith('/')) path += 'index.html'
  return path
}

export function cacheControl(key) {
  if (NO_CACHE.has(key) || key.endsWith('.html')) return 'no-cache'
  if (key.startsWith('/assets/')) return 'public, max-age=31536000, immutable'
  return 'public, max-age=3600'
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

export async function handle(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response('Methode nicht erlaubt', { status: 405 })
  const url = new URL(request.url)
  let key = keyFor(url.pathname)
  let found = await env.SITE.getWithMetadata(key, 'arrayBuffer')
  if (!found.value && !key.split('/').pop().includes('.')) {
    // Clean URLs: /datenschutz → /datenschutz.html, otherwise the app.
    found = await env.SITE.getWithMetadata(`${key}.html`, 'arrayBuffer')
    if (found.value) key = `${key}.html`
    else {
      key = '/index.html'
      found = await env.SITE.getWithMetadata(key, 'arrayBuffer')
    }
  }
  if (!found.value) return new Response('Nicht gefunden', { status: 404 })
  const headers = new Headers({
    ...SECURITY_HEADERS,
    'Content-Type': found.metadata?.type ?? 'application/octet-stream',
    'Cache-Control': cacheControl(key),
  })
  if (found.metadata?.hash) headers.set('ETag', `"${found.metadata.hash}"`)
  if (
    found.metadata?.hash &&
    request.headers.get('If-None-Match') === `"${found.metadata.hash}"`
  )
    return new Response(null, { status: 304, headers })
  return new Response(request.method === 'HEAD' ? null : found.value, {
    headers,
  })
}

export default { fetch: handle }
