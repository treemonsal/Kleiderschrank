import { test, expect, type Page } from './fixtures'
import { readFile } from 'node:fs/promises'

// Network mocks use page.route, which a controlling service worker bypasses.
test.use({ serviceWorkers: 'block' })

const SEARCH = 'https://suche.test'

async function withSearch(page: Page, status = 200) {
  await page.addInitScript((url) => {
    ;(
      window as unknown as { __MYSTYLE_SEARCH_URL__: string }
    ).__MYSTYLE_SEARCH_URL__ = url
  }, SEARCH)
  const png = await readFile('public/icon-192.png')
  const queries: string[] = []
  await page.route(`${SEARCH}/search**`, (route) => {
    queries.push(new URL(route.request().url()).searchParams.get('q') ?? '')
    return status !== 200
      ? route.fulfill({
          status,
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: { error: 'limit' },
        })
      : route.fulfill({
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: {
            results: [
              {
                title: "Nike Air Force 1 '07 | Zalando",
                source: 'Zalando',
                thumbnail: `${SEARCH}/thumb/1.png`,
                image: 'https://shop.example/af1.png',
              },
              {
                title: 'Produkt 4711',
                source: 'Shop',
                thumbnail: `${SEARCH}/thumb/2.png`,
                image: 'https://shop.example/unklar.png',
              },
            ],
          },
        })
  })
  await page.route(`${SEARCH}/thumb/**`, (route) =>
    route.fulfill({ contentType: 'image/png', body: png }),
  )
  await page.route(`${SEARCH}/image**`, (route) =>
    route.fulfill({
      headers: { 'Access-Control-Allow-Origin': '*' },
      contentType: 'image/png',
      body: png,
    }),
  )
  return queries
}

test('Online gefundene Kleidung landet mit einem Tipp im Kleiderschrank', async ({
  page,
}) => {
  const queries = await withSearch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Nike Air Force 1', exact: true })
    .click()
  await expect(
    dialog.getByRole('list', { name: 'Suchergebnisse' }),
  ).toBeVisible()
  expect(queries).toEqual(['Nike Air Force 1'])
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await expect(
    dialog.getByRole('button', {
      name: "Nike Air Force 1 '07 liegt im Kleiderschrank",
    }),
  ).toBeDisabled()
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page
    .getByRole('button', { name: "Nike Air Force 1 '07 öffnen" })
    .click()
  const detail = page.getByRole('dialog')
  await expect(
    detail.getByText('Schuhe', { exact: true }).first(),
  ).toBeVisible()
  await expect(detail).toContainText('Nike')
})

test('Ohne erkennbare Kategorie übernimmt der Editor das Bild', async ({
  page,
}) => {
  await withSearch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('searchbox', { name: 'Kleidung suchen' }).fill('Teil')
  await dialog.getByRole('button', { name: 'Suchen', exact: true }).click()
  await dialog
    .getByRole('button', { name: 'Produkt 4711 in den Kleiderschrank' })
    .click()
  const editor = page.getByRole('dialog')
  await expect(
    editor.getByRole('heading', { name: 'Neues Stück' }),
  ).toBeVisible()
  await expect(
    editor.getByAltText('Vorschau des Kleidungsstücks'),
  ).toBeVisible()
})

test('Ein aufgebrauchtes Suchkontingent wird verständlich erklärt', async ({
  page,
}) => {
  await withSearch(page, 429)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Adidas Samba', exact: true })
    .click()
  await expect(dialog.getByRole('alert')).toContainText(
    'Suchkontingent für diesen Monat ist aufgebraucht',
  )
})

test('Ohne eingerichteten Such-Server bleibt die Suche verborgen', async ({
  page,
}) => {
  // The built app has a search address; an empty override stands for none.
  await page.addInitScript(() => {
    ;(window as { __MYSTYLE_SEARCH_URL__?: string }).__MYSTYLE_SEARCH_URL__ = ''
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Ohne Foto eintragen', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Online suchen', exact: true }),
  ).toHaveCount(0)
})

