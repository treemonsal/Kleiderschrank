import { describe, expect, it } from 'vitest'
import { fetchImage, imageUrlFromTransfer } from '../src/image-drop'

const data = (values: Record<string, string>) => (type: string) =>
  values[type] ?? ''

describe('Bilder aus einem anderen Browserfenster', () => {
  it('findet die Bildadresse in HTML, Linklisten und Text', () => {
    expect(
      imageUrlFromTransfer(
        data({
          'text/html':
            '<a href="https://shop.ch/p"><img src="https://cdn.shop.ch/hemd.jpg"></a>',
          'text/uri-list': 'https://shop.ch/p',
        }),
      ),
    ).toBe('https://cdn.shop.ch/hemd.jpg')
    expect(
      imageUrlFromTransfer(
        data({ 'text/uri-list': '# Kommentar\nhttps://x.ch/a.png\n' }),
      ),
    ).toBe('https://x.ch/a.png')
    expect(imageUrlFromTransfer(data({ 'text/plain': 'Hallo' }))).toBe(
      undefined,
    )
    expect(
      imageUrlFromTransfer(data({ 'text/plain': 'javascript:alert(1)' })),
    ).toBe(undefined)
  })

  it('übernimmt freigegebene Bilder und erklärt gesperrte verständlich', async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: 'image/png',
    })
    const file = await fetchImage(
      'https://cdn.shop.ch/bilder/hemd.png',
      async () => new Response(png),
    )
    expect(file.name).toBe('hemd.png')
    expect(file.type).toBe('image/png')
    await expect(
      fetchImage('https://x.ch/a.png', async () => {
        throw new TypeError('Failed to fetch')
      }),
    ).rejects.toThrow('Bild kopieren')
    await expect(
      fetchImage(
        'https://x.ch/seite',
        async () =>
          new Response('<html>', { headers: { 'content-type': 'text/html' } }),
      ),
    ).rejects.toThrow('kein Bild')
  })
})
