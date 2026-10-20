import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const vision = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const cutout = 'https://zhengpeng7-birefnet-demo.hf.space'
async function setup(
  page: Page,
  failCutout = false,
  duplicate = false,
  visionGate?: Promise<void>,
) {
  const calls: string[] = []
  const png = await readFile('public/icon-192.png')
  const attributes = {
    name: 'Rotes Hemd',
    category: 'Oberteile',
    color: 'Rot',
    brand: '',
    styles: [],
    seasons: [],
    notes: '',
  }
  await page.route('https://*.hf.space/**', async (route) => {
    const url = route.request().url()
    calls.push(url)
    if (url.endsWith('/gradio_api/info'))
      return route.fulfill({
        json: { named_endpoints: { '/run_router': {}, '/image': {} } },
      })
    if (url === vision + '/gradio_api/call/run_router') {
      expect(route.request().postDataJSON().data[0]).toBe(
        'Qwen3-VL-8B-Instruct',
      )
      if (visionGate) await visionGate
      return route
        .fulfill({ json: { event_id: 'a'.repeat(32) } })
        .catch(() => {})
    }
    if (url === vision + '/gradio_api/call/run_router/' + 'a'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([
          JSON.stringify({
            items: [
              { box: [0, 0, 500, 1000], attributes },
              {
                box: duplicate ? [0, 0, 500, 1000] : [500, 0, 1000, 1000],
                attributes: {
                  ...attributes,
                  name: 'Blaue Hose',
                  category: 'Hosen',
                  color: 'Blau',
                },
              },
            ],
          }),
        ])}\n\n`,
      })
    if (url === cutout + '/gradio_api/upload')
      return route.fulfill({ json: ['/tmp/gradio/test/crop.jpg'] })
    if (url === cutout + '/gradio_api/call/image')
      return failCutout
        ? route.fulfill({ status: 429, body: 'quota' })
        : route.fulfill({ json: { event_id: 'b'.repeat(32) } })
    if (url === cutout + '/gradio_api/call/image/' + 'b'.repeat(32))
      return route.fulfill({
        contentType: 'text/event-stream',
        body: `event: complete\ndata: ${JSON.stringify([[{ url: cutout + '/gradio_api/file=/tmp/gradio/original.png' }, { url: cutout + '/gradio_api/file=/tmp/gradio/cutout.png' }]])}\n\n`,
      })
    if (url === cutout + '/gradio_api/file=/tmp/gradio/cutout.png')
      return route.fulfill({ contentType: 'image/png', body: png })
    throw new Error('Unexpected ' + url)
  })
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Mehrere Stücke auf einem Foto', exact: true })
    .click()
  const photo = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 400
    c.height = 200
    const x = c.getContext('2d')!
    x.fillStyle = 'red'
    x.fillRect(0, 0, 200, 200)
    x.fillStyle = 'blue'
    x.fillRect(200, 0, 200, 200)
    return c.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Mehrfachfoto aus Mediathek').setInputFiles({
    name: 'zwei.png',
    mimeType: 'image/png',
    buffer: Buffer.from(photo, 'base64'),
  })
  expect(calls).toEqual([])
  await page
    .getByRole('checkbox', { name: /Ich erlaube, neue Kleidungsfotos/ })
    .check()
  await page
    .getByRole('button', { name: 'Kostenlose KI aktivieren', exact: true })
    .click()
  return calls
}
async function savedPhotos(page: Page) {
  return page.evaluate(async () => {
    const databases = await indexedDB.databases()
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(
        databases.find((d) => d.name?.toLowerCase().includes('mystyle'))!.name!,
      )
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    const rows = await new Promise<
      Array<{ name: string; photo: Blob; cutout?: Blob }>
    >((resolve, reject) => {
      const r = database
        .transaction('garments')
        .objectStore('garments')
        .getAll()
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    const result = []
    for (const row of rows) {
      const bitmap = await createImageBitmap(row.photo)
      const c = document.createElement('canvas')
      c.width = bitmap.width
      c.height = bitmap.height
      const x = c.getContext('2d')!
      x.drawImage(bitmap, 0, 0)
      result.push({
        name: row.name,
        width: bitmap.width,
        height: bitmap.height,
        pixel: Array.from(x.getImageData(50, 50, 1, 1).data),
        cutout: !!row.cutout,
      })
      bitmap.close()
    }
    database.close()
    return result.sort((a, b) => a.name.localeCompare(b.name))
  })
}
test('Mehrfachscan füllt Angaben, wendet Freistellungen automatisch an und speichert echte getrennte Originalausschnitte', async ({
  page,
}) => {
  const calls = await setup(page)
  const save = page.getByRole('button', {
    name: '2 Stücke zum Kleiderschrank hinzufügen',
    exact: true,
  })
  await expect(save).toBeEnabled()
  await expect(
    page.getByRole('button', {
      name: 'Originalausschnitt verwenden',
      exact: true,
    }),
  ).toHaveCount(2)
  await page.getByLabel('Name für Stück 1', { exact: true }).fill('Mein Hemd')
  await save.click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const rows = await savedPhotos(page)
  expect(rows).toHaveLength(2)
  const red = rows.find((r) => r.name === 'Mein Hemd')!,
    blue = rows.find((r) => r.name === 'Blaue Hose')!
  expect(red).toMatchObject({ width: 200, height: 200, cutout: true })
  expect(red.pixel[0]).toBeGreaterThan(240)
  expect(red.pixel[2]).toBeLessThan(10)
  expect(blue).toMatchObject({ width: 200, height: 200, cutout: true })
  expect(blue.pixel[2]).toBeGreaterThan(240)
  expect(blue.pixel[0]).toBeLessThan(10)
  expect(
    calls.filter((url) => url === vision + '/gradio_api/call/run_router'),
  ).toHaveLength(1)
  expect(
    calls.filter((url) => url === cutout + '/gradio_api/upload'),
  ).toHaveLength(2)
})
test('Freistellungslimit stoppt weitere Anfragen, Originalausschnitte bleiben auswählbar und speicherbar', async ({
  page,
}) => {
  const calls = await setup(page, true)
  await expect(
    page.getByRole('button', {
      name: '2 Stücke zum Kleiderschrank hinzufügen',
      exact: true,
    }),
  ).toBeEnabled()
  await expect(
    page.getByText(/Nutzungslimit des Dienstes erreicht/),
  ).toHaveCount(2)
  await page
    .getByRole('checkbox', { name: 'Stück 2 speichern', exact: true })
    .uncheck()
  await page
    .getByRole('button', {
      name: '1 Stück zum Kleiderschrank hinzufügen',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(await savedPhotos(page)).toEqual([
    expect.objectContaining({ name: 'Rotes Hemd', cutout: false }),
  ])
  expect(
    calls.filter((url) => url === cutout + '/gradio_api/upload'),
  ).toHaveLength(1)
})
test('Doppelte Modelltreffer werden abgewiesen, Abbruch bewahrt den einzelnen Editor', async ({
  page,
}) => {
  const calls = await setup(page, false, true)
  await expect(page.getByText(/denselben Bildbereich mehrfach/)).toBeVisible()
  expect(
    calls.filter((url) => url === cutout + '/gradio_api/upload'),
  ).toHaveLength(0)
  await page.getByRole('button', { name: 'Schliessen', exact: true }).click()
  await page.getByRole('button', { name: 'Verwerfen', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Ein neues Lieblingsstück.',
      exact: true,
    }),
  ).toBeVisible()
})

test('Widerruf im zweiten Fenster verwirft späte Gruppenerkennung ohne Folge-Uploads', async ({
  page,
  context,
}) => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  try {
    const calls = await setup(page, false, false, gate)
    await expect(
      page.getByRole('button', { name: 'Scan abbrechen', exact: true }),
    ).toBeVisible()
    const other = await context.newPage()
    await other.goto('/')
    await other.getByRole('button', { name: 'Mehr', exact: true }).click()
    await other
      .getByRole('button', { name: 'Community-KI ausschalten', exact: true })
      .click()
    await expect(
      page.getByRole('button', { name: 'Scan abbrechen', exact: true }),
    ).toHaveCount(0)
    release()
    await expect(
      page.getByRole('button', {
        name: 'Kostenlose KI aktivieren',
        exact: true,
      }),
    ).toBeVisible()
    await expect(
      page.getByAltText('Gesamtfoto für den Mehrfachscan'),
    ).toBeVisible()
    await expect(
      page.getByLabel('Name für Stück 1', { exact: true }),
    ).toHaveCount(0)
    expect(
      calls.filter((url) => url === cutout + '/gradio_api/upload'),
    ).toHaveLength(0)
  } finally {
    release()
  }
})