test('Mit kostenloser KI wird ein gefundenes Stück gleich freigestellt', async ({
  page,
}) => {
  await withSearch(page)
  const B = 'https://zhengpeng7-birefnet-demo.hf.space'
  const cut = await readFile('public/icon-512.png')
  await page.addInitScript(() => {
    localStorage.setItem(
      'mystyle-photo-ai',
      JSON.stringify({
        mode: 'community',
        url: 'https://prithivmlmods-qwen3-vl-outpost.hf.space',
        code: '',
        enabled: true,
      }),
    )
  })
  const calls: string[] = []
  await page.route('https://*.hf.space/**', (route) => {
    const url = route.request().url()
    calls.push(url)
    if (url === B + '/gradio_api/upload')
      return route.fulfill({ json: ['/tmp/gradio/test/garment.jpg'] })
    if (url === B + '/gradio_api/call/image')
      return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === B + '/gradio_api/call/image/' + 'b'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([[null, { url: `${B}/gradio_api/file=/tmp/gradio/cutout.png` }]])}\n\n`,
      })
    if (url === `${B}/gradio_api/file=/tmp/gradio/cutout.png`)
      return route.fulfill({ contentType: 'image/png', body: cut })
    return route.fulfill({ status: 404, body: 'unexpected' })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Nike Air Force 1', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await expect(
    dialog.getByRole('button', {
      name: "Nike Air Force 1 '07 liegt im Kleiderschrank",
    }),
  ).toContainText('Drin')
  // Only the cut-out service is asked, never the recognition model.
  expect(calls.every((url) => url.startsWith(B))).toBe(true)
  const stored = await page.evaluate(
    () =>
      new Promise<{ photo: number; cutout: number }>((resolve, reject) => {
        const open = indexedDB.open('mystyle-private-wardrobe')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const request = open.result
            .transaction('garments')
            .objectStore('garments')
            .getAll()
          request.onsuccess = () => {
            const [item] = request.result as { photo?: Blob; cutout?: Blob }[]
            resolve({
              photo: item?.photo?.size ?? 0,
              cutout: item?.cutout?.size ?? 0,
            })
          }
        }
      }),
  )
  expect(stored.photo).toBeGreaterThan(0)
  expect(stored.cutout).toBeGreaterThan(0)
})

test('Misslungenes Freistellen lässt sich im Stück wiederholen', async ({
  page,
}) => {
  await withSearch(page)
  const B = 'https://zhengpeng7-birefnet-demo.hf.space'
  const cut = await readFile('public/icon-512.png')
  await page.addInitScript(() => {
    localStorage.setItem(
      'mystyle-photo-ai',
      JSON.stringify({
        mode: 'community',
        url: 'https://prithivmlmods-qwen3-vl-outpost.hf.space',
        code: '',
        enabled: true,
      }),
    )
  })
  let busy = true
  await page.route('https://*.hf.space/**', (route) => {
    const url = route.request().url()
    if (busy) return route.fulfill({ status: 503, body: 'busy' })
    if (url === B + '/gradio_api/upload')
      return route.fulfill({ json: ['/tmp/gradio/test/garment.jpg'] })
    if (url === B + '/gradio_api/call/image')
      return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === B + '/gradio_api/call/image/' + 'b'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([[null, { url: `${B}/gradio_api/file=/tmp/gradio/cutout.png` }]])}\n\n`,
      })
    if (url === `${B}/gradio_api/file=/tmp/gradio/cutout.png`)
      return route.fulfill({ contentType: 'image/png', body: cut })
    return route.fulfill({ status: 404, body: 'unexpected' })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Nike Air Force 1', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await expect(
    dialog.getByText('Freistellen hat nicht geklappt, das Shopfoto bleibt.'),
  ).toBeVisible({ timeout: 20000 })
  await dialog.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Profil', exact: true }).click()
  await page
    .getByRole('button', { name: "Nike Air Force 1 '07 öffnen" })
    .click()
  busy = false
  const detail = page.getByRole('dialog')
  await detail
    .getByRole('button', { name: 'Neu freistellen', exact: true })
    .click()
  await expect(
    detail.getByRole('button', { name: 'Neu freistellen', exact: true }),
  ).toBeEnabled({ timeout: 20000 })
  await expect(detail.getByRole('alert')).toHaveCount(0)
  const sizes = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const open = indexedDB.open('mystyle-private-wardrobe')
        open.onsuccess = () => {
          const request = open.result
            .transaction('garments')
            .objectStore('garments')
            .getAll()
          request.onsuccess = () => {
            const [item] = request.result as { photo?: Blob; cutout?: Blob }[]
            resolve([item?.photo?.size ?? 0, item?.cutout?.size ?? 0])
          }
        }
      }),
  )
  expect(sizes[0]).toBeGreaterThan(0)
  expect(sizes[1]).toBeGreaterThan(0)
})

