import { test, expect, type Page } from './fixtures'
import { readFile } from 'node:fs/promises'
const vision = 'https://prithivmlmods-qwen3-vl-outpost.hf.space'
const cutout = 'https://zhengpeng7-birefnet-demo.hf.space'
const attributes = {
  name: 'Blaues Hemd',
  category: 'Oberteile',
  color: 'Blau',
  brand: '',
  seasons: [],
  styles: [],
  notes: 'Lange Ärmel.',
}
async function open(page: Page) {
  await page.goto('/')
  await page
    .getByRole('button', { name: 'Erstes Stück hinzufügen', exact: true })
    .click()
  await page
    .getByLabel('Foto aus Mediathek')
    .setInputFiles('public/icon-192.png')
}
for (const failing of ['attributes', 'cutout'] as const) {
  test(`Nur ${failing} wiederholen erhält erfolgreiche Ergebnisse und sendet nichts erneut an den anderen Anbieter`, async ({
    page,
  }) => {
    await page.addInitScript(
      (host) =>
        localStorage.setItem(
          'mystyle-photo-ai',
          JSON.stringify({
            mode: 'community',
            url: host,
            code: '',
            enabled: true,
          }),
        ),
      vision,
    )
    const counts = { attributes: 0, cutout: 0 }
    const png = await readFile('public/icon-192.png')
    await page.route('https://*.hf.space/**', async (route) => {
      const url = route.request().url()
      if (url === `${vision}/gradio_api/call/run_router`) {
        counts.attributes++
        return route.fulfill(
          failing === 'attributes' && counts.attributes === 1
            ? { status: 429, body: 'limit' }
            : { json: { event_id: 'a'.repeat(32) } },
        )
      }
      if (url === `${vision}/gradio_api/call/run_router/${'a'.repeat(32)}`)
        return route.fulfill({
          contentType: 'text/event-stream',
          body: `event: complete\ndata: ${JSON.stringify([JSON.stringify(attributes)])}\n\n`,
        })
      if (url === `${cutout}/gradio_api/upload`) {
        counts.cutout++
        return route.fulfill(
          failing === 'cutout' && counts.cutout === 1
            ? { status: 503, body: 'unavailable' }
            : { json: ['/tmp/gradio/test/shirt.jpg'] },
        )
      }
      if (url === `${cutout}/gradio_api/call/image`)
        return route.fulfill({ json: { event_id: 'b'.repeat(32) } })
      if (url === `${cutout}/gradio_api/call/image/${'b'.repeat(32)}`)
        return route.fulfill({
          contentType: 'text/event-stream',
          body: `event: complete\ndata: ${JSON.stringify([[null, { url: `${cutout}/gradio_api/file=/tmp/gradio/cutout.png` }]])}\n\n`,
        })
      if (url === `${cutout}/gradio_api/file=/tmp/gradio/cutout.png`)
        return route.fulfill({ contentType: 'image/png', body: png })
      throw new Error(`Unexpected request: ${url}`)
    })
    await open(page)
    const retry = page.getByRole('button', {
      name:
        failing === 'attributes'
          ? 'Nur Angaben erneut erkennen'
          : 'Nur Hintergrund erneut entfernen',
      exact: true,
    })
    await expect(retry).toBeVisible()
    if (failing === 'cutout') {
      await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
        attributes.name,
      )
      await page.getByLabel('Name', { exact: false }).fill('Mein eigener Name')
    }
    await retry.click()
    await expect(retry).toHaveCount(0)
    if (failing === 'attributes') {
      await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
        attributes.name,
      )
      const type = await page
        .getByAltText('Vorschau des Kleidungsstücks')
        .evaluate(
          async (img: HTMLImageElement) =>
            (await (await fetch(img.src)).blob()).type,
        )
      expect(type).toBe('image/png')
    } else {
      await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
        'Mein eigener Name',
      )
      await expect(
        page.getByRole('button', { name: 'Original verwenden', exact: true }),
      ).toBeVisible()
    }
    expect(counts).toEqual(
      failing === 'attributes'
        ? { attributes: 2, cutout: 1 }
        : { attributes: 1, cutout: 2 },
    )
  })
}

test('Eigener älterer Server führt bei gezieltem Wiederholen keine zweite vollständige Analyse aus', async ({
  page,
}) => {
  const host = 'https://mystyle-test.hf.space'
  await page.addInitScript(
    (host) =>
      localStorage.setItem(
        'mystyle-photo-ai',
        JSON.stringify({
          url: host,
          code: 'test-code-with-more-than-24-characters',
          enabled: true,
        }),
      ),
    host,
  )
  let analyses = 0
  const png = (await readFile('public/icon-192.png')).toString('base64')
  await page.route(`${host}/health`, (route) =>
    route.fulfill({ json: { service: 'mystyle-photo-ai', version: 1 } }),
  )
  await page.route(`${host}/v1/garment`, (route) => {
    analyses++
    return route.fulfill({
      json: { attributes: null, cutout: `data:image/png;base64,${png}` },
    })
  })
  await open(page)
  await page
    .getByRole('button', { name: 'Nur Angaben erneut erkennen', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'unterstützt einzelne Schritte noch nicht',
  )
  await expect(
    page.getByRole('button', { name: 'Original verwenden', exact: true }),
  ).toBeVisible()
  expect(analyses).toBe(1)
})

test('Aktueller eigener Server verarbeitet nur den gewünschten Schritt; Abbruch erhält Name und übernommene Freistellung', async ({
  page,
}) => {
  const host = 'https://mystyle-test.hf.space'
  await page.addInitScript(
    (host) =>
      localStorage.setItem(
        'mystyle-photo-ai',
        JSON.stringify({
          url: host,
          code: 'test-code-with-more-than-24-characters',
          enabled: true,
        }),
      ),
    host,
  )
  const png = (await readFile('public/icon-192.png')).toString('base64')
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const tasks: string[] = []
  await page.route(`${host}/health`, (route) =>
    route.fulfill({
      json: {
        service: 'mystyle-photo-ai',
        version: 1,
        photo_tasks: ['attributes', 'cutout'],
      },
    }),
  )
  await page.route(`${host}/v1/garment`, async (route) => {
    const task = route.request().postDataJSON().task ?? 'all'
    tasks.push(task)
    if (task === 'all')
      return route.fulfill({
        json: { attributes: null, cutout: `data:image/png;base64,${png}` },
      })
    if (tasks.length === 2) await held
    await route.fulfill({ json: { attributes, cutout: null } }).catch(() => {})
  })
  try {
    await open(page)
    await page.getByLabel('Name', { exact: false }).fill('Mein Entwurf')
    await page
      .getByRole('button', { name: 'Nur Angaben erneut erkennen', exact: true })
      .click()
    await expect.poll(() => tasks.length).toBe(2)
    await page
      .getByRole('button', { name: 'Analyse abbrechen', exact: true })
      .click()
    release()
    await expect(
      page.getByRole('button', { name: 'Analyse abbrechen', exact: true }),
    ).toHaveCount(0)
    await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
      'Mein Entwurf',
    )
    await page
      .getByRole('button', { name: 'Nur Angaben erneut erkennen', exact: true })
      .click()
    await expect(page.getByLabel('Name', { exact: false })).toHaveValue(
      attributes.name,
    )
    expect(tasks).toEqual(['all', 'attributes', 'attributes'])
    const type = await page
      .getByAltText('Vorschau des Kleidungsstücks')
      .evaluate(
        async (img: HTMLImageElement) =>
          (await (await fetch(img.src)).blob()).type,
      )
    expect(type).toBe('image/png')
  } finally {
    release()
  }
})
