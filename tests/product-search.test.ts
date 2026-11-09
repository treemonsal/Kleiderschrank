import { describe, expect, it } from 'vitest'
import {
  cleanTitle,
  dominantColor,
  guessBrand,
  guessCategory,
  parseResults,
} from '../src/product-search'
// @ts-expect-error plain JavaScript worker without type declarations
import {
  allowedImageUrl,
  handle,
  toResults,
} from '../server/search-worker/index.js'

describe('Produktsuche in der App', () => {
  it('kürzt Shop-Titel zu einem Stücknamen', () => {
    expect(cleanTitle("Levi's 501 Original Jeans | Zalando")).toBe(
      "Levi's 501 Original Jeans",
    )
    expect(cleanTitle("Air Force 1 '07 - Herren Sneaker online kaufen")).toBe(
      "Air Force 1 '07",
    )
    expect(cleanTitle('', 'Weisses T-Shirt')).toBe('Weisses T-Shirt')
    expect(cleanTitle("Nike Air Force 1 '07 Herren Sneaker")).toBe(
      "Nike Air Force 1 '07 Sneaker",
    )
    expect(cleanTitle('a '.repeat(60)).length).toBeLessThanOrEqual(48)
  })

  it('erkennt die Kategorie aus Titel oder Suche und rät sonst nicht', () => {
    expect(guessCategory('Nike Air Force 1')).toBe('Schuhe')
    expect(guessCategory("Levi's 501 Original")).toBe('Hosen')
    expect(guessCategory('Carhartt WIP Hoodie')).toBe('Oberteile')
    expect(guessCategory('Uniqlo Daunenjacke')).toBe('Jacken')
    expect(guessCategory('Midi Kleid Satin')).toBe('Kleider')
    expect(guessCategory('Lederuhr braun')).toBe('Accessoires')
    expect(guessCategory('Produkt 123', 'schwarze Jeans')).toBe('Hosen')
    expect(guessCategory('Leder Handschuhe')).toBe('Accessoires')
    expect(guessCategory('Vintage Jeansjacke')).toBe('Jacken')
    expect(guessCategory('Hemdkleid Leinen')).toBe('Kleider')
    expect(guessCategory('Kapuzenpullover grau')).toBe('Oberteile')
    expect(guessCategory('Produkt 123')).toBeUndefined()
  })

  it('nennt nur bekannte Marken', () => {
    expect(guessBrand('Nike Air Force 1')).toBe('Nike')
    expect(guessBrand("Levi's 501 Original")).toBe("Levi's")
    expect(guessBrand('Schwarze Jeans slim')).toBe('')
  })

  it('übernimmt nur https-Ergebnisse in der erwarteten Form', () => {
    expect(
      parseResults({
        results: [
          {
            title: 'A',
            source: 'S',
            thumbnail: 'https://t/1',
            image: 'https://i/1',
          },
          { title: 'B', thumbnail: 'http://t/2', image: 'https://i/2' },
          'kaputt',
        ],
      }),
    ).toEqual([
      {
        title: 'A',
        source: 'S',
        thumbnail: 'https://t/1',
        image: 'https://i/1',
      },
    ])
    expect(parseResults(null)).toEqual([])
  })

  it('liest die Farbe aus der Bildmitte, nicht vom weissen Rand', () => {
    const width = 20,
      height = 20
    const data = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4
        const centre = x > 4 && x < 15 && y > 4 && y < 15
        data.set(centre ? [40, 70, 130, 255] : [255, 255, 255, 255], i)
      }
    expect(dominantColor({ width, height, data } as never)).toBe('Blau')
  })
})

const env = { SERPAPI_KEY: 'geheim' }
const from = (
  path: string,
  origin = 'https://mystyle.hahntim518.workers.dev',
) =>
  new Request(`https://suche.example.workers.dev${path}`, {
    headers: { Origin: origin },
  })

describe('Such-Server (Cloudflare Worker)', () => {
  it('antwortet nur der eigenen App', async () => {
    const response = await handle(
      from('/search?q=jeans', 'https://evil.example'),
      env,
    )
    expect(response.status).toBe(403)
  })

  it('sucht mit verstecktem Schlüssel und gibt nur Bilder zurück', async () => {
    let asked = ''
    const fetcher = async (url: URL) => {
      asked = url.toString()
      return Response.json({
        images_results: [
          {
            title: 'Jeans',
            source: 'Shop',
            thumbnail: 'https://encrypted-tbn0.gstatic.com/a',
            original: 'https://shop.example/jeans.jpg',
            link: 'https://shop.example/p',
          },
          {
            title: 'kaputt',
            original: 'http://x/y.jpg',
            thumbnail: 'https://t',
          },
        ],
      })
    }
    const response = await handle(from('/search?q=jeans'), env, fetcher)
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://mystyle.hahntim518.workers.dev',
    )
    const body = await response.json()
    expect(body.results).toEqual([
      {
        title: 'Jeans',
        source: 'Shop',
        thumbnail: 'https://encrypted-tbn0.gstatic.com/a',
        image: 'https://shop.example/jeans.jpg',
      },
    ])
    expect(asked).toContain('engine=google_images')
    expect(asked).toContain('gl=ch')
    expect(asked).toContain('api_key=geheim')
    expect(JSON.stringify(body)).not.toContain('geheim')
  })

  it('meldet ein aufgebrauchtes Kontingent und fehlende Einrichtung', async () => {
    const limit = await handle(
      from('/search?q=jeans'),
      env,
      async () => new Response('', { status: 429 }),
    )
    expect(limit.status).toBe(429)
    const setup = await handle(from('/search?q=jeans'), {})
    expect(setup.status).toBe(503)
    const short = await handle(from('/search?q=a'), env)
    expect(short.status).toBe(400)
  })

  it('lädt nur öffentliche https-Bilder bis 8 MB', async () => {
    expect(allowedImageUrl('https://shop.example/a.jpg')).toBe(true)
    expect(allowedImageUrl('http://shop.example/a.jpg')).toBe(false)
    expect(allowedImageUrl('https://127.0.0.1/a.jpg')).toBe(false)
    expect(allowedImageUrl('https://localhost/a.jpg')).toBe(false)
    expect(allowedImageUrl('https://user:pw@shop.example/a.jpg')).toBe(false)
    const png = await handle(
      from(`/image?url=${encodeURIComponent('https://shop.example/a.png')}`),
      env,
      async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          headers: { 'Content-Type': 'image/png' },
        }),
    )
    expect(png.status).toBe(200)
    expect(png.headers.get('Content-Type')).toBe('image/png')
    const html = await handle(
      from(`/image?url=${encodeURIComponent('https://shop.example/a')}`),
      env,
      async () =>
        new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
    )
    expect(html.status).toBe(502)
    const big = await handle(
      from(`/image?url=${encodeURIComponent('https://shop.example/b.jpg')}`),
      env,
      async () =>
        new Response('x', {
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': String(9 * 1024 * 1024),
          },
        }),
    )
    expect(big.status).toBe(413)
  })

  it('übernimmt höchstens 24 Ergebnisse', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      title: `T${i}`,
      original: `https://s/${i}.jpg`,
      thumbnail: `https://t/${i}`,
    }))
    expect(toResults({ images_results: many })).toHaveLength(24)
  })
})