test('Nach dem Hinzufügen: Angaben sehen, rückgängig machen oder ändern', async ({
  page,
}) => {
  await withSearch(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Nike Air Force 1', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await expect(dialog.locator('.product-added').first()).toContainText('Schuhe')
  await dialog
    .getByRole('button', {
      name: "Nike Air Force 1 '07: Hinzufügen rückgängig",
    })
    .click()
  await expect(
    dialog.getByRole('button', {
      name: "Nike Air Force 1 '07 in den Kleiderschrank",
    }),
  ).toBeEnabled()
  const count = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const open = indexedDB.open('mystyle-private-wardrobe')
          open.onsuccess = () => {
            const request = open.result
              .transaction('garments')
              .objectStore('garments')
              .count()
            request.onsuccess = () => resolve(request.result)
          }
        }),
    )
  expect(await count()).toBe(0)
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07: Angaben ändern" })
    .click()
  await expect(
    page.getByRole('dialog').getByLabel('Name', { exact: false }),
  ).toHaveValue("Nike Air Force 1 '07")
  expect(await count()).toBe(1)
})

test('Freistellungen werden auf dem Gerät gerade gerückt und zentriert', async ({
  page,
}) => {
  await withSearch(page)
  await page.goto('/')
  // A cut-out held at an angle, off centre, on a transparent background.
  const tilted = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const c = canvas.getContext('2d')!
    c.translate(120, 160)
    c.rotate((14 * Math.PI) / 180)
    c.fillStyle = '#202020'
    c.fillRect(-50, -110, 100, 220)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const B = 'https://zhengpeng7-birefnet-demo.hf.space'
  await page.evaluate(() =>
    localStorage.setItem(
      'mystyle-photo-ai',
      JSON.stringify({
        mode: 'community',
        url: 'https://prithivmlmods-qwen3-vl-outpost.hf.space',
        code: '',
        enabled: true,
      }),
    ),
  )
  await page.route('https://*.hf.space/**', (route) => {
    const url = route.request().url()
    if (url === B + '/gradio_api/upload')
      return route.fulfill({ json: ['/tmp/gradio/test/garment.jpg'] })
    if (url === B + '/gradio_api/call/image')
      return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === B + '/gradio_api/call/image/' + 'b'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([[null, { url: `${B}/gradio_api/file=/tmp/gradio/cutout.png` }]])}\n\n`,
      })
    if (url === `${B}/gradio_api/file=/tmp/gradio/cutout.png`)
      return route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(tilted, 'base64'),
      })
    return route.fulfill({ status: 404, body: 'unexpected' })
  })
  await page.reload()
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click()
  await page.getByRole('button', { name: 'Online suchen', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByRole('button', { name: 'Nike Air Force 1', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: "Nike Air Force 1 '07 in den Kleiderschrank" })
    .click()
  await expect(
    dialog.getByRole('button', {
      name: "Nike Air Force 1 '07 liegt im Kleiderschrank",
    }),
  ).toContainText('Drin', { timeout: 20000 })
  const shape = await page.evaluate(async () => {
    const blob = await new Promise<Blob>((resolve) => {
      const open = indexedDB.open('mystyle-private-wardrobe')
      open.onsuccess = () => {
        const request = open.result
          .transaction('garments')
          .objectStore('garments')
          .getAll()
        request.onsuccess = () => resolve(request.result[0].cutout)
      }
    })
    const image = await createImageBitmap(blob)
    const canvas = new OffscreenCanvas(image.width, image.height)
    const c = canvas.getContext('2d')!
    c.drawImage(image, 0, 0)
    const { data } = c.getImageData(0, 0, image.width, image.height)
    // Width of the opaque band in the middle row vs. its height in the
    // middle column: upright, the band is about 100 × 220 again.
    let left = -1,
      right = -1,
      top = -1,
      bottom = -1
    const y = Math.floor(image.height / 2),
      x = Math.floor(image.width / 2)
    for (let i = 0; i < image.width; i++)
      if (data[(y * image.width + i) * 4 + 3] > 128) {
        if (left < 0) left = i
        right = i
      }
    for (let j = 0; j < image.height; j++)
      if (data[(j * image.width + x) * 4 + 3] > 128) {
        if (top < 0) top = j
        bottom = j
      }
    return {
      width: image.width,
      height: image.height,
      band: right - left + 1,
      tall: bottom - top + 1,
      centre: (left + right) / 2 / image.width,
    }
  })
  expect(shape.width).toBe(shape.height)
  expect(shape.band).toBeGreaterThan(90)
  expect(shape.band).toBeLessThan(112)
  expect(shape.tall).toBeGreaterThan(205)
  expect(Math.abs(shape.centre - 0.5)).toBeLessThan(0.03)
})
