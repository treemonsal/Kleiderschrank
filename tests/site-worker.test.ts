import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JavaScript worker without types
import { cacheControl, handle, keyFor } from '../server/site-worker/index.js'

const files: Record<string, { body: string; type: string; hash: string }> = {
  '/index.html': { body: '<app>', type: 'text/html', hash: 'a1' },
  '/datenschutz.html': { body: '<ds>', type: 'text/html', hash: 'b2' },
  '/assets/app-1.js': { body: 'js', type: 'text/javascript', hash: 'c3' },
}
const env = {
  SITE: {
    async getWithMetadata(key: string) {
      const file = files[key]
      return file
        ? {
            value: new TextEncoder().encode(file.body).buffer,
            metadata: { type: file.type, hash: file.hash },
          }
        : { value: null, metadata: null }
    },
  },
}
const get = (path: string, headers: Record<string, string> = {}) =>
  handle(new Request(`https://mystyle.test${path}`, { headers }), env)

describe('Website-Worker', () => {
  it('liefert die App, saubere Adressen und Dateien mit Typ', async () => {
    expect(await (await get('/')).text()).toBe('<app>')
    expect(await (await get('/datenschutz')).text()).toBe('<ds>')
    expect(await (await get('/irgendwo')).text()).toBe('<app>')
    const js = await get('/assets/app-1.js')
    expect(js.headers.get('Content-Type')).toBe('text/javascript')
    expect(js.headers.get('Cache-Control')).toContain('immutable')
  })

  it('meldet fehlende Dateien mit Endung als nicht gefunden', async () => {
    expect((await get('/assets/fehlt.js')).status).toBe(404)
  })

  it('beantwortet unveränderte Dateien mit 304 und erlaubt nur Lesen', async () => {
    expect((await get('/', { 'If-None-Match': '"a1"' })).status).toBe(304)
    const post = await handle(
      new Request('https://mystyle.test/', { method: 'POST' }),
      env,
    )
    expect(post.status).toBe(405)
  })

  it('hält App-Hülle und Service Worker frisch', () => {
    expect(keyFor('/')).toBe('/index.html')
    expect(cacheControl('/index.html')).toBe('no-cache')
    expect(cacheControl('/sw.js')).toBe('no-cache')
    expect(cacheControl('/icon-192.png')).toBe('public, max-age=3600')
  })
})
